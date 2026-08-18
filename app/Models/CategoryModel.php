<?php
namespace App\Models;
use CodeIgniter\Model;

class CategoryModel extends Model
{
    protected $table            = 'template_categories';
    protected $primaryKey       = 'id';
    protected $allowedFields    = ['name'];
    protected $useTimestamps    = true;
}
