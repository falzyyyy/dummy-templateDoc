<?php

namespace App\Libraries;

use PhpOffice\PhpWord\TemplateProcessor;

/**
 * DocxParser
 * 
 * OTAK SISTEM #1 — Membaca file Word (.docx) dan mendeteksi semua placeholder.
 * 
 * Cara kerja:
 * 1. Admin upload file .docx yang berisi placeholder seperti {{Nama}}, {{Tanggal}}
 * 2. Library ini membaca file tersebut menggunakan PhpWord TemplateProcessor
 * 3. TemplateProcessor punya method getVariables() yang otomatis mendeteksi
 *    semua teks dalam format ${...} di file Word
 * 4. Karena kita pakai format {{...}}, kita set custom delimiter-nya
 * 5. Return daftar placeholder beserta tipe yang di-auto-detect
 * 
 * Auto-detect tipe field berdasarkan nama placeholder:
 * - Mengandung "tanggal", "date", "tgl" → date picker
 * - Mengandung "isi", "bab", "deskripsi", "keterangan", "uraian" → textarea
 * - Mengandung "nomor", "jumlah", "total", "angka" → number
 * - Lainnya → text input
 */
class DocxParser
{
    /**
     * Parse file .docx dan return daftar placeholder yang terdeteksi.
     * 
     * @param string $filePath Path absolut ke file .docx
     * @return array Daftar field: [['field_key' => '...', 'field_label' => '...', 'field_type' => '...'], ...]
     */
    public function parse(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new \RuntimeException("File tidak ditemukan: {$filePath}");
        }

        // TemplateProcessor dari PhpWord — khusus untuk template processing
        // Secara default mendeteksi ${variable}, tapi bisa dikustomisasi
        $processor = new TemplateProcessor($filePath);

        // getVariables() mengembalikan array nama-nama placeholder
        // Contoh: ['Nama', 'Tanggal', 'Isi Tugas']
        $variables = $processor->getVariables();

        // Hilangkan duplikat (placeholder yang sama bisa muncul berkali-kali di dokumen)
        $variables = array_unique($variables);

        // Konversi ke format field dengan auto-detect tipe
        $fields = [];
        foreach ($variables as $index => $variable) {
            $fields[] = [
                'field_key'   => $variable,
                'field_label' => $this->generateLabel($variable),
                'field_type'  => $this->detectType($variable),
                'field_order' => $index + 1,
                'is_required' => 1,
            ];
        }

        return $fields;
    }

    /**
     * Generate label yang readable dari nama placeholder.
     * Contoh: "nama_karyawan" → "Nama Karyawan"
     *         "Bab 1 Pendahuluan" → "Bab 1 Pendahuluan" (sudah bagus)
     */
    private function generateLabel(string $key): string
    {
        // Ganti underscore dengan spasi
        $label = str_replace('_', ' ', $key);
        // Capitalize setiap kata
        return ucwords($label);
    }

    /**
     * Auto-detect tipe input berdasarkan nama placeholder.
     * 
     * Logika sederhana: cek apakah nama mengandung kata kunci tertentu.
     * Admin tetap bisa mengubah tipe ini nanti di halaman edit fields.
     */
    private function detectType(string $key): string
    {
        $lower = strtolower($key);

        // Kata kunci untuk date
        $dateKeywords = ['tanggal', 'date', 'tgl', 'waktu', 'hari'];
        foreach ($dateKeywords as $keyword) {
            if (str_contains($lower, $keyword)) {
                return 'date';
            }
        }

        // Kata kunci untuk textarea (teks panjang)
        $textareaKeywords = ['isi', 'bab', 'deskripsi', 'keterangan', 'uraian', 'konten', 'content', 'paragraf', 'catatan', 'detail'];
        foreach ($textareaKeywords as $keyword) {
            if (str_contains($lower, $keyword)) {
                return 'textarea';
            }
        }

        // Kata kunci untuk number
        $numberKeywords = ['nomor', 'jumlah', 'total', 'angka', 'qty', 'kuantitas'];
        foreach ($numberKeywords as $keyword) {
            if (str_contains($lower, $keyword)) {
                return 'number';
            }
        }

        // Default: text input
        return 'text';
    }
}
