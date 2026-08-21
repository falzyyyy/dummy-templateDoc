<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * DocumentModel
 * 
 * Mengelola data di tabel 'documents' (riwayat dokumen yang di-generate).
 * 
 * Setiap kali user mengisi form dan generate dokumen,
 * datanya disimpan di sini supaya bisa di-download ulang.
 */
class DocumentModel extends Model
{
    protected $table            = 'documents';
    protected $primaryKey       = 'id';
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'template_id', 'user_id', 'directorate_id', 'division_id', 
        'parent_document_id', 'data', 'file_path', 'created_at'
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = ''; // tabel documents tidak punya kolom updated_at

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = [];
    protected $afterInsert    = [];
    protected $beforeUpdate   = ['updateTimestamp'];
    protected $afterUpdate    = [];

    /**
     * Set created_at ke real time saat update (digunakan untuk auto-save draf agar naik ke atas).
     */
    protected function updateTimestamp(array $data)
    {
        // $data['data'] berisi data yang mau diupdate, set field created_at
        if (isset($data['data'])) {
            $data['data']['created_at'] = date('Y-m-d H:i:s');
        }
        return $data;
    }

    /**
     * Ambil riwayat dokumen dengan info template dan user.
     * Filter berdasarkan scope:
     * - Superadmin: Semua
     * - Admin Direktorat: directorate_id
     * - User Divisi: directorate_id & division_id
     */
    /**
     * Ambil riwayat dokumen dengan info template, user, dan parent document (revisi).
     */
    public function getHistory(
        ?int $directorateId = null, 
        ?int $divisionId = null, 
        ?int $currentUserId = null,
        ?string $scopeFilter = null,
        ?string $search = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?int $templateId = null,
        int $limit = 200
    ): array {
        $builder = $this->select('documents.*, templates.name as template_name, templates.slug as template_slug, templates.id as template_id, users.name as user_name, directorates.name as directorate_name, divisions.name as division_name, parent_docs.id as parent_id, parent_templates.name as parent_template_name')
                        ->join('templates', 'templates.id = documents.template_id', 'left')
                        ->join('users', 'users.id = documents.user_id', 'left')
                        ->join('directorates', 'directorates.id = documents.directorate_id', 'left')
                        ->join('divisions', 'divisions.id = documents.division_id', 'left')
                        ->join('documents as parent_docs', 'parent_docs.id = documents.parent_document_id', 'left')
                        ->join('templates as parent_templates', 'parent_templates.id = parent_docs.template_id', 'left')
                        ->orderBy('documents.created_at', 'DESC')
                        ->limit($limit);

        // Filter by Template ID (jika ada)
        if ($templateId !== null) {
            $builder->where('documents.template_id', $templateId);
        }

        // Filter Scope Tab
        if ($scopeFilter === 'own' && $currentUserId !== null) {
            $builder->where('documents.user_id', $currentUserId);
        } elseif ($scopeFilter === 'division' && $divisionId !== null) {
            $builder->where('documents.division_id', $divisionId);
        } elseif ($scopeFilter === 'directorate' && $directorateId !== null) {
            $builder->where('documents.directorate_id', $directorateId);
        } else {
            // Default Scope ScopedFilter RBAC
            if ($directorateId !== null) {
                $builder->where('documents.directorate_id', $directorateId);
            }
            if ($divisionId !== null) {
                $builder->where('documents.division_id', $divisionId);
            }
        }

        // Filter Search Keyword
        if (!empty($search)) {
            $builder->groupStart()
                    ->like('templates.name', $search)
                    ->orLike('users.name', $search)
                    ->groupEnd();
        }

        // Filter Rentang Tanggal
        if (!empty($startDate)) {
            $builder->where('DATE(documents.created_at) >=', $startDate);
        }
        if (!empty($endDate)) {
            $builder->where('DATE(documents.created_at) <=', $endDate);
        }

        return $builder->findAll();
    }

    /**
     * Ambil detail dokumen beserta slug template untuk keperluan revisi
     */
    public function getDocumentForRevision(int $documentId): ?array
    {
        return $this->select('documents.*, templates.slug as template_slug, templates.name as template_name, templates.id as template_id')
                    ->join('templates', 'templates.id = documents.template_id', 'left')
                    ->where('documents.id', $documentId)
                    ->first();
    }
}
