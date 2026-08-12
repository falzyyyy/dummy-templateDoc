<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\UserModel;

/**
 * AuthController
 * 
 * Menangani autentikasi: login, register, dan get current user.
 * 
 * Endpoint:
 *   POST /api/auth/login    → Login, return JWT token
 *   POST /api/auth/register → Register user baru (admin only)
 *   GET  /api/auth/me       → Get info user yang sedang login
 */
class AuthController extends BaseController
{
    protected UserModel $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
        helper('jwt');
    }

    /**
     * POST /api/auth/login
     * 
     * Body: { "email": "admin@docgen.com", "password": "password" }
     * Response: { "token": "eyJ...", "user": { "id": 1, "name": "Admin", ... } }
     * 
     * Alur:
     * 1. Terima email & password dari request body (JSON)
     * 2. Cari user di database berdasarkan email
     * 3. Bandingkan password dengan hash di database
     * 4. Kalau cocok, buat JWT token dan kirim ke client
     */
    public function login()
    {
        $json = $this->request->getJSON(true);

        $email    = $json['email'] ?? '';
        $password = $json['password'] ?? '';

        if (empty($email) || empty($password)) {
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Email dan password wajib diisi.']);
        }

        // Cari user berdasarkan email
        $user = $this->userModel->where('email', $email)->first();

        if (!$user) {
            return $this->response->setStatusCode(401)
                ->setJSON(['error' => 'Email atau password salah.']);
        }

        // Cek apakah akun aktif
        if (!$user['is_active']) {
            return $this->response->setStatusCode(403)
                ->setJSON(['error' => 'Akun Anda dinonaktifkan. Hubungi admin.']);
        }

        // Verifikasi password
        if (!$this->userModel->verifyPassword($password, $user['password'])) {
            return $this->response->setStatusCode(401)
                ->setJSON(['error' => 'Email atau password salah.']);
        }

        // Generate JWT token
        $token = generateJWT($user);

        // Return token + info user (tanpa password)
        unset($user['password']);
        return $this->response->setJSON([
            'message' => 'Login berhasil!',
            'token'   => $token,
            'user'    => $user,
        ]);
    }

    /**
     * POST /api/auth/register
     * 
     * Hanya admin yang bisa mendaftarkan user baru.
     * Body: { "name": "User Baru", "email": "user@mail.com", "password": "pass123", "role": "user" }
     */
    public function register()
    {
        $json = $this->request->getJSON(true);

        // Validasi input
        $rules = [
            'name'     => 'required|min_length[2]|max_length[100]',
            'email'    => 'required|valid_email|is_unique[users.email]',
            'password' => 'required|min_length[6]',
            'role'     => 'required|in_list[admin,user]',
        ];

        if (!$this->validateData($json, $rules)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $userId = $this->userModel->insert([
            'name'     => $json['name'],
            'email'    => $json['email'],
            'password' => $json['password'], // Auto-hashed oleh model
            'role'     => $json['role'],
        ]);

        $user = $this->userModel->find($userId);
        unset($user['password']);

        return $this->response->setStatusCode(201)
            ->setJSON(['message' => 'User berhasil dibuat.', 'user' => $user]);
    }

    /**
     * GET /api/auth/me
     * 
     * Return info user yang sedang login (dari JWT token).
     */
    public function me()
    {
        $user = $this->userModel->find($this->request->userId);

        if (!$user) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'User tidak ditemukan.']);
        }

        unset($user['password']);
        return $this->response->setJSON(['user' => $user]);
    }
}
