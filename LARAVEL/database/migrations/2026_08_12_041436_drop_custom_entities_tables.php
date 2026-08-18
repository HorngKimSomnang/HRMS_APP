<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('custom_entity_records');
        Schema::dropIfExists('custom_entity_fields');
        Schema::dropIfExists('custom_entities');
    }

    public function down(): void
    {
        Schema::create('custom_entities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

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
};
