<?php
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(__DIR__ . '/../');
require 'vendor/autoload.php';
require 'system/bootstrap.php';

$migrate = \Config\Services::migrations();
try {
    $migrate->latest();
    echo "Migrations ran successfully!";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage();
}
