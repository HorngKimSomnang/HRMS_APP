<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $departments = DB::table('employees')->whereNotNull('department')->pluck('department')->unique();
        foreach ($departments as $deptName) {
            if ($deptName) {
                DB::table('departments')->insertOrIgnore([
                    'name' => $deptName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        
        Schema::table('employees', function (Blueprint $table) {
            $table->unsignedBigInteger('department_id')->nullable();
        });

        $employees = DB::table('employees')->get();
        foreach ($employees as $emp) {
            if ($emp->department) {
                $dept = DB::table('departments')->where('name', $emp->department)->first();
                if ($dept) {
                    DB::table('employees')->where('id', $emp->id)->update(['department_id' => $dept->id]);
                }
            }
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
            $table->dropColumn('department');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('department')->nullable();
            $table->dropForeign(['department_id']);
            $table->dropColumn('department_id');
        });
    }
};