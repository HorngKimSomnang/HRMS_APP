<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;

class CleanupCustomRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rbac:cleanup-custom-roles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Converts custom role permissions to direct permissions and removes custom roles.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting custom roles cleanup...');

        DB::transaction(function () {
            // Get all roles except 'Super Admin' and 'Employee'
            $customRoles = Role::whereNotIn('name', ['Super Admin', 'Employee'])->get();

            foreach ($customRoles as $role) {
                $this->info("Processing custom role: {$role->name}");

                $permissions = $role->permissions()->pluck('name')->toArray();

                // Find all users that have this role
                $users = User::role($role->name)->get();

                foreach ($users as $user) {
                    $this->info("  - Converting permissions for user: {$user->email}");

                    // Assign the role's permissions directly to the user
                    $user->givePermissionTo($permissions);

                    // Ensure the user has the 'Employee' role
                    if (!$user->hasRole('Employee') && !$user->hasRole('Super Admin')) {
                        $employeeRole = \App\Models\Role::where('name', 'Employee')->first();
                        $user->update(['role_id' => $employeeRole->id]);
                    }

                // Delete the custom role
                $role->delete();
                $this->info("Deleted role: {$role->name}");
            }

            // Also replace 'roles.revoke_team' with 'permissions.revoke_team' in existing direct permissions
            // or role permissions if applicable.
            $oldPerm = \Spatie\Permission\Models\Permission::where('name', 'roles.revoke_team')->first();
            if ($oldPerm) {
                $oldPerm->name = 'permissions.revoke_team';
                $oldPerm->save();
                $this->info("Renamed 'roles.revoke_team' to 'permissions.revoke_team'");
            }
        });

        $this->info('Cleanup completed successfully.');
    }
}
