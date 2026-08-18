<?php

/**
 * JWT Helper
 * 
 * JWT (JSON Web Token) adalah cara autentikasi untuk API.
 * Berbeda dengan session (yang disimpan di server), JWT disimpan di browser (localStorage).
 * 
 * Alur kerja:
 * 1. User login → server buat JWT token yang berisi data user (id, email, role)
 * 2. Token dikirim ke browser → disimpan di localStorage
 * 3. Setiap request ke API, browser kirim token di header: Authorization: Bearer xxx
 * 4. Server verifikasi token → kalau valid, lanjutkan request
 * 
 * Token punya expiry time (default 24 jam), setelah itu user harus login lagi.
 */

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Buat JWT token untuk user yang berhasil login.
 * Token berisi: user id, email, role, dan waktu expired.
 */
function generateJWT(array $user): string
{
    $key    = env('jwt.secret', 'default_secret_key');
    $expiry = (int) env('jwt.expiry', 86400); // Default 24 jam

    $payload = [
        'iss' => 'docgen',              // Issuer (siapa yang bikin token)
        'iat' => time(),                 // Issued at (waktu token dibuat)
        'exp' => time() + $expiry,       // Expiry (waktu token kadaluarsa)
        'uid' => $user['id'],            // User ID
        'email' => $user['email'],       // Email
        'role' => $user['role'],         // Role (admin/user)
        'directorate_id' => $user['directorate_id'] ?? null, // Directorate ID for scoped access
    ];

    return JWT::encode($payload, $key, 'HS256');
}

/**
 * Decode dan verifikasi JWT token.
 * Return data user dari token, atau null jika token invalid/expired.
 */
function validateJWT(string $token): ?object
{
    $key = env('jwt.secret', 'default_secret_key');

    try {
        return JWT::decode($token, new Key($key, 'HS256'));
    } catch (\Exception $e) {
        return null;
    }
}

/**
 * Ambil JWT token dari header Authorization.
 * Format header: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
 */
function getJWTFromRequest(): ?string
{
    $request = service('request');
    $header  = $request->getHeaderLine('Authorization');

    if (empty($header) || !str_starts_with($header, 'Bearer ')) {
        return null;
    }

    // Ambil token setelah "Bearer "
    return trim(substr($header, 7));
}
