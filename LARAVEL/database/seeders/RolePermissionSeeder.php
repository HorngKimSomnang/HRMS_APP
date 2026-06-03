<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create Permissions
        $permissions = [
            'view dashboard',
            'manage companies',
            'manage branches',
            'manage departments',
            'manage employees',
            'manage attendance',
            'manage leaves',
            'manage payroll',
            'view reports',
            'check in',
            'check out',
            // Super Admin specific
            'manage admins',
            'manage roles',
            'configure settings',
            'view audit logs',
            'manage backups',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create Roles and Assign Created Permissions

        // Super Admin
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        // Super Admin gets all permissions
        $superAdminRole->givePermissionTo(Permission::all());

        // Admin (HR Manager)
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $adminRole->syncPermissions([
            'view dashboard',
            'manage companies',
            'manage branches',
            'manage departments',
            'manage employees',
            'manage attendance',
            'manage leaves',
            'manage payroll',
            'view reports',
        ]);

        // Employee
        $employeeRole = Role::firstOrCreate(['name' => 'Employee']);
        $employeeRole->syncPermissions([
            'check in',
            'check out',
            'view dashboard',
        ]);
    }
}
