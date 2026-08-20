<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AlterTemplateFieldsAddCurrencyType extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('template_fields', [
            'field_type' => [
                'type'       => 'ENUM',
                'constraint' => ['text', 'textarea', 'richtext', 'date', 'number', 'image', 'currency'],
                'default'    => 'text',
            ]
        ]);

        $this->forge->addColumn('template_fields', [
            'information' => [
                'type'  => 'TEXT',
                'null'  => true,
                'after' => 'is_required'
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('template_fields', [
            'field_type' => [
                'type'       => 'ENUM',
                'constraint' => ['text', 'textarea', 'richtext', 'date', 'number', 'image'],
                'default'    => 'text',
            ]
        ]);

        $this->forge->dropColumn('template_fields', 'information');
    }
}
