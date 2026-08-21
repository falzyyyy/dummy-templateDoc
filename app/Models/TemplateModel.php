<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * TemplateModel
 * 
 * Mengelola data di tabel 'templates'.
 * 
 * Method penting:
 * - getActiveTemplates()  → ambil semua template yang aktif
 * - getBySlug($slug)      → cari template berdasarkan slug (URL identifier)
 * - getWithFields($id)    → ambil template beserta daftar field/placeholder-nya
 */
class TemplateModel extends Model
{
    protected $table         = 'templates';
    protected $primaryKey    = 'id';
    protected $allowedFields = ['name', 'slug', 'description', 'category_id', 'directorate_id', 'division_id', 'file_path', 'file_name', 'uploaded_by', 'is_active'];
    protected $useTimestamps = true;

    /**
     * Ambil semua template yang aktif (is_active = 1).
     * Join ke tabel users untuk dapat nama admin yang upload.
     */
    public function getActiveTemplates(
        ?int $scopeDirectorateId = null, 
        ?int $scopeDivisionId = null, 
        ?string $search = null, 
        string $sortBy = 'templates.created_at', 
        string $sortDir = 'DESC',
        ?int $filterDirectorateId = null,
        ?int $filterDivisionId = null
    ): array {
        $query = $this->select('templates.*, users.name as uploader_name, template_categories.name as category_name, directorates.name as directorate_name, divisions.name as division_name')
                    ->join('users', 'users.id = templates.uploaded_by')
                    ->join('template_categories', 'template_categories.id = templates.category_id', 'left')
                    ->join('directorates', 'directorates.id = templates.directorate_id', 'left')
                    ->join('divisions', 'divisions.id = templates.division_id', 'left')
                    ->where('templates.is_active', 1);

        if (!empty($search)) {
            $query->groupStart()
                  ->like('templates.name', $search)
                  ->orLike('templates.description', $search)
                  ->groupEnd();
        }

        if ($filterDirectorateId !== null) {
            $query->where('templates.directorate_id', $filterDirectorateId);
        }
        if ($filterDivisionId !== null) {
            $query->where('templates.division_id', $filterDivisionId);
        }

        if ($scopeDirectorateId !== null) {
            if ($scopeDivisionId !== null) {
                // User Divisi: Bisa lihat template global, template direktorat (tanpa divisi khusus), atau template divisinya sendiri
                $query->groupStart()
                      ->where('templates.directorate_id', null) // Global
                      ->orGroupStart()
                          ->where('templates.directorate_id', $scopeDirectorateId)
                          ->groupStart()
                              ->where('templates.division_id', null)
                              ->orWhere('templates.division_id', $scopeDivisionId)
                          ->groupEnd()
                      ->groupEnd()
                      ->groupEnd();
            } else {
                // Admin Direktorat: Bisa lihat template global ATAU template di dalam direktoratnya (semua divisi)
                $query->groupStart()
                      ->where('templates.directorate_id', $scopeDirectorateId)
                      ->orWhere('templates.directorate_id', null)
                      ->groupEnd();
            }
        }

        return $query->orderBy($sortBy, $sortDir)->findAll();
    }

    /**
     * Cari template berdasarkan slug.
     * Slug = versi URL-friendly dari nama template.
     * Contoh: "Surat Tugas Karyawan" → "surat-tugas-karyawan"
     */
    public function getBySlug(string $slug): ?array
    {
        return $this->select('templates.*, users.name as uploader_name, directorates.name as directorate_name')
                    ->join('users', 'users.id = templates.uploaded_by')
                    ->join('directorates', 'directorates.id = templates.directorate_id', 'left')
                    ->where('templates.slug', $slug)
                    ->first();
    }

    /**
     * Generate slug unik dari nama template.
     * Jika sudah ada yang sama, tambahkan angka di belakang (-2, -3, dst).
     */
    public function generateSlug(string $name, ?int $ignoreId = null): string
    {
        // Ubah ke lowercase, ganti spasi/karakter khusus jadi dash
        $slug = url_title($name, '-', true);
        
        // Cek apakah slug sudah ada
        $query = $this->where('slug', $slug);
        if ($ignoreId !== null) {
            $query = $query->where('id !=', $ignoreId);
        }
        $existing = $query->first();
        if (!$existing) {
            return $slug;
        }

        // Jika sudah ada, tambahkan angka
        $counter = 2;
        while (true) {
            $checkQuery = $this->where('slug', $slug . '-' . $counter);
            if ($ignoreId !== null) {
                $checkQuery = $checkQuery->where('id !=', $ignoreId);
            }
            if (!$checkQuery->first()) break;
            $counter++;
        }
        return $slug . '-' . $counter;
    }
}
