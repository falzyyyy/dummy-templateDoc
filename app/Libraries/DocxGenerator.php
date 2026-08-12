<?php

namespace App\Libraries;

use PhpOffice\PhpWord\TemplateProcessor;

/**
 * DocxGenerator
 * 
 * OTAK SISTEM #2 — Mengambil template Word dan mengganti placeholder dengan data user.
 * 
 * Cara kerja:
 * 1. Load file template .docx (yang sudah diupload admin)
 * 2. Untuk setiap placeholder, ganti dengan data yang diisi user di form
 * 3. Simpan sebagai file .docx baru
 * 4. Return path ke file hasil
 * 
 * PENTING: PhpWord TemplateProcessor bekerja di level XML.
 * Artinya semua formatting Word (font, bold, italic, tabel, header, footer, gambar)
 * TETAP UTUH. Yang diganti hanya teks placeholder-nya saja.
 * 
 * Contoh:
 * Template: "Nama: ${Nama Karyawan}"  (bold, Arial 12pt)
 * Data:     ['Nama Karyawan' => 'Budi Santoso']
 * Hasil:    "Nama: Budi Santoso"       (tetap bold, Arial 12pt)
 */
class DocxGenerator
{
    /**
     * Generate dokumen Word final dari template + data.
     * 
     * @param string $templatePath  Path ke file template .docx
     * @param array  $data          Data isian: ['placeholder_key' => 'value', ...]
     * @param string $outputDir     Direktori untuk menyimpan file hasil
     * @return string Path ke file .docx yang sudah di-generate
     */
    public function generate(string $templatePath, array $data, string $outputDir = ''): string
    {
        if (!file_exists($templatePath)) {
            throw new \RuntimeException("Template file tidak ditemukan: {$templatePath}");
        }

        // Default output directory
        if (empty($outputDir)) {
            $outputDir = FCPATH . 'uploads/documents/';
        }

        // Pastikan folder output ada
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }

        // Load template menggunakan TemplateProcessor
        $processor = new TemplateProcessor($templatePath);

        // Replace setiap placeholder dengan data dari form
        foreach ($data as $key => $value) {
            // setValue() mengganti ${key} di template dengan value
            // Jika value mengandung newline, gunakan multiline replacement
            if (str_contains($value, "\n")) {
                // Untuk textarea: ganti newline dengan break Word
                $processor->setValue($key, $this->convertNewlines($value));
            } else {
                $processor->setValue($key, htmlspecialchars($value));
            }
        }

        // Generate nama file unik: template-name_timestamp.docx
        $filename = 'doc_' . time() . '_' . bin2hex(random_bytes(4)) . '.docx';
        $outputPath = $outputDir . $filename;

        // Simpan file hasil
        $processor->saveAs($outputPath);

        return $outputPath;
    }

    /**
     * Konversi newline (\n) menjadi format break yang dimengerti Word.
     * Ini penting untuk field textarea yang multi-baris.
     */
    private function convertNewlines(string $text): string
    {
        // PhpWord TemplateProcessor mendukung XML break
        $text = htmlspecialchars($text);
        return str_replace("\n", '</w:t><w:br/><w:t>', $text);
    }
}
