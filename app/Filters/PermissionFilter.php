<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class PermissionFilter implements FilterInterface
{
    /**
     * Mengecek apakah user memiliki permission tertentu.
     * Permission dilewatkan sebagai argumen di routes.php.
     * Contoh: 'filter' => 'permission:upload_template'
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        // 1. Pastikan user sudah login (token valid)
        $authHeader = $request->getServer('HTTP_AUTHORIZATION');
        if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return \Config\Services::response()
                ->setStatusCode(401)
                ->setJSON(['error' => 'Akses ditolak. Token tidak ditemukan.']);
        }

        $token = $matches[1];
        try {
            $key = getenv('JWT_SECRET_KEY') ?: 'rahasia_negara_123!';
            $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($key, 'HS256'));
            
            // Simpan userId ke request agar bisa dipakai di Controller
            $request->userId = $decoded->uid;
            
            // 2. Ambil data user beserta permissions-nya
            $userModel = new \App\Models\UserModel();
            $user = $userModel->find($decoded->uid);

            if (!$user || !$user['is_active']) {
                return \Config\Services::response()
                    ->setStatusCode(403)
                    ->setJSON(['error' => 'Akun tidak aktif atau tidak ditemukan.']);
            }

            // Jika role = admin dan tidak ada directorate_id, anggap Super Admin (Bypass semua)
            if ($user['role'] === 'admin' && empty($user['directorate_id'])) {
                return; // Lolos
            }

            // 3. Cek Permission spesifik jika ada
            if ($arguments) {
                $userPermissions = $user['permissions'] ? json_decode($user['permissions'], true) : [];
                $hasAccess = false;

                foreach ($arguments as $requiredPermission) {
                    if (in_array($requiredPermission, $userPermissions)) {
                        $hasAccess = true;
                        break;
                    }
                }

                if (!$hasAccess) {
                    return \Config\Services::response()
                        ->setStatusCode(403)
                        ->setJSON(['error' => 'Akses ditolak. Anda tidak memiliki izin untuk fitur ini.']);
                }
            }

        } catch (\Exception $e) {
            return \Config\Services::response()
                ->setStatusCode(401)
                ->setJSON(['error' => 'Akses ditolak. Token tidak valid atau kadaluarsa.']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Do nothing
    }
}
