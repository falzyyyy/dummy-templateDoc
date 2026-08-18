<?php

namespace App\Controllers;

class MigrateController extends BaseController
{
    public function index()
    {
        try {
            $migrate = \Config\Services::migrations();
            $migrate->latest();
            return "Migrasi Database Berhasil Dijalankan via Web!";
        } catch (\Throwable $e) {
            return "Gagal migrasi: " . $e->getMessage() . " di baris " . $e->getLine();
        }
    }
}
