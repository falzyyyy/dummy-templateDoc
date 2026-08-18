<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;

class AlterTemplatesAddCategory extends Migration
{
    public function up()
    {
        $this->forge->addColumn('templates', [
            'category_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'default'    => 1,
                'after'      => 'slug'
            ],
        ]);
        $this->forge->addForeignKey('category_id', 'template_categories', 'id', 'CASCADE', 'RESTRICT');
    }

    public function down()
    {
        $this->forge->dropForeignKey('templates', 'templates_category_id_foreign');
        $this->forge->dropColumn('templates', 'category_id');
    }
}
