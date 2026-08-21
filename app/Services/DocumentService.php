<?php

namespace App\Services;

use App\Models\DocumentModel;
use App\Models\TemplateModel;
use App\Models\TemplateFieldModel;
use App\Models\UserModel;
use App\Libraries\DocxGenerator;

class DocumentService
{
    protected DocumentModel $documentModel;
    protected TemplateModel $templateModel;
    protected TemplateFieldModel $fieldModel;
    protected UserModel $userModel;

    public function __construct()
    {
        $this->documentModel = new DocumentModel();
        $this->templateModel = new TemplateModel();
        $this->fieldModel    = new TemplateFieldModel();
        $this->userModel     = new UserModel();
    }

    /**
     * Menjalankan generator dokumen dan menyimpannya.
     */
    public function generateDocument(array $template, array $fields, array $formData, string $format, bool $isPreview, $parentDocId, $docIdFromReq, int $userId)
    {
        $templatePath = FCPATH . $template['file_path'];
        $generator = new DocxGenerator();

        $outputPath = $generator->generate($templatePath, $formData, '', $format, $fields);

        // Jika ini hanya untuk preview, jangan simpan ke history, langsung return base64
        if ($isPreview) {
            $base64 = base64_encode(file_get_contents($outputPath));
            unlink($outputPath); // Hapus file temporary
            return [
                'is_preview' => true,
                'base64'     => $base64
            ];
        }

        // Simpan riwayat
        $relativePath = str_replace(FCPATH, '', $outputPath);
        
        $currentUser = $this->userModel->find($userId);

        if ($docIdFromReq) {
            // Update draft yang sudah ada
            $this->documentModel->update($docIdFromReq, [
                'data'               => json_encode($formData),
                'file_path'          => $relativePath,
                'parent_document_id' => $parentDocId,
            ]);
            $docId = $docIdFromReq;
        } else {
            // Insert baru
            $docId = $this->documentModel->insert([
                'template_id'        => $template['id'],
                'user_id'            => $userId,
                'directorate_id'     => $currentUser ? $currentUser['directorate_id'] : null,
                'division_id'        => $currentUser ? $currentUser['division_id'] : null,
                'parent_document_id' => $parentDocId,
                'data'               => json_encode($formData),
                'file_path'          => $relativePath,
            ]);
        }

        return [
            'is_preview' => false,
            'document_id' => $docId,
            'template_name' => $template['name']
        ];
    }

    /**
     * Logika Auto-Save Draf Tertunda
     */
    public function handleAutoSave($templateId, $data, $docId, $parentDocId, int $userId)
    {
        $currentUser = $this->userModel->find($userId);

        if ($docId) {
            // Update existing draft
            $existing = $this->documentModel->find($docId);
            if ($existing && $existing['user_id'] == $userId) {
                // Di tahap 3 kita menggunakan model events, jadi tidak perlu set created_at lagi
                $this->documentModel->update($docId, [
                    'data' => json_encode($data)
                ]);
                return $docId;
            }
        }

        // Create new draft
        $newDocId = $this->documentModel->insert([
            'template_id'        => $templateId,
            'user_id'            => $userId,
            'directorate_id'     => $currentUser ? $currentUser['directorate_id'] : null,
            'division_id'        => $currentUser ? $currentUser['division_id'] : null,
            'parent_document_id' => $parentDocId,
            'data'               => json_encode($data),
            'file_path'          => null, // Null artinya draft belum ada file docx
        ]);

        return $newDocId;
    }
}
