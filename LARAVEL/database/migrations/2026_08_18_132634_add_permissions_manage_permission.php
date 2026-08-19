<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Permission;
use App\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permission = Permission::firstOrCreate([
            'feature' => 'permissions',
            'action' => 'manage'
        ]);

        $role = Role::where('name', 'Super Admin')->first();
        if ($role && !$role->permissions()->where('permissions.id', $permission->id)->exists()) {
            $role->permissions()->attach($permission->id);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permission = Permission::where('feature', 'permissions')
                                ->where('action', 'manage')
                                ->first();
        if ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};
