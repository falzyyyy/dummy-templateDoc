<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AlterTemplateFieldsAddRichtextType extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('template_fields', [
            'field_type' => [
                'type'       => 'ENUM',
                'constraint' => ['text', 'textarea', 'richtext', 'date', 'number', 'image'],
                'default'    => 'text',
            ]
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('template_fields', [
            'field_type' => [
                'type'       => 'ENUM',
                'constraint' => ['text', 'textarea', 'date', 'number', 'image'],
                'default'    => 'text',
            ]
        ]);
    }
}
