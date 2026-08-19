<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddParentDocumentIdToDocuments extends Migration
{
    public function up()
    {
        $this->forge->addColumn('documents', [
            'parent_document_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'division_id'
            ]
        ]);

        $this->forge->addForeignKey('parent_document_id', 'documents', 'id', 'SET NULL', 'SET NULL');
    }

    public function down()
    {
        $this->forge->dropForeignKey('documents', 'documents_parent_document_id_foreign');
        $this->forge->dropColumn('documents', 'parent_document_id');
    }
}
