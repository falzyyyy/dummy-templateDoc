<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\DivisionModel;
use App\Models\UserModel;

class DivisionController extends ResourceController
{
    protected $modelName = 'App\Models\DivisionModel';
    protected $format    = 'json';

    public function index()
    {
        $directorateId = $this->request->getGet('directorate_id');
        $query = $this->model->select('divisions.*, directorates.name as directorate_name')
                             ->join('directorates', 'directorates.id = divisions.directorate_id', 'left');

        // Jika request memiliki filter scope dari middleware (misal admin_direktorat memanggil)
        if (isset($_SERVER['SCOPED_DIRECTORATE_ID'])) {
            $query->where('divisions.directorate_id', $_SERVER['SCOPED_DIRECTORATE_ID']);
        } elseif ($directorateId) {
            $query->where('divisions.directorate_id', $directorateId);
        }

        $divisions = $query->findAll();
        return $this->respond($divisions);
    }

    public function show($id = null)
    {
        $division = $this->model->find($id);
        if (!$division) return $this->failNotFound('Divisi tidak ditemukan');

        // Proteksi scope
        if (isset($_SERVER['SCOPED_DIRECTORATE_ID']) && $division['directorate_id'] != $_SERVER['SCOPED_DIRECTORATE_ID']) {
            return $this->failForbidden('Akses ke divisi ini ditolak.');
        }

        return $this->respond($division);
    }

    public function create()
    {
        // Hanya superadmin yang boleh create
        if (isset($_SERVER['SCOPED_DIRECTORATE_ID'])) {
            return $this->failForbidden('Hanya superadmin yang dapat membuat divisi baru.');
        }

        $data = $this->request->getJSON(true);
        if ($this->model->insert($data)) {
            $data['id'] = $this->model->getInsertID();
            return $this->respondCreated($data);
        }
        return $this->failValidationErrors($this->model->errors());
    }

    public function update($id = null)
    {
        if (isset($_SERVER['SCOPED_DIRECTORATE_ID'])) {
            return $this->failForbidden('Hanya superadmin yang dapat mengubah divisi.');
        }

        $data = $this->request->getJSON(true);
        if ($this->model->update($id, $data)) {
            return $this->respond(['message' => 'Divisi berhasil diupdate']);
        }
        return $this->failValidationErrors($this->model->errors());
    }

    public function delete($id = null)
    {
        if (isset($_SERVER['SCOPED_DIRECTORATE_ID'])) {
            return $this->failForbidden('Hanya superadmin yang dapat menghapus divisi.');
        }

        $division = $this->model->find($id);
        if (!$division) return $this->failNotFound('Divisi tidak ditemukan');

        // Validasi: Tolak penghapusan jika masih ada user di divisi ini
        $userModel = new UserModel();
        $userCount = $userModel->where('division_id', $id)->countAllResults();
        
        if ($userCount > 0) {
            return $this->fail("Gagal menghapus divisi. Masih ada $userCount user yang terdaftar di divisi ini. Pindahkan user terlebih dahulu.", 400);
        }

        $this->model->delete($id);
        return $this->respondDeleted(['message' => 'Divisi berhasil dihapus']);
    }
}
