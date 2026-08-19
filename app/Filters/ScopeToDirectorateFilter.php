<?php

namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class ScopeToDirectorateFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $authHeader = $request->getServer('HTTP_AUTHORIZATION');
        if (!$authHeader) return;

        list($type, $token) = explode(' ', $authHeader, 2);
        if (strcasecmp($type, 'Bearer') == 0) {
            try {
                $key = env('jwt.secret', 'default_secret_key');
                $decoded = JWT::decode($token, new Key($key, 'HS256'));
                
                // Cek apakah rolenya admin_direktorat atau user
                if (isset($decoded->role) && in_array($decoded->role, ['admin_direktorat', 'user'])) {
                    $directorateId = $decoded->directorate_id ?? null;
                    if (!$directorateId) {
                        return \Config\Services::response()->setJSON(['error' => 'Akun tidak terikat ke direktorat manapun.'])->setStatusCode(403);
                    }
                    $_SERVER['SCOPED_DIRECTORATE_ID'] = $directorateId;

                    if ($decoded->role === 'user') {
                        $divisionId = $decoded->division_id ?? null;
                        if (!$divisionId) {
                            return \Config\Services::response()->setJSON(['error' => 'Akun user tidak terikat ke divisi manapun.'])->setStatusCode(403);
                        }
                        $_SERVER['SCOPED_DIVISION_ID'] = $divisionId;
                    }
                }
            } catch (\Exception $e) {
                // Biarkan auth filter yang mengurus validasi JWT utama
            }
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Do nothing
    }
}
