<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * JwtAuthFilter
 * 
 * Filter ini jalan SEBELUM controller di-execute.
 * Tugasnya: cek apakah request punya JWT token yang valid.
 * 
 * Kalau TIDAK ada token / token invalid → return 401 Unauthorized
 * Kalau VALID → lanjut ke controller, data user disimpan di request attribute
 * 
 * Cara pakai di Routes.php:
 *   $routes->get('/api/templates', 'TemplateController::index', ['filter' => 'jwt']);
 */
class JwtAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        helper('jwt');

        $token = getJWTFromRequest();

        if (!$token) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Token tidak ditemukan. Silakan login.']);
        }

        $decoded = validateJWT($token);

        if (!$decoded) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['error' => 'Token tidak valid atau sudah expired.']);
        }

        // Simpan data user ke request supaya bisa diakses di controller
        // Di controller: $this->request->userId, $this->request->userRole
        $request->userId   = $decoded->uid;
        $request->userEmail = $decoded->email;
        $request->userRole = $decoded->role;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Tidak perlu melakukan apa-apa setelah controller
    }
}
