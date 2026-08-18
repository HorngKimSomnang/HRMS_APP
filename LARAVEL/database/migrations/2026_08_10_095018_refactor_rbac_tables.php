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
        // 1. Rename Spatie tables to preserve them temporarily for data migration
        // Check if they exist (for migrate:fresh where Spatie migration is deleted)
        $hasSpatie = Schema::hasTable('roles');
        if ($hasSpatie) {
            Schema::rename('role_has_permissions', 'spatie_role_has_permissions');
            Schema::rename('model_has_permissions', 'spatie_model_has_permissions');
            Schema::rename('model_has_roles', 'spatie_model_has_roles');
            Schema::rename('permissions', 'spatie_permissions');
            Schema::rename('roles', 'spatie_roles');
        }

        // 2. Create new strict RBAC tables
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('feature');
            $table->string('action');
            $table->timestamps();
            
            $table->unique(['feature', 'action']);
        });

        Schema::create('role_has_permissions', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        // 3. Add columns to users table
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->constrained('roles')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
        });

        // 4. Data Migration
        $this->migrateDataUp();

        // 5. Cleanup
        Schema::dropIfExists('spatie_role_has_permissions');
        Schema::dropIfExists('spatie_model_has_permissions');
        Schema::dropIfExists('spatie_model_has_roles');
        Schema::dropIfExists('spatie_permissions');
        Schema::dropIfExists('spatie_roles');

        if (Schema::hasColumn('employees', 'department_id')) {
            // Drop foreign key first if it exists
            Schema::table('employees', function (Blueprint $table) {
                // Ignore errors if foreign key doesn't exist
                try { $table->dropForeign(['department_id']); } catch (\Exception $e) {}
                $table->dropColumn('department_id');
            });
        }
    }

    protected function migrateDataUp(): void
    {
        // Migrate roles and role assignments
        if (Schema::hasTable('spatie_roles')) {
            $spatieRoles = DB::table('spatie_roles')->get();
        } else {
            $spatieRoles = collect();
        }
        $fallbackRoleId = null;
        
        foreach ($spatieRoles as $spatieRole) {
            $roleId = DB::table('roles')->insertGetId([
                'name' => $spatieRole->name,
                'is_system' => ($spatieRole->name === 'Super Admin'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            if ($spatieRole->name === 'Employee') {
                $fallbackRoleId = $roleId;
            }
        }
        
        if (!$fallbackRoleId) {
            $fallbackRoleId = DB::table('roles')->insertGetId([
                'name' => 'Employee',
                'is_system' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Migrate users to their roles
        $users = DB::table('users')->get();
        $hasSpatieRoles = Schema::hasTable('spatie_model_has_roles');
        
        foreach ($users as $user) {
            if ($hasSpatieRoles) {
                $userRoles = DB::table('spatie_model_has_roles')
                    ->join('spatie_roles', 'spatie_roles.id', '=', 'spatie_model_has_roles.role_id')
                    ->where('model_id', $user->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->orderBy('spatie_roles.id', 'asc') // Arbitrary precedence: first role wins, Super Admin is usually ID 1
                    ->pluck('spatie_roles.name');
            } else {
                $userRoles = collect();
            }
                
            $assignedRoleId = $fallbackRoleId;
            
            if ($userRoles->isNotEmpty()) {
                // If they have Super Admin, it takes precedence
                $roleName = $userRoles->contains('Super Admin') ? 'Super Admin' : $userRoles->first();
                $foundRole = DB::table('roles')->where('name', $roleName)->first();
                if ($foundRole) {
                    $assignedRoleId = $foundRole->id;
                }
            }

            // Also find their department from employees table
            $employee = DB::table('employees')->where('user_id', $user->id)->first();
            $departmentId = $employee ? $employee->department_id : null;

            DB::table('users')->where('id', $user->id)->update([
                'role_id' => $assignedRoleId,
                'department_id' => $departmentId,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Rename new strict tables out of the way
        Schema::rename('role_has_permissions', 'new_role_has_permissions');
        Schema::rename('permissions', 'new_permissions');
        Schema::rename('roles', 'new_roles');

        // 2. Recreate Spatie tables
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('guard_name')->default('web');
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('guard_name')->default('web');
            $table->timestamps();
        });

        Schema::create('model_has_permissions', function (Blueprint $table) {
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->index(['model_id', 'model_type']);
            $table->primary(['permission_id', 'model_id', 'model_type']);
        });

        Schema::create('model_has_roles', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->index(['model_id', 'model_type']);
            $table->primary(['role_id', 'model_id', 'model_type']);
        });

        Schema::create('role_has_permissions', function (Blueprint $table) {
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->primary(['permission_id', 'role_id']);
        });

        // 3. Add department_id back to employees
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
        });
        
        // 4. Restore data
        $this->migrateDataDown();

        // 5. Drop new RBAC tables and user columns
        Schema::table('users', function (Blueprint $table) {
            try { $table->dropForeign(['role_id']); } catch (\Exception $e) {}
            try { $table->dropForeign(['department_id']); } catch (\Exception $e) {}
            $table->dropColumn(['role_id', 'department_id']);
        });

        Schema::dropIfExists('new_role_has_permissions');
        Schema::dropIfExists('new_permissions');
        Schema::dropIfExists('new_roles');
    }

    protected function migrateDataDown(): void
    {
        // Migrate roles back to Spatie
        $newRoles = DB::table('new_roles')->get();
        
        foreach ($newRoles as $newRole) {
            DB::table('roles')->insert([
                'id' => $newRole->id,
                'name' => $newRole->name,
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Migrate users to their roles and departments
        $users = DB::table('users')->get();
        foreach ($users as $user) {
            if ($user->role_id) {
                DB::table('model_has_roles')->insert([
                    'role_id' => $user->role_id,
                    'model_type' => 'App\\Models\\User',
                    'model_id' => $user->id,
                ]);
            }

            if ($user->department_id) {
                DB::table('employees')->where('user_id', $user->id)->update([
                    'department_id' => $user->department_id,
                ]);
            }
        }
    }
};
