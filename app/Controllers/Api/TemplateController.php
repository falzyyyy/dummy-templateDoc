<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\TemplateModel;
use App\Models\TemplateFieldModel;
use App\Libraries\DocxParser;

/**
 * TemplateController
 * 
 * Menangani semua operasi terkait template dokumen Word.
 * 
 * Endpoint:
 *   GET    /api/templates           → List semua template aktif (All)
 *   GET    /api/templates/:slug     → Detail template + fields (All)
 *   POST   /api/templates           → Upload template baru (Admin)
 *   PUT    /api/templates/:id       → Update info template (Admin)
 *   PUT    /api/templates/:id/fields → Update konfigurasi fields (Admin)
 *   DELETE /api/templates/:id       → Hapus template (Admin)
 */
class TemplateController extends BaseController
{
    protected TemplateModel $templateModel;
    protected TemplateFieldModel $fieldModel;

    public function __construct()
    {
        $this->templateModel = new TemplateModel();
        $this->fieldModel    = new TemplateFieldModel();
    }

    /**
     * GET /api/templates
     * 
     * Return daftar semua template yang aktif.
     * Setiap template dilengkapi jumlah field (placeholder).
     */
    public function index()
    {
        $templates = $this->templateModel->getActiveTemplates();

        // Tambahkan jumlah field ke setiap template
        foreach ($templates as &$template) {
            $fields = $this->fieldModel->getByTemplate($template['id']);
            $template['field_count'] = count($fields);
        }

        return $this->response->setJSON(['templates' => $templates]);
    }

    /**
     * GET /api/templates/:slug
     * 
     * Return detail satu template beserta daftar field/placeholder-nya.
     * Ini yang dipakai untuk render form isian.
     */
    public function show(string $slug)
    {
        $template = $this->templateModel->getBySlug($slug);

        if (!$template) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'Template tidak ditemukan.']);
        }

        $template['fields'] = $this->fieldModel->getByTemplate($template['id']);

        return $this->response->setJSON(['template' => $template]);
    }

    /**
     * POST /api/templates
     * 
     * Upload template Word baru. Alur:
     * 1. Terima file .docx + nama + deskripsi
     * 2. Simpan file ke folder uploads/templates/
     * 3. Parse file → deteksi semua placeholder
     * 4. Simpan template ke database
     * 5. Simpan daftar field ke database
     * 6. Return template + fields yang terdeteksi
     */
    public function create()
    {
        // Validasi file upload
        $file = $this->request->getFile('file');

        if (!$file || !$file->isValid()) {
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'File .docx wajib diupload.']);
        }

        // Cek ekstensi file
        $ext = $file->getExtension();
        if ($ext !== 'docx') {
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Hanya file .docx yang diterima.']);
        }

        $name        = $this->request->getPost('name') ?: $file->getClientName();
        $description = $this->request->getPost('description') ?: '';

        // Simpan file ke folder uploads/templates/
        $newName = $file->getRandomName();
        $file->move(FCPATH . 'uploads/templates/', $newName);
        $filePath = FCPATH . 'uploads/templates/' . $newName;

        // Parse placeholder dari file Word
        $parser = new DocxParser();
        try {
            $fields = $parser->parse($filePath);
        } catch (\Exception $e) {
            // Hapus file jika gagal parse
            unlink($filePath);
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Gagal membaca file: ' . $e->getMessage()]);
        }

        if (empty($fields)) {
            unlink($filePath);
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Tidak ada placeholder ${...} ditemukan di file. Pastikan menggunakan format ${Nama Placeholder} di Word.']);
        }

        // Simpan template ke database
        $templateId = $this->templateModel->insert([
            'name'        => $name,
            'slug'        => $this->templateModel->generateSlug($name),
            'description' => $description,
            'file_path'   => 'uploads/templates/' . $newName,
            'file_name'   => $file->getClientName(),
            'uploaded_by' => $this->request->userId,
        ]);

        // Simpan fields (placeholder) ke database
        $this->fieldModel->syncFields($templateId, $fields);

        // Return template + fields
        $template = $this->templateModel->find($templateId);
        $template['fields'] = $this->fieldModel->getByTemplate($templateId);

        return $this->response->setStatusCode(201)
            ->setJSON([
                'message'  => 'Template berhasil diupload! ' . count($fields) . ' placeholder terdeteksi.',
                'template' => $template,
            ]);
    }

    /**
     * PUT /api/templates/:id
     * Update info template (nama, deskripsi, status aktif).
     */
    public function update(int $id)
    {
        $template = $this->templateModel->find($id);
        if (!$template) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'Template tidak ditemukan.']);
        }

        $json = $this->request->getJSON(true);

        $updateData = [];
        if (isset($json['name'])) {
            $updateData['name'] = $json['name'];
            $updateData['slug'] = $this->templateModel->generateSlug($json['name']);
        }
        if (isset($json['description'])) {
            $updateData['description'] = $json['description'];
        }
        if (isset($json['is_active'])) {
            $updateData['is_active'] = $json['is_active'];
        }

        $this->templateModel->update($id, $updateData);

        return $this->response->setJSON([
            'message'  => 'Template berhasil diupdate.',
            'template' => $this->templateModel->find($id),
        ]);
    }

    /**
     * PUT /api/templates/:id/fields
     * 
     * Update konfigurasi fields (label, tipe, urutan, required).
     * Admin bisa mengubah bagaimana placeholder ditampilkan di form.
     * 
     * Body: { "fields": [ { "field_key": "Nama", "field_label": "Nama Lengkap", "field_type": "text", ... }, ... ] }
     */
    public function updateFields(int $id)
    {
        $template = $this->templateModel->find($id);
        if (!$template) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'Template tidak ditemukan.']);
        }

        $json   = $this->request->getJSON(true);
        $fields = $json['fields'] ?? [];

        if (empty($fields)) {
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Data fields tidak boleh kosong.']);
        }

        $this->fieldModel->syncFields($id, $fields);

        return $this->response->setJSON([
            'message' => 'Fields berhasil diupdate.',
            'fields'  => $this->fieldModel->getByTemplate($id),
        ]);
    }

    /**
     * DELETE /api/templates/:id
     * Hapus template beserta file-nya dan semua field terkait.
     */
    public function delete(int $id)
    {
        $template = $this->templateModel->find($id);
        if (!$template) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'Template tidak ditemukan.']);
        }

        // Hapus file fisik
        $filePath = FCPATH . $template['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        // Hapus dari database (fields otomatis terhapus karena CASCADE)
        $this->templateModel->delete($id);

        return $this->response->setJSON(['message' => 'Template berhasil dihapus.']);
    }
}
