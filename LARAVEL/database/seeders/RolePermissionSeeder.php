<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use App\Models\Department;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // 0. Remove obsolete permissions
        Permission::where('feature', 'access_management')->delete();

        $features = [
            'departments' => ['view', 'create', 'edit', 'delete', 'view_employees'],
            'employees' => ['view', 'create', 'edit', 'delete', 'restore', 'resend_credentials', 'manage_access'],
            'attendance' => ['view'],
            'leaves' => ['view', 'edit', 'create', 'approve'],
            'tasks' => ['view', 'edit', 'delete', 'assign'],
            'documents' => ['view', 'upload', 'edit', 'delete'],
            'holidays' => ['view', 'create', 'edit', 'delete'],
            'contracts' => ['view', 'create', 'edit', 'delete', 'auto_activate'],
            'assets' => ['view', 'create', 'edit', 'delete', 'assign', 'return'],
            'overtime' => ['view', 'create', 'edit', 'delete', 'assign', 'approve', 'return'],
            'payroll' => ['view', 'edit', 'delete', 'generate', 'mark_paid'],
            'reports' => ['view'],
            'roles' => ['view', 'create', 'edit', 'delete', 'duplicate'],
            'shifts' => ['view', 'create', 'edit', 'delete'],
            'settings_general' => ['view', 'edit'],
            'settings_attendance' => ['view', 'edit'],
            'settings_leaves' => ['view', 'create', 'edit', 'delete'],
            'settings_payroll' => ['view', 'edit'],
            'settings_security' => ['view', 'edit'],
            'audit_logs' => ['view'],
            'dashboard' => ['view_total_employees', 'view_payroll', 'view_workforce_capacity', 'view_pending_approvals', 'view_expiring_contracts', 'view_open_offboardings', 'view_assets_in_use'],
            'notice_board' => ['view', 'create', 'edit', 'delete'],
            'admins' => ['view', 'manage'],
        ];

        // 1. Define Permissions
        $permissionIds = [];
        foreach ($features as $feature => $actions) {
            foreach ($actions as $action) {
                $perm = Permission::firstOrCreate([
                    'feature' => $feature,
                    'action' => $action,
                ]);
                $permissionIds[] = $perm->id;
            }
        }

        // 2. Create Roles and Assign Permissions

        // Super Admin (System Role)
        $superAdminRole = Role::firstOrCreate(
            ['name' => 'Super Admin'],
            ['is_system' => true, 'is_super_admin' => true]
        );
        $superAdminRole->update(['is_system' => true, 'is_super_admin' => true]); // Enforce if already existed

        // Self-healing: always re-sync ALL permissions to Super Admin
        $superAdminRole->permissions()->sync($permissionIds);

        // Employee
        $employeeRole = Role::firstOrCreate(
            ['name' => 'Employee'],
            ['is_system' => true]
        );
        $employeeRole->update(['is_system' => true]); // Enforce if already existed
        
        $employeePerms = Permission::where(function($query) {
            $query->whereIn('feature', ['attendance', 'leaves', 'overtime', 'tasks', 'documents', 'employees', 'payroll', 'assets'])
                  ->where('action', 'view')
                  ->orWhere('feature', 'overtime')->where('action', 'create')
                  ->orWhere('feature', 'leaves')->where('action', 'create')
                  ->orWhereIn('feature', ['notice_board', 'holidays', 'contracts'])->where('action', 'view')
                  ->orWhere('feature', 'settings_security')->whereIn('action', ['view', 'edit']);
        })->pluck('id');
            
        // Only seed default permissions on creation (prevents wiping manual grants)
        if ($employeeRole->wasRecentlyCreated) {
            $employeeRole->permissions()->sync($employeePerms);
        } else {
            // On re-seed, add the base permissions without removing manual grants
            $employeeRole->permissions()->syncWithoutDetaching($employeePerms);
        }

        // 3. Super Admin Data Scoping
        // Ensure all Super Admin users are assigned to all departments
        $allDepartmentIds = Department::pluck('id');
        if ($allDepartmentIds->isNotEmpty()) {
            User::where('role_id', $superAdminRole->id)->get()->each(function ($superAdmin) use ($allDepartmentIds) {
                $superAdmin->managedDepartments()->sync($allDepartmentIds);
            });
        }
    }
}
