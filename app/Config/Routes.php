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

$routes->get('migrate', 'MigrateController::index');

// =============================================
// AUTH — Perlu login
// =============================================
$routes->group('api/auth', ['filter' => 'jwt'], function ($routes) {
    $routes->get('me', 'Api\AuthController::me');
});

// =============================================
// TEMPLATES — Perlu login
// =============================================
$routes->group('api/templates', ['filter' => ['jwt', 'scope']], function ($routes) {
    $routes->get('/', 'Api\TemplateController::index');           // List semua
    $routes->get('(:segment)', 'Api\TemplateController::show/$1'); // Detail by slug
});

// TEMPLATES — Perlu admin atau permission upload_template
$routes->group('api/templates', ['filter' => ['admin:upload_template', 'scope']], function ($routes) {
    $routes->post('/', 'Api\TemplateController::create');                // Upload baru
    $routes->put('(:num)', 'Api\TemplateController::update/$1');         // Update info
    $routes->put('(:num)/fields', 'Api\TemplateController::updateFields/$1'); // Update fields
    $routes->delete('(:num)', 'Api\TemplateController::delete/$1');      // Hapus
});

// =============================================
// DOCUMENTS — Perlu login
// =============================================
$routes->group('api/documents', ['filter' => ['jwt', 'scope']], function ($routes) {
    $routes->get('stats', 'Api\DocumentController::stats');               // Stats dashboard
    $routes->post('generate/(:segment)', 'Api\DocumentController::generate/$1'); // Generate
    $routes->get('/', 'Api\DocumentController::history');                  // Riwayat
    $routes->get('(:num)/revision-data', 'Api\DocumentController::getRevisionData/$1'); // Data revisi
    $routes->get('(:num)/download', 'Api\DocumentController::download/$1'); // Download
    $routes->post('bulk-delete', 'Api\DocumentController::bulkDelete');    // Hapus massal
    $routes->delete('(:num)', 'Api\DocumentController::delete/$1');        // Hapus
});

// =============================================
// CATEGORIES — Perlu login & admin
// =============================================
$routes->group('api/categories', ['filter' => 'jwt'], function ($routes) {
    $routes->get('/', 'Api\CategoryController::index');
    $routes->post('/', 'Api\CategoryController::create', ['filter' => 'admin:manage_categories']);
    $routes->put('(:num)', 'Api\CategoryController::update/$1', ['filter' => 'admin:manage_categories']);
    $routes->delete('(:num)', 'Api\CategoryController::delete/$1', ['filter' => 'admin:manage_categories']);
});

// =============================================
// DIRECTORATES
// =============================================
$routes->group('api/directorates', ['filter' => 'jwt'], function ($routes) {
    $routes->get('/', 'Api\DirectorateController::index');
    $routes->post('/', 'Api\DirectorateController::create', ['filter' => 'admin:manage_directorates']);
    $routes->put('(:num)', 'Api\DirectorateController::update/$1', ['filter' => 'admin:manage_directorates']);
    $routes->delete('(:num)', 'Api\DirectorateController::delete/$1', ['filter' => 'admin:manage_directorates']);
});

// =============================================
// DIVISIONS
// =============================================
$routes->group('api/divisions', ['filter' => ['jwt', 'scope']], function ($routes) {
    $routes->get('/', 'Api\DivisionController::index');
    $routes->post('/', 'Api\DivisionController::create', ['filter' => 'admin:manage_divisions']);
    $routes->put('(:num)', 'Api\DivisionController::update/$1', ['filter' => 'admin:manage_divisions']);
    $routes->delete('(:num)', 'Api\DivisionController::delete/$1', ['filter' => 'admin:manage_divisions']);
});

// =============================================
// USERS
// =============================================
$routes->group('api/users', ['filter' => ['jwt', 'scope']], function ($routes) {
    $routes->get('/', 'Api\UserController::index');
    $routes->post('/', 'Api\UserController::create', ['filter' => 'admin:manage_users']);
    $routes->put('(:num)', 'Api\UserController::update/$1', ['filter' => 'admin:manage_users']);
    $routes->delete('(:num)', 'Api\UserController::delete/$1', ['filter' => 'admin:manage_users']);
});

// Register user baru (admin only)
$routes->post('api/auth/register', 'Api\AuthController::register', ['filter' => 'admin']);
