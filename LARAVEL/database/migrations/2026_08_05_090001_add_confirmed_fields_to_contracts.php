<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            // Track who confirmed a pending contract and when
            $table->unsignedBigInteger('confirmed_by')->nullable()->after('created_by');
            $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
            $table->foreign('confirmed_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropForeign(['confirmed_by']);
            $table->dropColumn(['confirmed_by', 'confirmed_at']);
        });
    }
};
