<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AlterUsersAddDirectorateAndPermissions extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'directorate_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'role'
            ],
            'permissions' => [
                'type' => 'TEXT', // JSON stored as TEXT for wider compatibility
                'null' => true,
                'after' => 'directorate_id'
            ]
        ]);

        $this->forge->addForeignKey('directorate_id', 'directorates', 'id', 'SET NULL', 'SET NULL');
    }

    public function down()
    {
        $this->forge->dropForeignKey('users', 'users_directorate_id_foreign');
        $this->forge->dropColumn('users', ['directorate_id', 'permissions']);
    }
}
