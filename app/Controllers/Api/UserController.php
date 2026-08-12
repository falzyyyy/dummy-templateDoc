<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\UserModel;

/**
 * UserController
 * 
 * Menangani manajemen user (CRUD) — hanya untuk Admin.
 * 
 * Endpoint:
 *   GET    /api/users      → List semua user
 *   POST   /api/users      → Tambah user baru
 *   PUT    /api/users/:id  → Edit user
 *   DELETE /api/users/:id  → Hapus user
 */
class UserController extends BaseController
{
    protected UserModel $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    /**
     * GET /api/users
     */
    public function index()
    {
        $users = $this->userModel
            ->select('id, name, email, role, is_active, created_at')
            ->orderBy('created_at', 'DESC')
            ->findAll();

        return $this->response->setJSON(['users' => $users]);
    }

    /**
     * POST /api/users
     */
    public function create()
    {
        $json = $this->request->getJSON(true);

        $rules = [
            'name'     => 'required|min_length[2]',
            'email'    => 'required|valid_email|is_unique[users.email]',
            'password' => 'required|min_length[6]',
            'role'     => 'required|in_list[admin,user]',
        ];

        if (!$this->validateData($json, $rules)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $id = $this->userModel->insert([
            'name'     => $json['name'],
            'email'    => $json['email'],
            'password' => $json['password'],
            'role'     => $json['role'],
        ]);

        $user = $this->userModel->select('id, name, email, role, is_active, created_at')->find($id);

        return $this->response->setStatusCode(201)
            ->setJSON(['message' => 'User berhasil ditambahkan.', 'user' => $user]);
    }

    /**
     * PUT /api/users/:id
     */
    public function update(int $id)
    {
        $user = $this->userModel->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'User tidak ditemukan.']);
        }

        $json = $this->request->getJSON(true);

        $updateData = [];
        if (isset($json['name']))      $updateData['name']      = $json['name'];
        if (isset($json['email']))     $updateData['email']     = $json['email'];
        if (isset($json['role']))      $updateData['role']      = $json['role'];
        if (isset($json['is_active'])) $updateData['is_active'] = $json['is_active'];
        if (!empty($json['password'])) $updateData['password']  = $json['password'];

        $this->userModel->update($id, $updateData);

        $updated = $this->userModel->select('id, name, email, role, is_active, created_at')->find($id);
        return $this->response->setJSON(['message' => 'User berhasil diupdate.', 'user' => $updated]);
    }

    /**
     * DELETE /api/users/:id
     */
    public function delete(int $id)
    {
        // Jangan bisa hapus diri sendiri
        if ($id == $this->request->userId) {
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Tidak bisa menghapus akun sendiri.']);
        }

        $user = $this->userModel->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'User tidak ditemukan.']);
        }

        $this->userModel->delete($id);
        return $this->response->setJSON(['message' => 'User berhasil dihapus.']);
    }
}
