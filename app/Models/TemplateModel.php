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
    protected $allowedFields = ['name', 'slug', 'description', 'file_path', 'file_name', 'uploaded_by', 'is_active'];
    protected $useTimestamps = true;

    /**
     * Ambil semua template yang aktif (is_active = 1).
     * Join ke tabel users untuk dapat nama admin yang upload.
     */
    public function getActiveTemplates(): array
    {
        return $this->select('templates.*, users.name as uploader_name')
                    ->join('users', 'users.id = templates.uploaded_by')
                    ->where('templates.is_active', 1)
                    ->orderBy('templates.created_at', 'DESC')
                    ->findAll();
    }

    /**
     * Cari template berdasarkan slug.
     * Slug = versi URL-friendly dari nama template.
     * Contoh: "Surat Tugas Karyawan" → "surat-tugas-karyawan"
     */
    public function getBySlug(string $slug): ?array
    {
        return $this->select('templates.*, users.name as uploader_name')
                    ->join('users', 'users.id = templates.uploaded_by')
                    ->where('templates.slug', $slug)
                    ->first();
    }

    /**
     * Generate slug unik dari nama template.
     * Jika sudah ada yang sama, tambahkan angka di belakang (-2, -3, dst).
     */
    public function generateSlug(string $name): string
    {
        // Ubah ke lowercase, ganti spasi/karakter khusus jadi dash
        $slug = url_title($name, '-', true);
        
        // Cek apakah slug sudah ada
        $existing = $this->where('slug', $slug)->first();
        if (!$existing) {
            return $slug;
        }

        // Jika sudah ada, tambahkan angka
        $counter = 2;
        while ($this->where('slug', $slug . '-' . $counter)->first()) {
            $counter++;
        }
        return $slug . '-' . $counter;
    }
}
