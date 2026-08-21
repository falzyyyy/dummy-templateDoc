<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\DocumentModel;
use App\Models\TemplateModel;
use App\Models\TemplateFieldModel;
use App\Services\DocumentService;

/**
 * DocumentController
 * 
 * Menangani generate dokumen dan riwayat.
 * 
 * Endpoint:
 *   POST   /api/documents/generate/:slug → Generate dokumen dari form data (All)
 *   GET    /api/documents                → Riwayat dokumen (All, filtered by role)
 *   GET    /api/documents/:id/download   → Download file .docx (All)
 *   DELETE /api/documents/:id            → Hapus dari riwayat (All)
 *   GET    /api/documents/stats          → Statistik untuk dashboard (All)
 */
class DocumentController extends BaseController
{
    use ApiResponseTrait;

    protected DocumentModel $documentModel;
    protected TemplateModel $templateModel;
    protected TemplateFieldModel $fieldModel;
    protected DocumentService $documentService;

    public function __construct()
    {
        $this->documentModel   = new DocumentModel();
        $this->templateModel   = new TemplateModel();
        $this->fieldModel      = new TemplateFieldModel();
        $this->documentService = new DocumentService();
    }

    /**
     * POST /api/documents/generate/:slug
     * 
     * INI ENDPOINT UTAMA — generate dokumen Word dari data form.
     * 
     * Alur:
     * 1. Cari template berdasarkan slug
     * 2. Ambil daftar fields template tersebut
     * 3. Validasi: semua field required harus terisi
     * 4. Panggil DocxGenerator untuk replace placeholder di Word
     * 5. Simpan riwayat ke database
     * 6. Return link download file hasil
     */
    public function generate(string $slug)
    {
        // 1. Cari template
        $template = $this->templateModel->getBySlug($slug);
        if (!$template) {
            return $this->respondNotFound('Template tidak ditemukan.');
        }

        // 2. Ambil fields
        $fields = $this->fieldModel->getByTemplate($template['id']);
        if (empty($fields)) {
            return $this->respondError('Template ini belum punya field/placeholder.', 400);
        }

        // 3. Ambil data dari request body
        $json = $this->request->getJSON(true);
        $formData     = $json['data'] ?? [];
        $format       = $json['format'] ?? 'docx';
        $isPreview    = $json['is_preview'] ?? false;
        $parentDocId  = $json['parent_document_id'] ?? null;
        $docIdFromReq = $json['document_id'] ?? null;
        $userId       = $this->request->{'userId'};

        // 4. Generate dokumen Word / PDF via Service
        try {
            $result = $this->documentService->generateDocument($template, $fields, $formData, $format, $isPreview, $parentDocId, $docIdFromReq, $userId);
        } catch (\Throwable $e) {
            return $this->respondError('Gagal generate dokumen: ' . $e->getMessage(), 500);
        }

        if ($result['is_preview']) {
            return $this->respondSuccess([
                'base64' => $result['base64']
            ], 'Preview berhasil di-generate');
        }

        // 5. Return info dokumen + link download
        return $this->respondSuccess([
            'document' => [
                'id'            => $result['document_id'],
                'template_name' => $result['template_name'],
                'download_url'  => base_url('api/documents/' . $result['document_id'] . '/download'),
                'created_at'    => date('Y-m-d H:i:s'),
            ]
        ], 'Dokumen berhasil di-generate!', 201);
    }

