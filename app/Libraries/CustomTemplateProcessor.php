<?php

namespace App\Libraries;

use PhpOffice\PhpWord\TemplateProcessor;

/**
 * CustomTemplateProcessor
 * 
 * Meng-extend TemplateProcessor bawaan PhpWord agar kita bisa mengganti
 * seluruh blok paragraf <w:p> yang berisi placeholder dengan konten XML kustom.
 * 
 * Dibutuhkan karena method replaceXmlBlock() di parent bersifat protected.
 */
class CustomTemplateProcessor extends TemplateProcessor
{
    public function setRichTextBlock(string $search, string $xmlContent): void
    {
        $searchMacro = '${' . $search . '}';
        
        // Gunakan regex yang HANYA memblok 1 paragraf penuh (<w:p> ... </w:p>) tanpa menelan tag lain.
        // Regex ini mengecualikan tag <w:p> atau </w:p> di dalam pencarian sehingga dijamin tidak overlap.
        $pattern = '/<w:p\b[^>]*>(?:(?!<\/?w:p\b).)*?'.preg_quote($searchMacro, '/').'(?:(?!<\/?w:p\b).)*?<\/w:p>/su';
        
        // preg_replace otomatis mengganti SEMUA kemunculan di seluruh dokumen
        $this->tempDocumentMainPart = preg_replace($pattern, $xmlContent, $this->tempDocumentMainPart);
    }
}
