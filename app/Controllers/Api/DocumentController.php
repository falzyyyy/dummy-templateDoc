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
        $formData = $json['data'] ?? [];

        // Validasi field required
        $errors = [];
        foreach ($fields as $field) {
            $value = $formData[$field['field_key']] ?? '';
            if ($field['is_required'] && empty(trim($value))) {
                $errors[$field['field_key']] = $field['field_label'] . ' wajib diisi.';
            }
        }

        if (!empty($errors)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['errors' => $errors]);
        }

        // 4. Generate dokumen Word
        $templatePath = FCPATH . $template['file_path'];
        $generator = new DocxGenerator();

        try {
            $outputPath = $generator->generate($templatePath, $formData);
        } catch (\Exception $e) {
            return $this->response->setStatusCode(500)
                ->setJSON(['error' => 'Gagal generate dokumen: ' . $e->getMessage()]);
        }

        // 5. Simpan riwayat
        $relativePath = str_replace(FCPATH, '', $outputPath);
        $docId = $this->documentModel->insert([
            'template_id' => $template['id'],
            'user_id'     => $this->request->userId,
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
        $userId = null;

        // Kalau bukan admin, filter hanya milik user ini
        if ($this->request->userRole !== 'admin') {
            $userId = $this->request->userId;
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
        if ($this->request->userRole !== 'admin' && $document['user_id'] != $this->request->userId) {
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
        $filename = ($template ? $template['name'] : 'document') . '_' . date('Ymd', strtotime($document['created_at'])) . '.docx';

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
        if ($this->request->userRole !== 'admin' && $document['user_id'] != $this->request->userId) {
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
     * GET /api/documents/stats
     * 
     * Return statistik untuk dashboard.
     */
    public function stats()
    {
        $db = \Config\Database::connect();

        $totalTemplates = $this->templateModel->where('is_active', 1)->countAllResults();
        
        $isAdmin = $this->request->userRole === 'admin';
        
        $docBuilder = $db->table('documents');
        if (!$isAdmin) {
            $docBuilder->where('user_id', $this->request->userId);
        }
        $totalDocuments = $docBuilder->countAllResults();

        $docMonthBuilder = $db->table('documents');
        $docMonthBuilder->where('MONTH(created_at)', date('m'));
        $docMonthBuilder->where('YEAR(created_at)', date('Y'));
        if (!$isAdmin) {
            $docMonthBuilder->where('user_id', $this->request->userId);
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
