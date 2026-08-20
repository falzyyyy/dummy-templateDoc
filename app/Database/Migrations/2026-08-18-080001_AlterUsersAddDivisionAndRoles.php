<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AlterUsersAddDivisionAndRoles extends Migration
{
    public function up()
    {
        // 1. Modifikasi kolom role untuk menambah superadmin dan admin_direktorat
        // Dan mengubah defaultnya jika perlu. 'admin' lama biarkan dulu sementara atau ubah langsung?
        // Enum diubah. Tapi karena MySQL enum perlu definisi lengkap, kita berikan lengkap.
        // Kita simpan 'admin' agar tidak error kalau ada data lama, lalu update, lalu hapus 'admin'.
        // Cara paling aman: Ubah ENUM jadi mencakup semua.

        // Modifikasi lagi untuk membuang 'admin' dari ENUM
        $this->forge->modifyColumn('users', [
            'role' => [
                'type'       => 'ENUM',
                'constraint' => ['superadmin','admin','admin_dspi','admin_dspn','admin_dsmk','admin_dppn','admin_dtdi','admin_dhkm','admin_dmas','admin_dksr','admin_datn','admin_pmkh','admin_dapn','admin_dksa','admin_dimr','admin_dsps','admin_dops','admin_dpdu','user'],
                'default'    => 'user',
            ],
        ]);

        // 2. Tambahkan kolom division_id
        $this->forge->addColumn('users', [
            'division_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'directorate_id'
            ]
        ]);

        $this->forge->addForeignKey('division_id', 'divisions', 'id', 'SET NULL', 'SET NULL');
    }

    public function down()
    {
        $this->forge->dropForeignKey('users', 'users_division_id_foreign');
        $this->forge->dropColumn('users', 'division_id');

        $this->forge->modifyColumn('users', [
            'role' => [
                'type'       => 'ENUM',
                'constraint' => ['admin', 'superadmin', 'admin_direktorat', 'user'],
                'default'    => 'user',
            ],
        ]);
        $this->db->query("UPDATE users SET role = 'admin' WHERE role = 'superadmin'");
        
        $this->forge->modifyColumn('users', [
            'role' => [
                'type'       => 'ENUM',
                'constraint' => ['admin', 'user'],
                'default'    => 'user',
            ],
        ]);
    }
}
