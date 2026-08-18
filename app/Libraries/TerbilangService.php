<?php

namespace App\Libraries;

/**
 * TerbilangService
 * 
 * Service khusus untuk mengonversi angka menjadi kalimat Bahasa Indonesia (terbilang).
 */
class TerbilangService
{
    /**
     * Konversi angka ke huruf (Bahasa Indonesia).
     * Contoh: 123 -> seratus dua puluh tiga
     */
    public function convert(int $angka): string
    {
        $angka = abs($angka);
        $baca = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
        $terbilang = '';

        if ($angka < 12) {
            $terbilang = ' ' . $baca[$angka];
        } elseif ($angka < 20) {
            $terbilang = $this->convert($angka - 10) . ' belas';
        } elseif ($angka < 100) {
            $terbilang = $this->convert((int)($angka / 10)) . ' puluh ' . $this->convert($angka % 10);
        } elseif ($angka < 200) {
            $terbilang = ' seratus ' . $this->convert($angka - 100);
        } elseif ($angka < 1000) {
            $terbilang = $this->convert((int)($angka / 100)) . ' ratus ' . $this->convert($angka % 100);
        } elseif ($angka < 2000) {
            $terbilang = ' seribu ' . $this->convert($angka - 1000);
        } elseif ($angka < 1000000) {
            $terbilang = $this->convert((int)($angka / 1000)) . ' ribu ' . $this->convert($angka % 1000);
        } elseif ($angka < 1000000000) {
            $terbilang = $this->convert((int)($angka / 1000000)) . ' juta ' . $this->convert($angka % 1000000);
        } elseif ($angka < 1000000000000) {
            $terbilang = $this->convert((int)($angka / 1000000000)) . ' miliar ' . $this->convert($angka % 1000000000);
        } elseif ($angka < 1000000000000000) {
            $terbilang = $this->convert((int)($angka / 1000000000000)) . ' triliun ' . $this->convert($angka % 1000000000000);
        }

        $terbilang = preg_replace('/\s+/', ' ', $terbilang);
        return trim($terbilang);
    }
}
