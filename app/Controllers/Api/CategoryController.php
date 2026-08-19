<?php
namespace App\Controllers\Api;
use CodeIgniter\RESTful\ResourceController;
use App\Models\CategoryModel;
use App\Models\TemplateModel;

class CategoryController extends ResourceController
{
    protected $categoryModel;
    protected $templateModel;

    public function __construct()
    {
        $this->categoryModel = new CategoryModel();
        $this->templateModel = new TemplateModel();
    }

    public function index()
    {
        $categories = $this->categoryModel->orderBy('name', 'ASC')->findAll();
        return $this->response->setJSON(['categories' => $categories]);
    }

    public function create()
    {
        if (!in_array($this->request->{'userRole'}, ['admin', 'superadmin', 'admin_direktorat'])) {
            return $this->response->setStatusCode(403)->setJSON(['error' => 'Akses ditolak.']);
        }
        
        $name = $this->request->getJSON()->name ?? '';
        if (empty(trim($name))) return $this->response->setStatusCode(400)->setJSON(['error' => 'Nama kategori wajib diisi.']);

        $id = $this->categoryModel->insert(['name' => $name]);
        return $this->response->setStatusCode(201)->setJSON(['message' => 'Kategori berhasil ditambahkan', 'id' => $id]);
    }

    public function update($id = null)
    {
        if (!in_array($this->request->{'userRole'}, ['admin', 'superadmin', 'admin_direktorat'])) return $this->response->setStatusCode(403);
        $name = $this->request->getJSON()->name ?? '';
        if (empty(trim($name))) return $this->response->setStatusCode(400)->setJSON(['error' => 'Nama kategori wajib diisi.']);
        
        $this->categoryModel->update($id, ['name' => $name]);
        return $this->response->setJSON(['message' => 'Kategori diperbarui']);
    }

    public function delete($id = null)
    {
        if (!in_array($this->request->{'userRole'}, ['admin', 'superadmin', 'admin_direktorat'])) return $this->response->setStatusCode(403);
        if ($id == 1) return $this->response->setStatusCode(400)->setJSON(['error' => 'Kategori default tidak bisa dihapus']);
        
        // Pindahkan template ke kategori 1
        $this->templateModel->where('category_id', $id)->set(['category_id' => 1])->update();
        $this->categoryModel->delete($id);
        
        return $this->response->setJSON(['message' => 'Kategori dihapus']);
    }
}
