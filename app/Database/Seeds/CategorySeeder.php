<?php

namespace App\Database\Seeds;

use App\Models\CategoryModel;
use CodeIgniter\Database\Seeder;

/**
 * CategorySeeder
 * 
 * Membuat template untuk divisi pengadaan dan umum saat pertama kali setup.
 * 5 template ( dengan keterangan bila ada ) dan 5 template ( tanpa keterangan bila ada )
 * 
 * 
 */
class CategorySeeder extends Seeder
{
    public function run()
    {
        $categoryModel = new CategoryModel();

        /*
        id
        directorate_id
        name
        created_at
        updated_at
        */

        $categories = [
            ['directorate_id' => 3 , 'name' => 'Kerangka Kerja Acuan'],
            ['directorate_id' => 3 , 'name' => 'Kontrak']
        ];

        foreach ($categories as $category) {
            if ($categoryModel->where('name', $category['name'])->first()) {
                continue;
            }

            $categoryModel->insert([
                'directorate_id'    => $category['directorate_id'],
                'name'              => $category['name'],
                'created_at'        => date('Y-m-d H:i:s'),
                'updated_at'        => date('Y-m-d H:i:s'),
            ]);
        }

        echo "Kategori berhasil digenerate!\n";
    }
}
