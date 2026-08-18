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
    protected $allowedFields = ['name', 'email', 'password', 'role', 'is_active', 'directorate_id', 'division_id', 'permissions'];
    protected $useTimestamps = true;

    // Sebelum data di-insert ke database, hash password-nya dulu, dan cek kuota admin_direktorat
    protected $beforeInsert = ['hashPassword', 'checkAdminDirektoratQuota'];
    protected $beforeUpdate = ['hashPassword', 'checkAdminDirektoratQuota'];

    /**
     * Mengecek apakah role admin_direktorat sudah ada di directorate yang sama.
     */
    protected function checkAdminDirektoratQuota(array $data): array
    {
        if (isset($data['data']['role']) && $data['data']['role'] === 'admin_direktorat') {
            $directorateId = $data['data']['directorate_id'] ?? null;
            
            if (!$directorateId) {
                // Saat update, mungkin directorate_id tidak dikirim di payload, jadi kita harus ambil dari db
                if (isset($data['id'])) {
                    $userId = is_array($data['id']) ? $data['id'][0] : $data['id'];
                    $existingUser = $this->find($userId);
                    $directorateId = $existingUser['directorate_id'] ?? null;
                }
            }

            if ($directorateId) {
                $query = $this->where('role', 'admin_direktorat')
                              ->where('directorate_id', $directorateId);
                
                // Kalau update, abaikan user ini sendiri
                if (isset($data['id'])) {
                    $userId = is_array($data['id']) ? $data['id'][0] : $data['id'];
                    $query->where('id !=', $userId);
                }

                if ($query->countAllResults() > 0) {
                    throw new \Exception("Direktorat ini sudah memiliki admin_direktorat. Hanya boleh ada 1 admin per direktorat.");
                }
            }
        }
        return $data;
    }

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
