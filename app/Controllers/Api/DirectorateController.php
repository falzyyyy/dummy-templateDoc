<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\DirectorateModel;

class DirectorateController extends BaseController
{
    protected DirectorateModel $directorateModel;

    public function __construct()
    {
        $this->directorateModel = new DirectorateModel();
    }

    public function index()
    {
        $directorates = $this->directorateModel->orderBy('name', 'ASC')->findAll();
        return $this->response->setJSON(['directorates' => $directorates]);
    }

    public function create()
    {
        $json = $this->request->getJSON(true);

        if (empty($json['name'])) {
            return $this->response->setStatusCode(400)->setJSON(['error' => 'Nama direktorat wajib diisi.']);
        }

        $id = $this->directorateModel->insert(['name' => $json['name']]);
        $directorate = $this->directorateModel->find($id);

        return $this->response->setStatusCode(201)
            ->setJSON(['message' => 'Direktorat berhasil ditambahkan.', 'directorate' => $directorate]);
    }

    public function update(int $id)
    {
        $directorate = $this->directorateModel->find($id);
        if (!$directorate) {
            return $this->response->setStatusCode(404)->setJSON(['error' => 'Direktorat tidak ditemukan.']);
        }

        $json = $this->request->getJSON(true);
        if (isset($json['name'])) {
            $this->directorateModel->update($id, ['name' => $json['name']]);
        }

        return $this->response->setJSON([
            'message' => 'Direktorat berhasil diupdate.', 
            'directorate' => $this->directorateModel->find($id)
        ]);
    }

    public function delete(int $id)
    {
        if (!$this->directorateModel->find($id)) {
            return $this->response->setStatusCode(404)->setJSON(['error' => 'Direktorat tidak ditemukan.']);
        }

        // TODO: Handle logic if there are users/templates attached. For now, it will set null due to FK constraint.
        $this->directorateModel->delete($id);
        return $this->response->setJSON(['message' => 'Direktorat berhasil dihapus.']);
    }
}
