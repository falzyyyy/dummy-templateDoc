<?php

namespace App\Controllers\Api;

trait ApiResponseTrait
{
    /**
     * Format respons sukses standar.
     */
    protected function respondSuccess($data = null, string $message = 'Success', int $statusCode = 200)
    {
        $response = [
            'status'  => 'success',
            'message' => $message,
        ];

        // Hanya masukkan key data jika tidak null, atau gabungkan secara dinamis jika butuh
        // Biasanya React frontend mengharapkan data di root response atau di dalam key 'data'
        // Untuk menjaga kompatibilitas dengan frontend yang sudah ada, kita merge data ke root
        if ($data !== null) {
            if (is_array($data)) {
                $response = array_merge($response, $data);
            } else {
                $response['data'] = $data;
            }
        }

        return service('response')->setStatusCode($statusCode)->setJSON($response);
    }

    /**
     * Format respons error standar.
     */
    protected function respondError(string $message, int $statusCode = 400, $errors = null)
    {
        $response = [
            'status'  => 'error',
            'error' => $message, // Menggunakan key 'error' untuk kompatibilitas frontend saat ini
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return service('response')->setStatusCode($statusCode)->setJSON($response);
    }

    /**
     * Format respons Not Found (404).
     */
    protected function respondNotFound(string $message = 'Data tidak ditemukan.')
    {
        return $this->respondError($message, 404);
    }

    /**
     * Format respons Unauthorized / Forbidden (401/403).
     */
    protected function respondUnauthorized(string $message = 'Akses ditolak.')
    {
        return $this->respondError($message, 403);
    }
}
