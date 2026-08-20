<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use App\Models\UserModel;

/**
 * AdminSeeder
 * 
 * Membuat akun admin default saat pertama kali setup.
 * 
 * Jalankan di terminal Laragon:
 *   php spark db:seed AdminSeeder
 * 
 */
class AdminSeeder extends Seeder
{
    public function run()
    {
        $userModel = new UserModel();

        $users = [
            'superadmin' => [
                ['name' => 'Administrator', 'email' => 'admin@docgen.com'],
                ['name' => 'Superadmin 2', 'email' => 'superadmin2@docgen.com'],
            ],
            'admin' => [
                ['name' => 'Admin Umum', 'email' => 'user1@docgen.com'],
            ],
            'admin_dspi' => [
                ['name' => 'Admin Divisi Satuan Pengawasan Intern', 'email' => 'dspi@docgen.com'],
            ],
            'admin_dspn' => [
                ['name' => 'Admin Divisi Sekretariat Perusahaan', 'email' => 'dspn@docgen.com'],
            ],
            'admin_dsmk' => [
                ['name' => 'Admin Divisi Strategi dan Manajemen Kinerja', 'email' => 'dsmk@docgen.com'],
            ],
            'admin_dppn' => [
                ['name' => 'Admin Divisi Pemasaran dan Penjualan', 'email' => 'dppn@docgen.com'],
            ],
            'admin_dtdi' => [
                ['name' => 'Admin Divisi Transformasi Digital', 'email' => 'dtdi@docgen.com'],
            ],
            'admin_dhkm' => [
                ['name' => 'Admin Divisi Hubungan Kelembagaan dan Hukum', 'email' => 'dhkm@docgen.com'],
            ],
            'admin_dmas' => [
                ['name' => 'Admin Divisi Manajemen Aset', 'email' => 'dmas@docgen.com'],
            ],
            'admin_dksr' => [
                ['name' => 'Admin Divisi Kelapa Sawit dan Karet', 'email' => 'dksr@docgen.com'],
            ],
            'admin_datn' => [
                ['name' => 'Admin Divisi Aneka Tanaman', 'email' => 'datn@docgen.com'],
            ],
            'admin_pmkh' => [
                ['name' => 'Admin PMO Pengembangan Komoditi dan Hilirisasi', 'email' => 'pmkh@docgen.com'],
            ],
            'admin_dapn' => [
                ['name' => 'Admin Divisi Akuntansi dan Perpajakan', 'email' => 'dapn@docgen.com'],
            ],
            'admin_dksa' => [
                ['name' => 'Admin Divisi Keuangan Strategis dan Anggaran', 'email' => 'dksa@docgen.com'],
            ],
            'admin_dimr' => [
                ['name' => 'Admin Divisi Manajemen Risiko', 'email' => 'dimr@docgen.com'],
            ],
            'admin_dsps' => [
                ['name' => 'Admin Divisi Strategi dan Pengembangan SDM', 'email' => 'dsps@docgen.com'],
            ],
            'admin_dops' => [
                ['name' => 'Admin Divisi Operasional SDM', 'email' => 'dops@docgen.com'],
            ],
            'admin_dpdu' => [
                ['name' => 'Admin Divisi Pengadaan dan Umum', 'email' => 'dpdu@docgen.com'],
                ['name' => 'Erma Dwi Yanti', 'email' => 'erma@ptpn.com'],
                ['name' => 'Dhannie Fajar Istiqmal', 'email' => 'dhannie@ptpn.com']
            ],
        ];

        foreach ($users as $role => $roleUsers) {
            foreach ($roleUsers as $user) {
                if ($userModel->where('email', $user['email'])->first()) {
                    continue;
                }

                $userModel->insert([
                    'name'     => $user['name'],
                    'email'    => $user['email'],
                    'password' => 'admin123',
                    'role'      => $role,
                ]);
            }
        }

        echo "Seeder seluruh admin berhasil dijalankan!\n";
    }
}
