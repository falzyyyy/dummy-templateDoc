<?php

namespace App\Models;

use CodeIgniter\Model;

class DirectorateModel extends Model
{
    protected $table         = 'directorates';
    protected $primaryKey    = 'id';
    protected $allowedFields = ['name'];
    protected $useTimestamps = true;
}
