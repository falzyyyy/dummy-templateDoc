<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTerbilangMappingToTemplateFields extends Migration
{
    public function up()
    {
        $fields = [
            'terbilang_target_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'default'    => null,
                'after'      => 'default_value',
            ],
            'is_auto_generated' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
                'after'      => 'terbilang_target_id',
            ],
        ];

        $this->forge->addColumn('template_fields', $fields);

        // Add foreign key and unique constraint
        $this->db->query('ALTER TABLE `template_fields` ADD CONSTRAINT `fk_terbilang_target` FOREIGN KEY (`terbilang_target_id`) REFERENCES `template_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');
        $this->db->query('ALTER TABLE `template_fields` ADD UNIQUE `unique_terbilang_target` (`terbilang_target_id`)');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE `template_fields` DROP FOREIGN KEY `fk_terbilang_target`');
        $this->db->query('ALTER TABLE `template_fields` DROP INDEX `unique_terbilang_target`');
        $this->forge->dropColumn('template_fields', ['terbilang_target_id', 'is_auto_generated']);
    }
}
