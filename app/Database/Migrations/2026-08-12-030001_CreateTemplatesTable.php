<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Migration: Tabel Templates
 * 
 * Menyimpan info template Word (.docx) yang diupload admin.
 * - file_path  = lokasi file .docx di server
 * - file_name  = nama file asli yang diupload
 * - slug       = URL-friendly identifier (auto-generate dari name)
 */
class CreateTemplatesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
            ],
            'slug' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
            ],
            'description' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'file_path' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
            ],
            'file_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
            ],
            'uploaded_by' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'is_active' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 1,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('slug');
        $this->forge->addForeignKey('uploaded_by', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('templates');
    }

    public function down()
    {
        $this->forge->dropTable('templates');
    }
}