    /**
     * POST /api/documents/auto-save
     * 
     * Menyimpan draft dokumen secara real-time ke database.
     * Mengembalikan ID dokumen agar update selanjutnya menggunakan ID yang sama.
     */
    public function autoSave()
    {
        $json = $this->request->getJSON(true);
        $templateId  = $json['template_id'] ?? null;
        $docId       = $json['document_id'] ?? null; // Null if first time save
        $parentDocId = $json['parent_document_id'] ?? null;
        $data        = $json['data'] ?? [];

        if (!$templateId) {
            return $this->respondError('Template ID diperlukan');
        }

        $userId = $this->request->{'userId'};

        try {
            $savedDocId = $this->documentService->handleAutoSave($templateId, $data, $docId, $parentDocId, $userId);
            return $this->respondSuccess(['document_id' => $savedDocId]);
        } catch (\Throwable $e) {
            return $this->respondError('Gagal menyimpan draf: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/documents/:id/revision-data
     * 
     * Ambil data isian dari dokumen lama untuk direkonsiliasi dengan field template saat ini.
     */
    public function getRevisionData(int $id)
    {
        // Auto-run migration to ensure parent_document_id exists
        try {
            $migrate = \Config\Services::migrations();
            $migrate->latest();
        } catch (\Throwable $e) {}

        $document = $this->documentModel->getDocumentForRevision($id);

        if (!$document) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'Dokumen tidak ditemukan.']);
        }

        // Cek akses Hierarchical Data Isolation
        $scopedDirectorate = $_SERVER['SCOPED_DIRECTORATE_ID'] ?? null;
        $scopedDivision    = $_SERVER['SCOPED_DIVISION_ID'] ?? null;

        if ($scopedDirectorate !== null && $document['directorate_id'] != $scopedDirectorate) {
            return $this->response->setStatusCode(403)
                ->setJSON(['error' => 'Akses ditolak. Dokumen berasal dari direktorat lain.']);
        }
        if ($scopedDivision !== null && $document['division_id'] != $scopedDivision) {
            return $this->response->setStatusCode(403)
                ->setJSON(['error' => 'Akses ditolak. Dokumen berasal dari divisi lain.']);
        }

        // Decode data lama
        $oldData = json_decode($document['data'] ?? '{}', true) ?: [];

        // Ambil fields template saat ini
        $currentFields = $this->fieldModel->getByTemplate($document['template_id']);

        // Rekonsiliasi: Cocokkan key data lama dengan current fields
        $reconciledData = [];

        foreach ($currentFields as $field) {
            // Jika field bernilai auto_generated (terbilang, dll.), lewati pre-fill
            if (!empty($field['is_auto_generated'])) {
                continue;
            }

            $key = $field['field_key'];
            if (array_key_exists($key, $oldData)) {
                $reconciledData[$key] = $oldData[$key];
            }
        }

        return $this->response->setJSON([
            'document_id'   => $document['id'],
            'template_slug' => $document['template_slug'],
            'template_name' => $document['template_name'],
            'data'          => $reconciledData,
        ]);
    }

    /**
     * GET /api/documents
     * 
     * Riwayat dokumen yang sudah di-generate.
     * Admin bisa lihat semua, user biasa hanya lihat miliknya sendiri.
     */
    public function history()
    {
        // AUTO-FIX: Perbaiki semua created_at yang NULL menjadi waktu sekarang
        // Ini akan otomatis memperbaiki data lama (1970) saat user membuka halaman History
        $db = \Config\Database::connect();
        $db->query("UPDATE documents SET created_at = NOW() WHERE created_at IS NULL");

        // Ambil scope dari JWT filter
        $directorateId = $_SERVER['SCOPED_DIRECTORATE_ID'] ?? null;
        $divisionId    = $_SERVER['SCOPED_DIVISION_ID'] ?? null;
        $currentUserId = $this->request->{'userId'} ?? null;

        // Ambil query params dari URL request
        $scope     = $this->request->getGet('scope');
        $search    = $this->request->getGet('search');
        $startDate = $this->request->getGet('start_date');
        $endDate   = $this->request->getGet('end_date');
        $templateId = $this->request->getGet('template_id');

        $documents = $this->documentModel->getHistory(
            $directorateId, 
            $divisionId, 
            $currentUserId, 
            $scope, 
            $search, 
            $startDate, 
            $endDate,
            $templateId !== '' ? (int)$templateId : null
        );

        return $this->response->setJSON(['documents' => $documents]);
    }

