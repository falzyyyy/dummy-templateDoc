<?php

namespace App\Libraries;

use App\Libraries\CustomTemplateProcessor;

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
     * @param string $format        Format output ('docx' atau 'pdf')
     * @param array  $fields        Konfigurasi fields (opsional, untuk deteksi richtext)
     * @return string Path ke file hasil yang sudah di-generate
     */
    public function generate(string $templatePath, array $data, string $outputDir = '', string $format = 'docx', array $fields = []): string
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
        $processor = new CustomTemplateProcessor($templatePath);

        // Buat lookup table untuk konfigurasi field
        $fieldsConfig = [];
        foreach ($fields as $f) {
            $fieldsConfig[$f['field_key']] = $f;
        }

        // Koleksi gambar dari richtext yang diekstrak untuk di-inject via setImageValue
        $extractedRichtextImages = [];

        // Replace setiap placeholder dengan data dari form
        foreach ($data as $key => $value) {
            $fieldConfig = $fieldsConfig[$key] ?? null;
            $fieldType   = $fieldConfig['field_type'] ?? 'text';

            // Deteksi jika input adalah base64 Image (Upload Gambar / Kop / Logo)
            if (is_string($value) && str_starts_with($value, 'data:image/')) {
                $parts = explode(',', $value);
                if (count($parts) === 2) {
                    $mimePart = explode(';', $parts[0])[0];
                    $ext = str_replace('data:image/', '', $mimePart);
                    if ($ext === 'jpeg') $ext = 'jpg';
                    if (!in_array($ext, ['png', 'jpg', 'gif'])) $ext = 'png'; // fallback

                    $imageData = base64_decode($parts[1]);
                    $tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('docgen_img_') . '.' . $ext;
                    file_put_contents($tempFile, $imageData);
                    
                    // Resize fisik gambar dinonaktifkan agar murni menyesuaikan ukuran asli gambar
                    // $this->resizeImageFisik($tempFile, 250); 
                    
                    try {
                        // Dapatkan ukuran asli gambar secara manual
                        $info = @getimagesize($tempFile);
                        $origWidth = $info ? $info[0] : 150;
                        $origHeight = $info ? $info[1] : 150;

                        // Berikan ukuran asli/hasil resize tersebut ke PhpWord
                        $processor->setImageValue($key, [
                            'path' => $tempFile, 
                            'width' => $origWidth, 
                            'height' => $origHeight
                        ]);
                    } catch (\Exception $e) {
                        $processor->setValue($key, '[Gambar Tidak Valid]');
                    }
                    continue; // Lanjut ke field berikutnya
                }
            }

            // Deteksi format tanggal YYYY-MM-DD dan ubah ke lokal (12 Agustus 2026)
            if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                $value = $this->formatTanggalLokal($value);
            }

            // Deteksi tipe currency dan ubah formatnya ke angka saja (contoh: 15.000.000)
            if ($fieldType === 'currency' && is_numeric($value)) {
                $formattedCurrency = number_format((float)$value, 0, ',', '.');
                
                // Cek apakah ada mapping target terbilang
                if (!empty($fieldConfig['terbilang_target_id'])) {
                    // Cari field_key target berdasarkan id
                    $targetKey = null;
                    foreach ($fields as $tf) {
                        if ($tf['id'] == $fieldConfig['terbilang_target_id']) {
                            $targetKey = $tf['field_key'];
                            break;
                        }
                    }

                    if ($targetKey) {
                        $terbilangService = new \App\Libraries\TerbilangService();
                        $terbilangText = $terbilangService->convert((int)$value) . ' Rupiah';
                        $processor->setValue($targetKey, ucwords($terbilangText));
                    }
                }
                
                $value = $formattedCurrency;
            }

            if ($fieldType === 'richtext' && is_string($value)) {
                // Log raw HTML from CKEditor for debugging
                file_put_contents(WRITEPATH . 'ckeditor_raw.txt', $value . "\n---\n", FILE_APPEND);

                // FIX BUGS: PhpWord DOMDocument crash kalau ketemu <br> yang tidak ditutup. Ubah jadi <br/>
                $value = preg_replace('/<br\b[^>]*>(?!<\/br>)/i', '<br/>', $value);

                // 0. PRE-PROCESSING HTML UNTUK LISTS (<ol>, <ul>) DAN INDENTASI PARAGRAF
                // Menggunakan DOMDocument agar bisa membaca hirarki HTML dengan akurat (mendukung nested list).
                
                // Supaya DOMDocument tidak error baca karakter spesial, bungkus dengan XML encoding
                $htmlForDom = '<?xml encoding="UTF-8"><html><head><meta charset="utf-8"></head><body>' . $value . '</body></html>';
                
                $dom = new \DOMDocument();
                $internalErrors = libxml_use_internal_errors(true);
                $dom->loadHTML($htmlForDom, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
                libxml_use_internal_errors($internalErrors);
                
                $xpath = new \DOMXPath($dom);

                // --- A. PARSE NESTED LISTS ---
                $processList = function($node, $level = 0, $listType = 'ul') use (&$processList) {
                    $result = '';
                    $counter = 1;
                    foreach ($node->childNodes as $child) {
                        if ($child->nodeName === 'li') {
                            $prefix = ($listType === 'ol') ? ($counter++ . '.') : '&#8226;';
                            // Indentasi standar = 24pt untuk level 0, ditambah 24pt tiap level masuk
                            $indent = 24 + ($level * 24);
                            
                            $liContent = '';
                            $subLists = '';
                            
                            foreach ($child->childNodes as $liChild) {
                                if ($liChild->nodeName === 'ul' || $liChild->nodeName === 'ol') {
                                    $subLists .= $processList($liChild, $level + 1, $liChild->nodeName);
                                } else {
                                    $liContent .= $child->ownerDocument->saveHTML($liChild);
                                }
                            }
                            
                            $liContent = trim($liContent);
                            $alignStyle = '';
                            if ($child->hasAttribute('style')) {
                                $style = $child->getAttribute('style');
                                if (preg_match('/text-align\s*:\s*(left|center|right|justify)/i', $style, $m)) {
                                    $alignStyle = 'text-align: ' . $m[1] . '; ';
                                }
                            }
                            
                            if (preg_match('/^<p\b([^>]*)>(.*?)<\/p>$/is', $liContent, $pMatch)) {
                                $pAttrs = $pMatch[1];
                                $liContent = $pMatch[2];
                                if (preg_match('/text-align\s*:\s*(left|center|right|justify)/i', $pAttrs, $m)) {
                                    $alignStyle = 'text-align: ' . $m[1] . '; ';
                                }
                            }
                            
                            if (!empty($liContent) || !empty($prefix)) {
                                $result .= '<p style="' . $alignStyle . 'margin-bottom: 0px; margin-left: ' . $indent . 'pt; text-indent: -12pt;">' . $prefix . '&#160;' . $liContent . '</p>';
                            }
                            $result .= $subLists;
                        }
                    }
                    return $result;
                };

                // Ambil list paling atas
                $topLevelLists = $xpath->query('//ul[not(ancestor::ul) and not(ancestor::ol)] | //ol[not(ancestor::ul) and not(ancestor::ol)]');
                
                $listNodes = [];
                foreach ($topLevelLists as $list) {
                    $listNodes[] = $list;
                }
                
                foreach ($listNodes as $list) {
                    $replacementHtml = $processList($list, 0, $list->nodeName);
                    
                    // Gunakan temporary DOM untuk parsing replacementHtml (lebih tahan error dibanding appendXML)
                    $tempDom = new \DOMDocument();
                    @$tempDom->loadHTML('<?xml encoding="UTF-8"><html><body>' . $replacementHtml . '</body></html>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
                    $tempBody = $tempDom->getElementsByTagName('body')->item(0);
                    
                    if ($tempBody) {
                        foreach ($tempBody->childNodes as $tempNode) {
                            $importedNode = $dom->importNode($tempNode, true);
                            $list->parentNode->insertBefore($importedNode, $list);
                        }
                    }
                    $list->parentNode->removeChild($list);
                }

                // --- B. PARSE PARAGRAPH INDENTS ---
                $paragraphs = $xpath->query('//p[contains(@style, "margin-left")] | //h1[contains(@style, "margin-left")] | //h2[contains(@style, "margin-left")] | //h3[contains(@style, "margin-left")]');
                foreach ($paragraphs as $p) {
                    if ($p instanceof \DOMElement) {
                        $style = $p->getAttribute('style');
                        if (preg_match('/margin-left:\s*([0-9.]+)px/', $style, $matches)) {
                            $px = (float)$matches[1];
                            $pt = $px * 0.75; // konversi px ke pt
                            $style = preg_replace('/margin-left:\s*[0-9.]+px/', 'margin-left: ' . $pt . 'pt', $style);
                            $p->setAttribute('style', $style);
                        }
                    }
                }

                // --- C. EKSTRAK KEMBALI KE HTML STRING ---
                $body = $dom->getElementsByTagName('body')->item(0);
                $newValue = '';
                if ($body) {
                    foreach ($body->childNodes as $child) {
                        $newValue .= $dom->saveHTML($child);
                    }
                }
                
                $value = str_replace('<?xml encoding="UTF-8">', '', trim($newValue));

                // PRE-PROCESSING HTML UNTUK TABEL CKEDITOR 5
                
                // 1. Tangkap alignment dari style <figure> (text-align: center, float: left/right)
                $value = preg_replace_callback(
                    '/(<figure\b[^>]*class="[^"]*table[^"]*"[^>]*style="[^"]*(?:text-align|float)\s*:\s*(left|center|right)[^"]*"[^>]*>\s*)<table\b/i',
                    function ($matches) {
                        return $matches[1] . '<table align="' . $matches[2] . '"';
                    },
                    $value
                );
                
                // 2. Tangkap alignment dari margin: auto pada <figure> (biasanya artinya center)
                $value = preg_replace_callback(
                    '/(<figure\b[^>]*class="[^"]*table[^"]*"[^>]*style="[^"]*margin(?:-left)?\s*:\s*auto[^"]*"[^>]*>\s*)<table\b/i',
                    function ($matches) {
                        return $matches[1] . '<table align="center"';
                    },
                    $value
                );

                // 3. Tangkap alignment dari class CKEditor (jika ada) e.g. table-style-block-align-center
                $value = preg_replace_callback(
                    '/(<figure\b[^>]*class="[^"]*table-style(?:-block)?-align-(left|center|right)[^"]*"[^>]*>\s*)<table\b/i',
                    function ($matches) {
                        return $matches[1] . '<table align="' . $matches[2] . '"';
                    },
                    $value
                );
                
                // 4. Pre-process: fix cell width % dan tambahkan fallback alignment.
                //    CATATAN: Border TIDAK diambil dari CSS — akan disuntik langsung ke OOXML di bawah
                //    menggunakan nilai deterministik (bukan tebakan). Lihat bagian "INJEKSI BORDER" di bawah.
                $value = preg_replace_callback('/<(table|td|th)\b([^>]*)>/i', function ($matches) {
                    $tag = strtolower($matches[1]);
                    $attrs = $matches[2];
                    
                    if (preg_match('/style="([^"]*)"/i', $attrs, $styleMatches)) {
                        $existingStyle = $styleMatches[1];
                        
                        // Perbaikan bug PHPWord: Jika ada width: 25%, ubah jadi width: 1250%
                        // (PHPWord perlu persentase x 50 karena satuan OpenXML-nya berbeda)
                        if (($tag === 'td' || $tag === 'th') && preg_match('/width\s*:\s*([0-9.]+)\s*%/i', $existingStyle, $widthMatches)) {
                            $realPercent = (float) $widthMatches[1];
                            $openXmlPercent = $realPercent * 50;
                            $existingStyle = preg_replace('/width\s*:\s*[0-9.]+\s*%/i', 'width: ' . $openXmlPercent . '%', $existingStyle);
                        }

                        $attrs = str_replace($styleMatches[0], 'style="' . $existingStyle . '"', $attrs);
                    }
                    
                    // Fallback alignment ke center jika tag adalah table dan belum ada atribut align
                    if ($tag === 'table' && stripos($attrs, 'align=') === false) {
                        $attrs .= ' align="center"';
                    }
                    
                    return '<' . $tag . $attrs . '>';
                }, $value);

                // FIX BUGS: PhpWord tidak mensupport base64 image (data:image/...) di dalam tag <img> dari CKEditor.
                // Ekstrak base64 menjadi file fisik temporary.
                $value = preg_replace_callback('/<img\b([^>]*)src="data:image\/([^;]+);base64,([^"]+)"([^>]*)\/?>/i', function($matches) use (&$extractedRichtextImages) {
                    $ext = $matches[2];
                    if ($ext === 'jpeg') $ext = 'jpg';
                    if (!in_array($ext, ['png', 'jpg', 'gif'])) $ext = 'png';
                    
                    $imageData = base64_decode($matches[3]);
                    $tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('docgen_ck_') . '.' . $ext;
                    file_put_contents($tempFile, $imageData);
                    
                    // Buat key placeholder unik
                    $imgKey = 'ckimg_' . substr(md5(uniqid()), 0, 8);
                    
                    // Baca dimensi asli
                    $info = @getimagesize($tempFile);
                    $origWidth = $info ? $info[0] : 150;
                    $origHeight = $info ? $info[1] : 150;
                    
                    // Simpan mapping untuk diproses setImageValue nanti
                    $extractedRichtextImages[$imgKey] = [
                        'path' => $tempFile,
                        'width' => $origWidth,
                        'height' => $origHeight
                    ];
                    
                    // Ganti gambar dengan teks placeholder (contoh: ${ckimg_12345678})
                    return '${' . $imgKey . '}';
                }, $value);

                // FIX BUGS: PhpWord DOMDocument crash kalau ketemu <img> yang tidak ditutup di dalam <figure>.
                // Ubah <img src="..."> menjadi <img src="..."/>
                $value = preg_replace('/<img\b([^>]*?)\/?>/i', '<img$1/>', $value);

                // Konversi HTML dari CKEditor ke OpenXML
                $tempPhpWord = new \PhpOffice\PhpWord\PhpWord();
                $tempSection = $tempPhpWord->addSection();
                \PhpOffice\PhpWord\Shared\Html::addHtml($tempSection, $value, false, false);

                // Ekstrak XML dari setiap elemen hasil parsing HTML
                $xmlWriter = new \PhpOffice\PhpWord\Shared\XMLWriter(\PhpOffice\PhpWord\Shared\XMLWriter::STORAGE_MEMORY, null, true);
                foreach ($tempSection->getElements() as $element) {
                    $elementClass = get_class($element);
                    $elementName = substr($elementClass, strrpos($elementClass, '\\') + 1);
                    $objectClass = 'PhpOffice\\PhpWord\\Writer\\Word2007\\Element\\' . $elementName;
                    if (class_exists($objectClass)) {
                        $elementWriter = new $objectClass($xmlWriter, $element, false);
                        $elementWriter->write();
                    }
                }

                $xmlString = $xmlWriter->getData();

                // =============================================================
                // EKSTRAK BORDER DARI CSS CKEDITOR & INJEKSI KE OOXML
                // =============================================================
                // Nilai default: w:sz=8 (1pt visual), warna hitam
                $borderSz = 8;
                $borderColor = '000000';

                // 1. Coba tangkap dari shorthand: border: 5px solid #000 atau hsl(...)
                if (preg_match('/border\s*:\s*([0-9.]+)(px|pt)?\s+\w+\s+([^;"]+)/i', $value, $match)) {
                    $val = (float) $match[1];
                    $unit = strtolower($match[2] ?? 'px');
                    $borderSz = (int) round($val * ($unit === 'px' ? 6 : 8)); // 1px = 0.75pt = 6 sz, 1pt = 8 sz
                    $rawColor = trim($match[3]);
                    if (preg_match('/hsl\(\s*0\s*,\s*0%?\s*,\s*0%?\s*\)/i', $rawColor)) {
                        $borderColor = '000000';
                    } elseif (preg_match('/^#?([0-9a-fA-F]{6})$/', $rawColor, $cm)) {
                        $borderColor = $cm[1];
                    }
                } 
                // 2. Coba tangkap dari longhand: border-width: 5px; border-color: hsl(...)
                else {
                    if (preg_match('/border-width\s*:\s*([0-9.]+)(px|pt)?/i', $value, $matchW)) {
                        $val = (float) $matchW[1];
                        $unit = strtolower($matchW[2] ?? 'px');
                        $borderSz = (int) round($val * ($unit === 'px' ? 6 : 8));
                    }
                    if (preg_match('/border-color\s*:\s*([^;"]+)/i', $value, $matchC)) {
                        $rawColor = trim($matchC[1]);
                        if (preg_match('/hsl\(\s*0\s*,\s*0%?\s*,\s*0%?\s*\)/i', $rawColor)) {
                            $borderColor = '000000';
                        } elseif (preg_match('/^#?([0-9a-fA-F]{6})$/', $rawColor, $cm)) {
                            $borderColor = $cm[1];
                        }
                    }
                }

                // Injeksi menggunakan nilai yang ditangkap (bukan hardcode lagi)
                $xmlString = $this->injectTableBorders($xmlString, $borderSz, $borderColor);

                // DEBUG LOG: Verifikasi hasil injeksi border
                if (str_contains($xmlString, 'w:tbl')) {
                    $hasInjectedBorder = str_contains($xmlString, 'w:tblBorders');
                    file_put_contents(
                        WRITEPATH . 'xml_debug.txt',
                        "=== border_injected=" . ($hasInjectedBorder ? 'YES' : 'NO') . " | sz={$borderSz} | color={$borderColor} ===\n" . $xmlString . "\n\n",
                        FILE_APPEND
                    );
                }

                // Ganti seluruh paragraf <w:p> yang berisi placeholder dengan XML baru
                $processor->setRichTextBlock($key, $xmlString);
            } elseif (is_string($value) && str_contains($value, "\n")) {
                // Untuk textarea biasa: ganti newline dengan break Word
                $processor->setValue($key, $this->convertNewlines($value));
            } else {
                $processor->setValue($key, htmlspecialchars((string)$value));
            }

            // Auto-Terbilang: Fallback untuk field non-currency yang isinya angka murni
            if ($fieldType !== 'currency') {
                $cleanNum = str_replace(['.', ','], '', (string)$value);
                if (is_numeric($cleanNum) && (int)$cleanNum > 0 && !preg_match('/^0/', $cleanNum)) {
                    $terbilangService = new \App\Libraries\TerbilangService();
                    $terbilangStr = $terbilangService->convert((int)$cleanNum);
                    $processor->setValue($key . '_Terbilang', htmlspecialchars($terbilangStr));
                }
            }
        }

        // Proses SEMUA gambar yang berhasil diekstrak dari seluruh field richtext
        foreach ($extractedRichtextImages as $imgKey => $imgData) {
            try {
                $processor->setImageValue($imgKey, [
                    'path' => $imgData['path'],
                    'width' => $imgData['width'],
                    'height' => $imgData['height']
                ]);
            } catch (\Exception $e) {
                $processor->setValue($imgKey, '[Gambar Tidak Valid]');
            }
        }

        // Generate nama file unik: template-name_timestamp.docx
        $filename = 'doc_' . time() . '_' . bin2hex(random_bytes(4)) . '.docx';
        $outputPath = $outputDir . $filename;

        // Simpan file hasil sementara sebagai docx
        $processor->saveAs($outputPath);

        // Jika diminta PDF, konversi file docx menjadi pdf
        if ($format === 'pdf') {
            $pdfFilename = str_replace('.docx', '.pdf', $filename);
            $pdfOutputPath = $outputDir . $pdfFilename;

            // Tentukan perintah eksekusi LibreOffice berdasarkan OS
            $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
            $sofficePath = $isWindows ? '"C:\Program Files\LibreOffice\program\soffice.exe"' : 'libreoffice';

            // Cek spesifik untuk Windows memastikan file exe-nya beneran ada
            if ($isWindows && !file_exists('C:\Program Files\LibreOffice\program\soffice.exe')) {
                throw new \RuntimeException("LibreOffice tidak ditemukan di C:\Program Files\LibreOffice\program\soffice.exe. Silakan install terlebih dahulu.");
            }

            // Susun command: soffice --headless --convert-to pdf --outdir [folder_tujuan] [file_sumber.docx]
            // escapeshellarg penting untuk mencegah error jika nama folder mengandung spasi
            $command = sprintf(
                '%s --headless --convert-to pdf --outdir %s %s 2>&1',
                $sofficePath,
                escapeshellarg(rtrim($outputDir, '/\\')),
                escapeshellarg($outputPath)
            );

            // Eksekusi command secara background
            $output = shell_exec($command);

            // Verifikasi apakah file PDF sukses dibuat
            if (file_exists($pdfOutputPath)) {
                // Hapus file docx sementara
                @unlink($outputPath);
                return $pdfOutputPath;
            } else {
                throw new \RuntimeException("Gagal mengkonversi PDF via LibreOffice. Log eksekusi: " . ($output ?: 'Tidak ada respon'));
            }
        }

        return $outputPath;
    }

    /**
     * Suntikkan <w:tblBorders> langsung ke OOXML, bypass PHPWord CSS parser.
     *
     * Pendekatan deterministik — nilai w:sz per spec ISO/IEC 29500 (eighths of a point):
     *   sz=8  → 1pt (standar), sz=16 → 2pt, sz=24 → 3pt, sz=48 → 6pt (testing ekstrem)
     *
     * @param string $xmlString  XML hasil dari PhpWord XMLWriter
     * @param int    $szValue    Ukuran border dalam eighths-of-a-point (default 8 = 1pt)
     * @param string $color      Warna border dalam hex 6 digit tanpa '#' (default '000000')
     * @return string            XML yang sudah disuntik border
     */
    private function injectTableBorders(string $xmlString, int $szValue = 8, string $color = '000000'): string
    {
        $bordersXml = sprintf(
            '<w:tblBorders>' .
            '<w:top w:val="single" w:sz="%1$d" w:space="0" w:color="%2$s"/>' .
            '<w:left w:val="single" w:sz="%1$d" w:space="0" w:color="%2$s"/>' .
            '<w:bottom w:val="single" w:sz="%1$d" w:space="0" w:color="%2$s"/>' .
            '<w:right w:val="single" w:sz="%1$d" w:space="0" w:color="%2$s"/>' .
            '<w:insideH w:val="single" w:sz="%1$d" w:space="0" w:color="%2$s"/>' .
            '<w:insideV w:val="single" w:sz="%1$d" w:space="0" w:color="%2$s"/>' .
            '</w:tblBorders>',
            $szValue,
            $color
        );

        // Hapus <w:tblBorders> yang mungkin sudah ada (dari PHPWord) agar tidak duplikat
        $xmlString = preg_replace('/<w:tblBorders>.*?<\/w:tblBorders>/s', '', $xmlString);

        // Kasus 1: <w:tblPr> non-self-closing — sisipkan langsung setelah tag pembuka
        $xmlString = preg_replace('/<w:tblPr>/', '<w:tblPr>' . $bordersXml, $xmlString);

        // Kasus 2: <w:tblPr/> self-closing — ubah jadi open-close dengan borders di dalam
        $xmlString = preg_replace('/<w:tblPr\s*\/>/', '<w:tblPr>' . $bordersXml . '</w:tblPr>', $xmlString);

        return $xmlString;
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

    /**
     * Resize fisik gambar menggunakan GD Library.
     * Mencegah bug DomPDF yang sering merender gambar pada resolusi 100% (raksasa).
     */
    private function resizeImageFisik(string $file, int $maxDim): void
    {
        if (!extension_loaded('gd')) return;

        $info = @getimagesize($file);
        if (!$info) return;

        list($width, $height, $type) = $info;
        if ($width <= $maxDim && $height <= $maxDim) return;

        $ratio = $width / $height;
        if ($ratio > 1) {
            $newWidth = $maxDim;
            $newHeight = $maxDim / $ratio;
        } else {
            $newHeight = $maxDim;
            $newWidth = $maxDim * $ratio;
        }

        $src = null;
        if ($type == IMAGETYPE_JPEG) $src = @imagecreatefromjpeg($file);
        elseif ($type == IMAGETYPE_PNG) $src = @imagecreatefrompng($file);

        if ($src) {
            $dst = imagecreatetruecolor((int)$newWidth, (int)$newHeight);
            if ($type == IMAGETYPE_PNG) {
                imagealphablending($dst, false);
                imagesavealpha($dst, true);
            }
            imagecopyresampled($dst, $src, 0, 0, 0, 0, (int)$newWidth, (int)$newHeight, $width, $height);
            
            if ($type == IMAGETYPE_JPEG) @imagejpeg($dst, $file, 90);
            elseif ($type == IMAGETYPE_PNG) @imagepng($dst, $file);
            
            imagedestroy($src);
            imagedestroy($dst);
        }
    }


    /**
     * Format YYYY-MM-DD ke format lokal (DD Bulan YYYY).
     */
    private function formatTanggalLokal(string $date): string
    {
        $bulanList = [
            1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        $split = explode('-', $date);
        $tanggal = (int)$split[2];
        $bulan = (int)$split[1];
        $tahun = $split[0];
        return $tanggal . ' ' . $bulanList[$bulan] . ' ' . $tahun;
    }

}
