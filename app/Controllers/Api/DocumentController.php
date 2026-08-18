<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\DocumentModel;
use App\Models\TemplateModel;
use App\Models\TemplateFieldModel;
use App\Libraries\DocxGenerator;

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
    protected DocumentModel $documentModel;
    protected TemplateModel $templateModel;
    protected TemplateFieldModel $fieldModel;

    public function __construct()
    {
        $this->documentModel = new DocumentModel();
        $this->templateModel = new TemplateModel();
        $this->fieldModel    = new TemplateFieldModel();
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
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'Template tidak ditemukan.']);
        }

        // 2. Ambil fields
        $fields = $this->fieldModel->getByTemplate($template['id']);
        if (empty($fields)) {
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Template ini belum punya field/placeholder.']);
        }

        // 3. Ambil data dari request body
        $json = $this->request->getJSON(true);
        $formData  = $json['data'] ?? [];
        $format    = $json['format'] ?? 'docx';
        $isPreview = $json['is_preview'] ?? false;

        // Validasi field required telah dihapus sesuai permintaan user
        // 4. Generate dokumen Word / PDF
        $templatePath = FCPATH . $template['file_path'];
        $generator = new DocxGenerator();

        try {
            $outputPath = $generator->generate($templatePath, $formData, '', $format, $fields);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)
                ->setJSON(['error' => 'Gagal generate dokumen: ' . $e->getMessage() . ' di baris ' . $e->getLine() . ' file ' . $e->getFile()]);
        }

        // Jika ini hanya untuk preview, jangan simpan ke history, langsung return base64
        if ($isPreview) {
            $base64 = base64_encode(file_get_contents($outputPath));
            unlink($outputPath); // Hapus file temporary
            return $this->response->setJSON([
                'message' => 'Preview berhasil di-generate',
                'base64'  => $base64,
            ]);
        }

        // 5. Simpan riwayat
        $relativePath = str_replace(FCPATH, '', $outputPath);
        $docId = $this->documentModel->insert([
            'template_id' => $template['id'],
            'user_id'     => $this->request->{'userId'},
            'data'        => json_encode($formData),
            'file_path'   => $relativePath,
        ]);

        // 6. Return info dokumen + link download
        return $this->response->setStatusCode(201)
            ->setJSON([
                'message'  => 'Dokumen berhasil di-generate!',
                'document' => [
                    'id'            => $docId,
                    'template_name' => $template['name'],
                    'download_url'  => base_url('api/documents/' . $docId . '/download'),
                    'created_at'    => date('Y-m-d H:i:s'),
                ],
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

        $userId = null;

        // Kalau bukan admin, filter hanya milik user ini
        if ($this->request->{'userRole'} !== 'admin') {
            $userId = $this->request->{'userId'};
        }

        $documents = $this->documentModel->getHistory($userId);

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

        // Cek akses: user biasa hanya bisa download miliknya
        if ($this->request->{'userRole'} !== 'admin' && $document['user_id'] != $this->request->{'userId'}) {
            return $this->response->setStatusCode(403)
                ->setJSON(['error' => 'Anda tidak punya akses ke dokumen ini.']);
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

        // Cek akses
        if ($this->request->{'userRole'} !== 'admin' && $document['user_id'] != $this->request->{'userId'}) {
            return $this->response->setStatusCode(403)
                ->setJSON(['error' => 'Anda tidak punya akses.']);
        }

        // Hapus file
        $filePath = FCPATH . $document['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
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

        $isAdmin = $this->request->{'userRole'} === 'admin';
        $userId  = $this->request->{'userId'};

        // Ambil data dokumen dari DB (untuk ambil file_path & validasi user_id)
        $documents = $this->documentModel->whereIn('id', $ids)->findAll();

        $idsToDelete = [];
        $deletedFilesCount = 0;

        foreach ($documents as $doc) {
            // Cek akses: hanya admin atau pemilik dokumen yang boleh menghapus
            if (!$isAdmin && $doc['user_id'] != $userId) {
                continue; 
            }
            
            $idsToDelete[] = $doc['id'];
            
            // Hapus file fisik
            $filePath = FCPATH . ltrim($doc['file_path'], '/');
            if (file_exists($filePath)) {
                @unlink($filePath);
                $deletedFilesCount++;
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
