<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Migration: Tabel Template Fields
 * 
 * Menyimpan daftar placeholder yang terdeteksi dari file Word.
 * 
 * Contoh: Template "Surat Tugas" punya placeholder:
 *   {{Nomor Surat}}  → field_key = "Nomor Surat",  field_type = "text"
 *   {{Tanggal}}       → field_key = "Tanggal",       field_type = "date"
 *   {{Isi Tugas}}     → field_key = "Isi Tugas",     field_type = "textarea"
 * 
 * - field_key   = teks asli di dalam {{ }} di Word
 * - field_label = label yang ditampilkan di form (default = field_key)
 * - field_type  = tipe input HTML (text, textarea, date, number)
 * - field_order = urutan tampil di form (bisa diatur admin)
 */
class CreateTemplateFieldsTable extends Migration
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
            'template_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'field_key' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'comment'    => 'Placeholder text from Word (without {{ }})',
            ],
            'field_label' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'comment'    => 'Display label in form',
            ],
            'field_type' => [
                'type'       => 'ENUM',
                'constraint' => ['text', 'textarea', 'date', 'number', 'image'],
                'default'    => 'text',
            ],
            'field_order' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 0,
            ],
            'is_required' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 1,
            ],
            'default_value' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('template_id', 'templates', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('template_fields');
    }

    public function down()
    {
        $this->forge->dropTable('template_fields');
    }
}
