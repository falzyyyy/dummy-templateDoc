<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * UserModel
 * 
 * Mengelola data di tabel 'users'.
 * 
 * $allowedFields = kolom yang boleh diisi saat insert/update
 * $useTimestamps = otomatis isi created_at dan updated_at
 * $beforeInsert  = sebelum insert, jalankan method hashPassword()
 *                  agar password otomatis di-hash (bukan plaintext)
 */
class UserModel extends Model
{
    protected $table         = 'users';
    protected $primaryKey    = 'id';
    protected $allowedFields = ['name', 'email', 'password', 'role', 'is_active'];
    protected $useTimestamps = true;

    // Sebelum data di-insert ke database, hash password-nya dulu
    protected $beforeInsert = ['hashPassword'];
    protected $beforeUpdate = ['hashPassword'];

    /**
     * Hash password sebelum disimpan ke database.
     * password_hash() menggunakan bcrypt — standar keamanan.
     */
    protected function hashPassword(array $data): array
    {
        if (isset($data['data']['password'])) {
            $data['data']['password'] = password_hash(
                $data['data']['password'],
                PASSWORD_BCRYPT
            );
        }
        return $data;
    }

    /**
     * Verifikasi password saat login.
     * password_verify() membandingkan plaintext dengan hash di database.
     */
    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}
