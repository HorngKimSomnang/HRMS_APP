<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
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

        // 3. Create Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
            ]
        );
        $adminRole = \App\Models\Role::where('name', 'Super Admin')->first();
        if ($adminRole) {
            $admin->update(['role_id' => $adminRole->id]);
        }

        // 4. Create Employee User
        $employeeUser = User::firstOrCreate(
            ['email' => 'employee@example.com'],
            [
                'name' => 'John Doe',
                'password' => Hash::make('password'),
            ]
        );
        $employeeRole = \App\Models\Role::where('name', 'Employee')->first();
        if ($employeeRole) {
            $employeeUser->update(['role_id' => $employeeRole->id]);
        }

        $department = \App\Models\Department::create([
            'name' => 'Administration',
        ]);

        $admin->update(['department_id' => $department->id]);
        $employeeUser->update(['department_id' => $department->id]);

        // Create an Employee record for the super admin user
        \App\Models\Employee::create([
            'user_id' => $admin->id,
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'employee_code' => 'EM001',
            'job_title' => 'System Administrator',
            'joining_date' => now(),
            'phone' => '1234567890',
            'address' => 'HQ',
            'gender' => 'Other',
            'dob' => '1990-01-01'
        ]);

        \App\Models\Contract::create([
            'employee_id' => $admin->employee->id,
            'type' => 'permanent',
            'salary' => 5000,
            'start_date' => now(),
            'status' => 'active',
            'position' => 'System Administrator',
            'created_by' => $admin->id,
        ]);

        // Create an Employee record for the staff user
        $staffEmployee = \App\Models\Employee::create([
            'user_id' => $employeeUser->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'employee_code' => 'EM002',
            'job_title' => 'Staff',
            'joining_date' => now(),
            'phone' => '0987654321',
            'address' => 'Phnom Penh',
            'gender' => 'Male',
            'dob' => '1995-06-15',
            'status' => 'active',
        ]);

        \App\Models\Contract::create([
            'employee_id' => $staffEmployee->id,
            'type' => 'permanent',
            'salary' => 800,
            'start_date' => now(),
            'status' => 'active',
            'position' => 'Staff',
            'created_by' => $admin->id,
        ]);
    }
}