    /**
     * GET /api/documents/:id/download
     * 
     * Download file .docx yang sudah di-generate.
     * User hanya bisa download file miliknya sendiri (kecuali admin).
     */
    public function download(int $id)
    {
        $document = $this->documentModel->find($id);

        if (!$document) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'Dokumen tidak ditemukan.']);
        }

        // Cek akses Hierarchical Data Isolation
        $scopedDirectorate = $_SERVER['SCOPED_DIRECTORATE_ID'] ?? null;
        $scopedDivision    = $_SERVER['SCOPED_DIVISION_ID'] ?? null;

        if ($scopedDirectorate && $document['directorate_id'] != $scopedDirectorate) {
            return $this->response->setStatusCode(403)->setJSON(['error' => 'Akses ditolak: Dokumen di luar direktorat Anda.']);
        }
        if ($scopedDivision && $document['division_id'] != $scopedDivision) {
            return $this->response->setStatusCode(403)->setJSON(['error' => 'Akses ditolak: Dokumen di luar divisi Anda.']);
        }

        $filePath = FCPATH . $document['file_path'];

        if (!file_exists($filePath)) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'File tidak ditemukan di server.']);
        }

        // Download file
        $template = $this->templateModel->find($document['template_id']);
        
        // Custom File Naming: [Nama Template] - [Nama User] - [Tanggal].docx
        $userModel = new \App\Models\UserModel();
        $user = $userModel->find($document['user_id']);
        $userName = $user ? $user['name'] : 'User';
        
        $templateName = $template ? $template['name'] : 'Document';
        $ext = pathinfo($filePath, PATHINFO_EXTENSION); // Ambil ekstensi asli (docx atau pdf)
        $filename = $templateName . ' - ' . $userName . ' - ' . date('d-m-Y', strtotime($document['created_at'])) . '.' . $ext;

        return $this->response->download($filePath, null)->setFileName($filename);
    }

    /**
     * DELETE /api/documents/:id
     */
    public function delete(int $id)
    {
        $document = $this->documentModel->find($id);

        if (!$document) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'Dokumen tidak ditemukan.']);
        }

        // Cek akses Hierarchical Data Isolation
        $scopedDirectorate = $_SERVER['SCOPED_DIRECTORATE_ID'] ?? null;
        $scopedDivision    = $_SERVER['SCOPED_DIVISION_ID'] ?? null;

        if ($scopedDirectorate && $document['directorate_id'] != $scopedDirectorate) {
            return $this->response->setStatusCode(403)->setJSON(['error' => 'Akses ditolak: Dokumen di luar direktorat Anda.']);
        }
        if ($scopedDivision && $document['division_id'] != $scopedDivision) {
            return $this->response->setStatusCode(403)->setJSON(['error' => 'Akses ditolak: Dokumen di luar divisi Anda.']);
        }

        // Hapus file
        if (!empty($document['file_path'])) {
            $filePath = FCPATH . ltrim($document['file_path'], '/');
            if (file_exists($filePath) && is_file($filePath)) {
                @unlink($filePath);
            }
        }

        $this->documentModel->delete($id);

        return $this->response->setJSON(['message' => 'Dokumen dihapus.']);
    }

    /**
     * POST /api/documents/bulk-delete
     * Hapus banyak dokumen sekaligus berdasarkan array ID.
     */
    public function bulkDelete()
    {
        $json = $this->request->getJSON(true);
        $ids = $json['document_ids'] ?? [];

        if (empty($ids) || !is_array($ids)) {
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Tidak ada dokumen yang dipilih.']);
        }

        $scopedDirectorate = $_SERVER['SCOPED_DIRECTORATE_ID'] ?? null;
        $scopedDivision    = $_SERVER['SCOPED_DIVISION_ID'] ?? null;

        // Ambil data dokumen dari DB (untuk ambil file_path & validasi user_id)
        $documents = $this->documentModel->whereIn('id', $ids)->findAll();

        $idsToDelete = [];
        $deletedFilesCount = 0;

        foreach ($documents as $doc) {
            // Cek akses Hierarchical Data Isolation
            if ($scopedDirectorate && $doc['directorate_id'] != $scopedDirectorate) continue;
            if ($scopedDivision && $doc['division_id'] != $scopedDivision) continue;
            
            $idsToDelete[] = $doc['id'];
            
            // Hapus file fisik
            if (!empty($doc['file_path'])) {
                $filePath = FCPATH . ltrim($doc['file_path'], '/');
                if (file_exists($filePath) && is_file($filePath)) {
                    @unlink($filePath);
                    $deletedFilesCount++;
                }
            }
        }

        if (!empty($idsToDelete)) {
            $this->documentModel->whereIn('id', $idsToDelete)->delete();
        }

        return $this->response->setJSON([
            'message' => count($idsToDelete) . ' dokumen berhasil dihapus.'
        ]);
    }

    /**
     * GET /api/documents/stats
     * 
     * Return statistik untuk dashboard.
     */
    public function stats()
    {
        $db = \Config\Database::connect();

        $totalTemplates = $this->templateModel->where('is_active', 1)->countAllResults();
        
        $isAdmin = $this->request->{'userRole'} === 'admin';
        
        $docBuilder = $db->table('documents');
        if (!$isAdmin) {
            $docBuilder->where('user_id', $this->request->{'userId'});
        }
        $totalDocuments = $docBuilder->countAllResults();

        $docMonthBuilder = $db->table('documents');
        $docMonthBuilder->where('MONTH(created_at)', date('m'));
        $docMonthBuilder->where('YEAR(created_at)', date('Y'));
        if (!$isAdmin) {
            $docMonthBuilder->where('user_id', $this->request->{'userId'});
        }
        $docsThisMonth = $docMonthBuilder->countAllResults();

        return $this->response->setJSON([
            'stats' => [
                'total_templates'    => $totalTemplates,
                'total_documents'    => $totalDocuments,
                'documents_month'    => $docsThisMonth,
            ],
        ]);
    }
}
