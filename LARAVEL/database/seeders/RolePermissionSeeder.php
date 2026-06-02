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
            'view reports',
            'check in',
            'check out',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create Roles and Assign Created Permissions

        // Super Admin
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        // Super Admin gets all permissions
        $superAdminRole->givePermissionTo(Permission::all());

        // Admin (HR Manager)
        $adminRole = Role::create(['name' => 'Admin']);
        $adminRole->givePermissionTo([
            'view dashboard',
            'manage companies', // Maybe restricted?
            'manage branches', // Maybe restricted?
            'manage departments',
            'manage employees',
            'manage attendance',
            'manage leaves',
            'view reports',
        ]);

        // Employee
        $employeeRole = Role::create(['name' => 'Employee']);
        $employeeRole->givePermissionTo([
            'check in',
            'check out',
            'view dashboard', // maybe their own dashboard
        ]);
    }
}
