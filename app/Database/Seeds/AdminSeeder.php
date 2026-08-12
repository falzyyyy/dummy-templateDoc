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
 * Login dengan:
 *   Email:    admin@docgen.com
 *   Password: admin123
 */
class AdminSeeder extends Seeder
{
    public function run()
    {
        $userModel = new UserModel();

        // Cek apakah admin sudah ada
        $existing = $userModel->where('email', 'admin@docgen.com')->first();
        if ($existing) {
            echo "Admin sudah ada, skip.\n";
            return;
        }

        $userModel->insert([
            'name'     => 'Administrator',
            'email'    => 'admin@docgen.com',
            'password' => 'admin123',  // Auto-hashed oleh model
            'role'     => 'admin',
        ]);

        echo "Admin berhasil dibuat!\n";
        echo "Email: admin@docgen.com\n";
        echo "Password: admin123\n";
    }
}
