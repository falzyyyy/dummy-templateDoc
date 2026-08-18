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
                
                // Cek apakah rolenya admin_direktorat
                if (isset($decoded->role) && $decoded->role === 'admin_direktorat') {
                    $directorateId = $decoded->directorate_id ?? null;
                    if (!$directorateId) {
                        return \Config\Services::response()->setJSON(['error' => 'Admin tidak terikat ke direktorat manapun.'])->setStatusCode(403);
                    }
                    
                    // Simpan data directorate_id ini di global scope atau request
                    // Karena CI4 request GET/POST tidak bisa diubah langsung secara elegan,
                    // kita akan menggunakan $_SERVER variables sebagai cara meneruskan konteks ke Controller
                    $_SERVER['SCOPED_DIRECTORATE_ID'] = $directorateId;
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
