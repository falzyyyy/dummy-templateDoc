<?php

/**
 * ROUTES — Peta URL ke Controller
 * 
 * Semua API endpoint didefinisikan di sini.
 * Format: $routes->METHOD('url', 'Controller::method', ['filter' => 'namaFilter']);
 * 
 * Filter yang dipakai:
 * - 'jwt'   → harus login (token valid)
 * - 'admin' → harus login + role admin
 */

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

// =============================================
// AUTH — Tidak perlu login
// =============================================
$routes->post('api/auth/login', 'Api\AuthController::login');

// Route default / (Root) - Agar tidak 404 saat dibuka di browser
$routes->get('/', function() {
    return service('response')->setJSON([
        'status' => 'OK',
        'message' => 'DocGen API is running. Silakan buka http://localhost:5173 untuk mengakses Frontend UI.'
    ]);
});

// =============================================
// AUTH — Perlu login
// =============================================
$routes->group('api/auth', ['filter' => 'jwt'], function ($routes) {
    $routes->get('me', 'Api\AuthController::me');
});

// =============================================
// TEMPLATES — Perlu login
// =============================================
$routes->group('api/templates', ['filter' => 'jwt'], function ($routes) {
    $routes->get('/', 'Api\TemplateController::index');           // List semua
    $routes->get('(:segment)', 'Api\TemplateController::show/$1'); // Detail by slug
});

// TEMPLATES — Perlu admin
$routes->group('api/templates', ['filter' => 'admin'], function ($routes) {
    $routes->post('/', 'Api\TemplateController::create');                // Upload baru
    $routes->put('(:num)', 'Api\TemplateController::update/$1');         // Update info
    $routes->put('(:num)/fields', 'Api\TemplateController::updateFields/$1'); // Update fields
    $routes->delete('(:num)', 'Api\TemplateController::delete/$1');      // Hapus
});

// =============================================
// DOCUMENTS — Perlu login
// =============================================
$routes->group('api/documents', ['filter' => 'jwt'], function ($routes) {
    $routes->get('stats', 'Api\DocumentController::stats');               // Stats dashboard
    $routes->post('generate/(:segment)', 'Api\DocumentController::generate/$1'); // Generate
    $routes->get('/', 'Api\DocumentController::history');                  // Riwayat
    $routes->get('(:num)/download', 'Api\DocumentController::download/$1'); // Download
    $routes->delete('(:num)', 'Api\DocumentController::delete/$1');        // Hapus
});

// =============================================
// USERS — Perlu admin
// =============================================
$routes->group('api/users', ['filter' => 'admin'], function ($routes) {
    $routes->get('/', 'Api\UserController::index');
    $routes->post('/', 'Api\UserController::create');
    $routes->put('(:num)', 'Api\UserController::update/$1');
    $routes->delete('(:num)', 'Api\UserController::delete/$1');
});

// Register user baru (admin only)
$routes->post('api/auth/register', 'Api\AuthController::register', ['filter' => 'admin']);
