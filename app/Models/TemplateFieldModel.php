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
        'field_type', 'field_order', 'is_required', 'default_value',
        'terbilang_target_id', 'is_auto_generated'
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

        // Pertama, insert semua field (tanpa terbilang_target_id dulu agar tidak melanggar FK jika target belum di-insert)
        $insertedIds = [];
        foreach ($fields as $order => $field) {
            $insertedIds[$field['id'] ?? 'new_'.$order] = $this->insert([
                'template_id'         => $templateId,
                'field_key'           => $field['field_key'],
                'field_label'         => $field['field_label'] ?? $field['field_key'],
                'field_type'          => $field['field_type'] ?? 'text',
                'field_order'         => $order + 1,
                'is_required'         => $field['is_required'] ?? 1,
                'default_value'       => $field['default_value'] ?? null,
                'is_auto_generated'   => 0, // Reset default
            ]);
        }

        // Kedua, update mapping terbilang_target_id dan flag is_auto_generated
        $debugLog = [];
        foreach ($fields as $order => $field) {
            if (!empty($field['terbilang_target_id'])) {
                // Cari ID baru dari target
                $targetOldId = $field['terbilang_target_id'];
                $newTargetId = $insertedIds[$targetOldId] ?? null;
                $newSelfId   = $insertedIds[$field['id'] ?? 'new_'.$order] ?? null;

                $debugLog[] = "OldTarget: $targetOldId, NewTarget: $newTargetId, OldSelf: " . ($field['id'] ?? 'none') . ", NewSelf: $newSelfId";

                if ($newTargetId && $newSelfId) {
                    $this->update($newSelfId, ['terbilang_target_id' => $newTargetId]);
                    $this->update($newTargetId, ['is_auto_generated' => 1]);
                    $debugLog[] = "SUCCESS update self $newSelfId with target $newTargetId";
                } else {
                    $debugLog[] = "FAIL to update because newTargetId or newSelfId is null";
                }
            }
        }
        
        file_put_contents(WRITEPATH . 'debug_mapping.txt', implode("\n", $debugLog));

        return true;
    }
}
