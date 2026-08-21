<?php

namespace App\Database\Seeds;

use App\Models\DirectorateModel;
use CodeIgniter\Database\Seeder;

/**
 * TemplateSeeder
 * 
 * Membuat template untuk divisi pengadaan dan umum saat pertama kali setup.
 * 5 template ( dengan keterangan bila ada ) dan 5 template ( tanpa keterangan bila ada )
 * 
 * 
 */
class DirectorateSeeder extends Seeder
{
    public function run()
    {
        $directorateModel = new DirectorateModel();

        /*
        id
        name
        created_at
        updated_at
        */

        $directorates = [
            ['name' => 'Direktorat Utama'],
            ['name' => 'Direktorat Produksi & Pengembangan'],
            ['name' => 'Direktorat SDM dan Umum'],
            ['name' => 'Direktorat Bisnis'],
            ['name' => 'Direktorat Aset'],
            ['name' => 'Direktorat Keuangan dan Manajemen Risiko'],
        ];

        foreach ($directorates as $directorate) {
            if ($directorateModel->where('name', $directorate['name'])->first()) {
                continue;
            }

            $directorateModel->insert([
                'name'           => $directorate['name'],
                'created_at'     => date('Y-m-d H:i:s'),
                'updated_at'     => date('Y-m-d H:i:s'),
            ]);
        }

        echo "6 Direksi berhasil digenerate!\n";
    }
}
