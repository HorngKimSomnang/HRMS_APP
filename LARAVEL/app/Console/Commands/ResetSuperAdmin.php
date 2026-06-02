<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class ResetSuperAdmin extends Command
{
    protected $signature = 'admin:reset';
    protected $description = 'Reset or create the Super Admin user with email superadmin@henchen.com and password "password"';

    public function handle()
    {
        $email = 'superadmin@henchen.com';

        // Ensure Super Admin role exists
        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

        $user = User::where('email', $email)->first();

        if ($user) {
            $user->password = Hash::make('password');
            $user->save();
            $this->info("✅ Password reset for: {$email}");
        } else {
            $user = User::create([
                'name'     => 'Super Admin',
                'email'    => $email,
                'password' => Hash::make('password'),
            ]);
            $this->info("✅ User created: {$email}");
        }

        // Assign role if not already assigned
        if (!$user->hasRole('Super Admin')) {
            $user->assignRole('Super Admin');
            $this->info('✅ Role "Super Admin" assigned.');
        } else {
            $this->info('ℹ️  Role "Super Admin" already assigned.');
        }

        $this->info('');
        $this->info('Login credentials:');
        $this->info("  Email:    {$email}");
        $this->info('  Password: password');
    }
}
