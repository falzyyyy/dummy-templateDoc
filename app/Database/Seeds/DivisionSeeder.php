<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use App\Models\DivisionModel;

/**
 * TemplateSeeder
 * 
 * Membuat template untuk divisi pengadaan dan umum saat pertama kali setup.
 * 5 template ( dengan keterangan bila ada ) dan 5 template ( tanpa keterangan bila ada )
 * 
 * 
 */
class DivisionSeeder extends Seeder
{
    public function run()
    {
        $divisionModel = new DivisionModel();

        /*
        id
        directorate_id
        name
        created_at
        updated_at
        */

        $divisions = [
            ['directorate_id' => 1, 'name' => 'Divisi Satuan Pengawasan Intern'], // 1
            ['directorate_id' => 1, 'name' => 'Divisi Sekretariat Perusahaan'], // 2
            ['directorate_id' => 1, 'name' => 'Divisi Strategi dan Manajemen Kinerja'], // 3
            ['directorate_id' => 2, 'name' => 'Divisi Pemasaran dan Penjualan'], // 4
            ['directorate_id' => 2, 'name' => 'Divisi Transformasi Digital'], // 5
            ['directorate_id' => 2, 'name' => 'Divisi Hubungan Kelembagaan dan Hukum'], // 6
            ['directorate_id' => 2, 'name' => 'Divisi Manajemen dan Aset'], // 7
            ['directorate_id' => 2, 'name' => 'Divisi Kelapa Sawit dan Karet'], // 8
            ['directorate_id' => 2, 'name' => 'Divisi Aneka Tanaman'], // 9
            ['directorate_id' => 2, 'name' => 'PMO Pengembangan Komoditi dan Hilirisasi'], // 10
            ['directorate_id' => 2, 'name' => 'Divisi Akuntansi dan Perpajakan'], // 11
            ['directorate_id' => 2, 'name' => 'Divisi Keuangan Strategis dan Anggaran'], // 12
            ['directorate_id' => 2, 'name' => 'Divisi Manajemen Risiko'], // 13
            ['directorate_id' => 3, 'name' => 'Divisi Strategi dan Pengembangan SDM'], // 14
            ['directorate_id' => 3, 'name' => 'Divisi Operasional SDM'], // 15
            ['directorate_id' => 3, 'name' => 'Divisi Pengadaan dan Umum'], // 16
        ];

        foreach ($divisions as $division) {
            if ($divisionModel->where('name', $division['name'])->first()) {
                continue;
            }

            $divisionModel->insert([
                'directorate_id'    => $division['directorate_id'],
                'name'              => $division['name'],
                'created_at'        => date('Y-m-d H:i:s'),
                'updated_at'        => date('Y-m-d H:i:s'), 
            ]);
        }

        echo "16 divisi berhasil digenerate!\n";
    }
}
