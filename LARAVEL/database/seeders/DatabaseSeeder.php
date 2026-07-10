<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            RolePermissionSeeder::class,
            SettingSeeder::class,
            LeaveTypeSeeder::class,
        ]);

        $user = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'superadmin@gmail.com', // Updated to @gmail.com

            'password' => bcrypt('password'),
        ]);

        $user->assignRole('Super Admin');

        // Also create the test user for reference (optional, but good for backup)
        $testUser = User::factory()->create([
             'name' => 'Admin User',
             'email' => 'admin@gmail.com', // Updated to @gmail.com

             'password' => bcrypt('password'),
        ]);
        $testUser->assignRole('Admin');
        
        // Create an Employee record for the admin user so they can use leave/attendance features
        \App\Models\Employee::create([
            'user_id' => $testUser->id,
            'first_name' => 'Admin',
            'last_name' => 'User',
            // 'email' => $testUser->email, // Removed as column does not exist on employees
            'employee_code' => 'EMP001',
            'job_title' => 'Administrator',
            'joining_date' => now(),
            'phone' => '1234567890',
            'address' => 'Admin Address',
            'gender' => 'Other',
            'dob' => '1990-01-01',
            // 'salary' => 0, // Removed column
        ]);
    }
}
