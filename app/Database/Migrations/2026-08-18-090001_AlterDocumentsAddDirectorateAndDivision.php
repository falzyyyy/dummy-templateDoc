<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AlterDocumentsAddDirectorateAndDivision extends Migration
{
    public function up()
    {
        $this->forge->addColumn('documents', [
            'directorate_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'user_id'
            ],
            'division_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'directorate_id'
            ]
        ]);

        $this->forge->addForeignKey('directorate_id', 'directorates', 'id', 'SET NULL', 'SET NULL');
        $this->forge->addForeignKey('division_id', 'divisions', 'id', 'SET NULL', 'SET NULL');
    }

    public function down()
    {
        $this->forge->dropForeignKey('documents', 'documents_directorate_id_foreign');
        $this->forge->dropForeignKey('documents', 'documents_division_id_foreign');
        $this->forge->dropColumn('documents', 'division_id');
        $this->forge->dropColumn('documents', 'directorate_id');
    }
}
