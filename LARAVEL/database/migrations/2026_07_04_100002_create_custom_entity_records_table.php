<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_entity_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('custom_entity_id')->constrained()->onDelete('cascade');
            $table->jsonb('data');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('custom_entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_entity_records');
    }
};
