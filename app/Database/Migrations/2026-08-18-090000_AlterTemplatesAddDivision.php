<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AlterTemplatesAddDivision extends Migration
{
    public function up()
    {
        $this->forge->addColumn('templates', [
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
        $this->forge->dropForeignKey('templates', 'templates_division_id_foreign');
        $this->forge->dropColumn('templates', 'division_id');
    }
}
