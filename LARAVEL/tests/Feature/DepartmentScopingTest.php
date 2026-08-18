<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Section B — Department Scoping Rules
 *
 * 1. Super Admin can view/edit ANY employee.
 * 2. A Manager (managedDepartments) can view/edit ONLY employees in their own department(s).
 * 3. Nobody except Super Admin can view/edit a Super Admin's own employee record.
 */
class DepartmentScopingTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $manager;
    private User $outsideEmployee;
    private User $ownDeptEmployee;
    private Department $managedDept;
    private Department $otherDept;

    protected function setUp(): void
    {
        parent::setUp();
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Roles
        $superAdminRole   = Role::firstOrCreate(['name' => 'Super Admin',  'guard_name' => 'web']);
        $managerRole      = Role::firstOrCreate(['name' => 'Manager',      'guard_name' => 'web']);
        $employeeRole     = Role::firstOrCreate(['name' => 'Employee',     'guard_name' => 'web']);

        $employeesViewPerm = Permission::firstOrCreate(['name' => 'employees.view', 'guard_name' => 'web']);
        // Both Super Admin and Manager need employees.view to pass the route middleware.
        // The authorizeEmployeeAccess() helper then enforces the department scoping on top.
        $superAdminRole->syncPermissions([$employeesViewPerm]);
        $managerRole->givePermissionTo($employeesViewPerm);

        // Departments
        $this->managedDept = Department::create(['name' => 'Engineering']);
        $this->otherDept   = Department::create(['name' => 'Finance']);

        // Super Admin user
        $this->superAdmin = User::factory()->create(['email' => 'sa@example.com']);
        $this->superAdmin->assignRole($superAdminRole);
        Employee::create([
            'user_id'       => $this->superAdmin->id,
            'employee_code' => 'SA001',
            'first_name'    => 'Super',
            'last_name'     => 'Admin',
            'job_title'     => 'CEO',
            'joining_date'  => now(),
            'department_id' => $this->managedDept->id,
            'status'        => 'active',
        ]);

        // Manager user — manages Engineering
        $this->manager = User::factory()->create(['email' => 'manager@example.com']);
        $this->manager->assignRole($managerRole);
        $managerEmp = Employee::create([
            'user_id'       => $this->manager->id,
            'employee_code' => 'MGR001',
            'first_name'    => 'Jane',
            'last_name'     => 'Manager',
            'job_title'     => 'Engineering Lead',
            'joining_date'  => now(),
            'department_id' => $this->managedDept->id,
            'status'        => 'active',
        ]);
        // Assign department management
        $this->manager->managedDepartments()->sync([$this->managedDept->id]);

        // Employee in the managed department
        $ownUser = User::factory()->create(['email' => 'own@example.com']);
        $ownUser->assignRole($employeeRole);
        $this->ownDeptEmployee = $ownUser;
        Employee::create([
            'user_id'       => $ownUser->id,
            'employee_code' => 'EMP001',
            'first_name'    => 'Alice',
            'last_name'     => 'Own',
            'job_title'     => 'Developer',
            'joining_date'  => now(),
            'department_id' => $this->managedDept->id,
            'status'        => 'active',
        ]);

        // Employee in the OTHER department (outside manager's scope)
        $outsideUser = User::factory()->create(['email' => 'outside@example.com']);
        $outsideUser->assignRole($employeeRole);
        $this->outsideEmployee = $outsideUser;
        Employee::create([
            'user_id'       => $outsideUser->id,
            'employee_code' => 'EMP002',
            'first_name'    => 'Bob',
            'last_name'     => 'Outside',
            'job_title'     => 'Accountant',
            'joining_date'  => now(),
            'department_id' => $this->otherDept->id,
            'status'        => 'active',
        ]);
    }

    /** Super Admin may view any employee including employees from any department */
    public function test_super_admin_can_view_any_employee(): void
    {
        $outside = $this->outsideEmployee->employee;

        $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/employees/{$outside->id}")
            ->assertStatus(200);
    }

    /** Manager can view an employee in their own managed department */
    public function test_manager_can_view_employee_in_own_department(): void
    {
        $own = $this->ownDeptEmployee->employee;

        $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/employees/{$own->id}")
            ->assertStatus(200);
    }

    /** Manager is blocked from viewing an employee in a different department */
    public function test_manager_cannot_view_employee_outside_department(): void
    {
        $outside = $this->outsideEmployee->employee;

        $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/employees/{$outside->id}")
            ->assertStatus(403);
    }

    /** Nobody except Super Admin can view/edit the Super Admin's own employee record */
    public function test_manager_cannot_view_super_admin_employee_record(): void
    {
        $saEmployee = $this->superAdmin->employee;

        $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/employees/{$saEmployee->id}")
            ->assertStatus(403);
    }

    /** Super Admin can view their own record */
    public function test_super_admin_can_view_own_record(): void
    {
        $saEmployee = $this->superAdmin->employee;

        $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/employees/{$saEmployee->id}")
            ->assertStatus(200);
    }

    /** Department headcount includes assigned managers without double-counting */
    public function test_department_headcount_includes_managers_uniquely(): void
    {
        // managedDept (Engineering) has: manager (Jane), Super Admin, ownDeptEmployee (Alice)
        // manager (Jane) is both an employee in Engineering and manager of Engineering -> counted ONCE
        $resManaged = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/departments")
            ->assertStatus(200)
            ->json();

        $managedData = collect($resManaged)->firstWhere('id', $this->managedDept->id);
        // SA (1) + Manager (1) + Alice (1) = 3
        $this->assertEquals(3, $managedData['employees_count']);

        // Assign manager (Jane) as manager of otherDept (Finance)
        // Jane's employee record is in Engineering, but she manages Finance -> Finance gets headcount 1 (Jane) + 1 (Bob) = 2
        $this->manager->managedDepartments()->sync([$this->managedDept->id, $this->otherDept->id]);

        $resUpdated = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/departments")
            ->assertStatus(200)
            ->json();

        $otherData = collect($resUpdated)->firstWhere('id', $this->otherDept->id);
        // Bob (1) + Manager Jane (1) = 2
        $this->assertEquals(2, $otherData['employees_count']);
    }
}
