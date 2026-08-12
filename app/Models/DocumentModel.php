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
    protected $table         = 'documents';
    protected $primaryKey    = 'id';
    protected $allowedFields = ['template_id', 'user_id', 'data', 'file_path'];
    protected $useTimestamps = false;
    protected $createdField  = 'created_at';

    /**
     * Ambil riwayat dokumen dengan info template dan user.
     * Admin bisa lihat semua, user biasa hanya lihat miliknya.
     */
    public function getHistory(?int $userId = null, int $limit = 50): array
    {
        $builder = $this->select('documents.*, templates.name as template_name, users.name as user_name')
                        ->join('templates', 'templates.id = documents.template_id')
                        ->join('users', 'users.id = documents.user_id')
                        ->orderBy('documents.created_at', 'DESC')
                        ->limit($limit);

        // Jika userId diberikan, filter hanya milik user tersebut
        if ($userId !== null) {
            $builder->where('documents.user_id', $userId);
        }

        return $builder->findAll();
    }
}
