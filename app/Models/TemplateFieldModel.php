<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * TemplateFieldModel
 * 
 * Mengelola data di tabel 'template_fields'.
 * 
 * Setiap template punya banyak fields (1-to-many relationship).
 * Field = placeholder yang terdeteksi dari file Word.
 * 
 * Contoh: Template "Surat Tugas" punya fields:
 *   - Nomor Surat (text)
 *   - Tanggal (date)
 *   - Nama Karyawan (text)
 *   - Isi Tugas (textarea)
 */
class TemplateFieldModel extends Model
{
    protected $table         = 'template_fields';
    protected $primaryKey    = 'id';
    protected $allowedFields = [
        'template_id', 'field_key', 'field_label', 
        'field_type', 'field_order', 'is_required', 'default_value'
    ];
    protected $useTimestamps = false;
    protected $createdField  = 'created_at';

    /**
     * Ambil semua field milik satu template, urut berdasarkan field_order.
     */
    public function getByTemplate(int $templateId): array
    {
        return $this->where('template_id', $templateId)
                    ->orderBy('field_order', 'ASC')
                    ->findAll();
    }

    /**
     * Hapus semua field lama dan insert field baru.
     * Dipanggil saat admin mengupload ulang template atau mengubah konfigurasi field.
     */
    public function syncFields(int $templateId, array $fields): bool
    {
        // Hapus field lama
        $this->where('template_id', $templateId)->delete();

        // Insert field baru
        foreach ($fields as $order => $field) {
            $this->insert([
                'template_id'   => $templateId,
                'field_key'     => $field['field_key'],
                'field_label'   => $field['field_label'] ?? $field['field_key'],
                'field_type'    => $field['field_type'] ?? 'text',
                'field_order'   => $order + 1,
                'is_required'   => $field['is_required'] ?? 1,
                'default_value' => $field['default_value'] ?? null,
            ]);
        }

        return true;
    }
}
