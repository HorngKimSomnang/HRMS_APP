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
        Schema::create('user_role_departments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_role_id');
            $table->unsignedBigInteger('department_id');
            $table->timestamps();

            $table->foreign('user_role_id')->references('id')->on('user_roles')->onDelete('cascade');
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('cascade');
            $table->unique(['user_role_id', 'department_id']);
        });

        // Migrate existing data
        $managers = \Illuminate\Support\Facades\DB::table('department_manager')->get();
        foreach ($managers as $manager) {
            $userRoles = \Illuminate\Support\Facades\DB::table('user_roles')
                ->join('roles', 'user_roles.role_id', '=', 'roles.id')
                ->where('user_roles.user_id', $manager->user_id)
                ->whereNotIn('roles.name', ['Employee', 'Super Admin'])
                ->select('user_roles.id as user_role_id')
                ->get();

            if ($userRoles->count() === 1) {
                \Illuminate\Support\Facades\DB::table('user_role_departments')->insertOrIgnore([
                    'user_role_id' => $userRoles->first()->user_role_id,
                    'department_id' => $manager->department_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else if ($userRoles->count() > 1) {
                \Illuminate\Support\Facades\Log::warning("Skipped migrating departments for user_id {$manager->user_id} due to multiple non-system roles.");
            }
        }

        Schema::dropIfExists('department_manager');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('department_manager', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('department_id');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('cascade');
            $table->unique(['user_id', 'department_id']);
        });

        // Migrate data back
        $userRoleDepartments = \Illuminate\Support\Facades\DB::table('user_role_departments')->get();
        foreach ($userRoleDepartments as $urd) {
            $userId = \Illuminate\Support\Facades\DB::table('user_roles')
                ->where('id', $urd->user_role_id)
                ->value('user_id');

            if ($userId) {
                \Illuminate\Support\Facades\DB::table('department_manager')->insertOrIgnore([
                    'user_id' => $userId,
                    'department_id' => $urd->department_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::dropIfExists('user_role_departments');
    }
};
