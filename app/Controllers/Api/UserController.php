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
        $search   = $this->request->getGet('search');
        $sortBy   = $this->request->getGet('sort_by') ?? 'users.created_at';
        $sortDir  = $this->request->getGet('sort_dir') ?? 'DESC';
        $role     = $this->request->getGet('role');

        $query = $this->userModel
            ->select('users.id, users.name, users.email, users.role, users.is_active, users.created_at, users.directorate_id, users.division_id, users.permissions, directorates.name as directorate_name, divisions.name as division_name')
            ->join('directorates', 'directorates.id = users.directorate_id', 'left')
            ->join('divisions', 'divisions.id = users.division_id', 'left');

        if (!empty($search)) {
            $query->groupStart()
                  ->like('users.name', $search)
                  ->orLike('users.email', $search)
                  ->groupEnd();
        }

        if (!empty($role)) {
            $query->where('users.role', $role);
        }

        if (isset($_SERVER['SCOPED_DIRECTORATE_ID'])) {
            $query->where('users.directorate_id', $_SERVER['SCOPED_DIRECTORATE_ID']);
        }

        $allowedSorts = ['users.name', 'users.email', 'users.role', 'users.is_active', 'directorate_name', 'users.created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC');
        } else {
            $query->orderBy('users.created_at', 'DESC');
        }

        $users = $query->findAll();

        // Decode JSON permissions for frontend
        foreach ($users as &$user) {
            $user['permissions'] = $user['permissions'] ? json_decode($user['permissions'], true) : [];
        }

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
            'role'     => 'required|in_list[superadmin,admin,admin_dspi,admin_dspn,admin_dsmk,admin_dppn,admin_dtdi,admin_dhkm,admin_dmas,admin_dksr,admin_datn,admin_pmkh,admin_dapn,admin_dksa,admin_dimr,admin_dsps,admin_dops,admin_dpdu,user]',
        ];

        if (!$this->validateData($json, $rules)) {
            return $this->response->setStatusCode(422)
                ->setJSON(['errors' => $this->validator->getErrors()]);
        }

        // Proteksi scope: Jika admin_direktorat yang buat, paksa directorate_id-nya ke ID miliknya sendiri
        $directorateId = isset($_SERVER['SCOPED_DIRECTORATE_ID']) ? $_SERVER['SCOPED_DIRECTORATE_ID'] : ($json['directorate_id'] ?? null);
        
        $divisionId = $json['division_id'] ?? null;
        if ($divisionId && $directorateId) {
            $divModel = new \App\Models\DivisionModel();
            $div = $divModel->find($divisionId);
            if (!$div || $div['directorate_id'] != $directorateId) {
                return $this->response->setStatusCode(422)->setJSON(['errors' => ['division_id' => 'Divisi ini tidak ada di direktorat yang dipilih.']]);
            }
        }

        $data = [
            'name'           => $json['name'],
            'email'          => $json['email'],
            'password'       => $json['password'],
            'role'           => $json['role'],
            'directorate_id' => $directorateId,
            'division_id'    => $divisionId,
            'permissions'    => isset($json['permissions']) ? json_encode($json['permissions']) : null,
        ];

        try {
            $id = $this->userModel->insert($data);
        } catch (\Exception $e) {
            return $this->response->setStatusCode(400)->setJSON(['error' => $e->getMessage()]);
        }

        $user = $this->userModel->select('id, name, email, role, is_active, created_at, directorate_id, division_id, permissions')->find($id);
        $user['permissions'] = $user['permissions'] ? json_decode($user['permissions'], true) : [];

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
        
        // Proteksi scope admin_direktorat
        if (isset($_SERVER['SCOPED_DIRECTORATE_ID'])) {
            if ($user['directorate_id'] != $_SERVER['SCOPED_DIRECTORATE_ID']) {
                return $this->response->setStatusCode(403)->setJSON(['error' => 'Akses ditolak. User ini bukan dari direktorat Anda.']);
            }
            if (isset($updateData['directorate_id'])) {
                unset($updateData['directorate_id']); // Admin tidak boleh memindahkan user ke direktorat lain
            }
            if (isset($updateData['role']) && $updateData['role'] === 'superadmin') {
                return $this->response->setStatusCode(403)->setJSON(['error' => 'Anda tidak memiliki izin untuk menjadikan user sebagai superadmin.']);
            }
        }

        if (isset($json['directorate_id'])) $updateData['directorate_id'] = $json['directorate_id'];
        if (isset($json['division_id']))    $updateData['division_id']    = $json['division_id'];
        
        $directorateIdToCheck = $updateData['directorate_id'] ?? $user['directorate_id'];
        $divisionIdToCheck = $updateData['division_id'] ?? $user['division_id'];

        if ($divisionIdToCheck && $directorateIdToCheck) {
            $divModel = new \App\Models\DivisionModel();
            $div = $divModel->find($divisionIdToCheck);
            if (!$div || $div['directorate_id'] != $directorateIdToCheck) {
                return $this->response->setStatusCode(422)->setJSON(['errors' => ['division_id' => 'Divisi ini tidak ada di direktorat yang dipilih.']]);
            }
        }

        if (isset($json['permissions']))   $updateData['permissions']   = json_encode($json['permissions']);

        try {
            $this->userModel->update($id, $updateData);
        } catch (\Exception $e) {
            return $this->response->setStatusCode(400)->setJSON(['error' => $e->getMessage()]);
        }

        $updated = $this->userModel->select('id, name, email, role, is_active, created_at, directorate_id, permissions')->find($id);
        $updated['permissions'] = $updated['permissions'] ? json_decode($updated['permissions'], true) : [];
        
        return $this->response->setJSON(['message' => 'User berhasil diupdate.', 'user' => $updated]);
    }

    /**
     * DELETE /api/users/:id
     */
    public function delete(int $id)
    {
        // Jangan bisa hapus diri sendiri
        $currentUserId = $this->request->userId ?? null;
        if ($currentUserId && $id == $currentUserId) {
            return $this->response->setStatusCode(400)
                ->setJSON(['error' => 'Tidak bisa menghapus akun sendiri.']);
        }

        $user = $this->userModel->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)
                ->setJSON(['error' => 'User tidak ditemukan.']);
        }

        if (isset($_SERVER['SCOPED_DIRECTORATE_ID'])) {
            if ($user['directorate_id'] != $_SERVER['SCOPED_DIRECTORATE_ID']) {
                return $this->response->setStatusCode(403)->setJSON(['error' => 'Akses ditolak. User ini bukan dari direktorat Anda.']);
            }
        }

        $this->userModel->delete($id);
        return $this->response->setJSON(['message' => 'User berhasil dihapus.']);
    }
}
