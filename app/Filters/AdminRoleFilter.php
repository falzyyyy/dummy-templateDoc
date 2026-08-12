<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * AdminRoleFilter
 * 
 * Filter tambahan yang berjalan SETELAH JwtAuthFilter.
 * Cek apakah user yang sudah login punya role 'admin'.
 * 
 * Dipakai untuk route-route yang hanya boleh diakses admin,
 * seperti upload template, kelola user, dll.
 * 
 * Cara pakai di Routes.php:
 *   $routes->post('/api/templates', 'TemplateController::create', ['filter' => 'admin']);
 */
class AdminRoleFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Pertama, jalankan JWT auth dulu
        helper('jwt');

        $token = getJWTFromRequest();
        if (!$token) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Token tidak ditemukan.']);
        }

        $decoded = validateJWT($token);
        if (!$decoded) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Token tidak valid.']);
        }

        // Cek role: harus admin
        if ($decoded->role !== 'admin') {
            return service('response')
                ->setStatusCode(403)
                ->setJSON(['error' => 'Akses ditolak. Hanya admin yang bisa mengakses fitur ini.']);
        }

        $request->userId    = $decoded->uid;
        $request->userEmail = $decoded->email;
        $request->userRole  = $decoded->role;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Tidak perlu
    }
}
