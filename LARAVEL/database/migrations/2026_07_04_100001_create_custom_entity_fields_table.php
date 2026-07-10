<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_entity_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('custom_entity_id')->constrained()->onDelete('cascade');
            $table->string('key');
            $table->string('label');
            $table->string('type');
            $table->jsonb('options')->nullable();
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['custom_entity_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_entity_fields');
    }
};
