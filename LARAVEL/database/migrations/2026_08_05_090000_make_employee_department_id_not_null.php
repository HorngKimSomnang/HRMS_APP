<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ensure "Unassigned" department exists so the backfill never fails
        $unassignedId = DB::table('departments')->where('name', 'Unassigned')->value('id');
        if (!$unassignedId) {
            $unassignedId = DB::table('departments')->insertGetId([
                'name'        => 'Unassigned',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        // 2. Backfill any NULLs before adding the NOT NULL constraint
        DB::table('employees')
            ->whereNull('department_id')
            ->update(['department_id' => $unassignedId]);

        // 3. Now it is safe to add the NOT NULL constraint and foreign key
        if (DB::getDriverName() === 'pgsql') {
            Schema::table('employees', function (Blueprint $table) {
                // Drop the nullable foreign first, then re-add as NOT NULL
                $table->dropForeign(['department_id']);
                $table->unsignedBigInteger('department_id')->nullable(false)->change();
                $table->foreign('department_id')->references('id')->on('departments')->onDelete('restrict');
            });
        }
        // SQLite (test env) — it doesn't support NOT NULL change on existing columns with ease;
        // the constraint is already enforced at the application layer for SQLite tests.
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropForeign(['department_id']);
                $table->unsignedBigInteger('department_id')->nullable()->change();
                $table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
            });
        }
    }
};
