<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('permissions')
            ->where('feature', 'notice_board')
            ->where('action', 'publish')
            ->update(['action' => 'create']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('permissions')
            ->where('feature', 'notice_board')
            ->where('action', 'create')
            ->update(['action' => 'publish']);
    }
};
