<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AlterTemplatesAddDirectorate extends Migration
{
    public function up()
    {
        $this->forge->addColumn('templates', [
            'directorate_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'category_id'
            ]
        ]);

        $this->forge->addForeignKey('directorate_id', 'directorates', 'id', 'SET NULL', 'SET NULL');
    }

    public function down()
    {
        $this->forge->dropForeignKey('templates', 'templates_directorate_id_foreign');
        $this->forge->dropColumn('templates', 'directorate_id');
    }
}
