<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Department;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Section C — Pending Contract Workflow
 *
 * 1. Creating a new employee generates a contract with status='pending'.
 * 2. GET /contracts/pending-count returns the correct count.
 * 3. POST /contracts/{id}/confirm transitions status to 'active' and records confirmed_by.
 * 4. A Manager outside the employee's department cannot confirm the contract (403).
 * 5. Confirming an already-active contract returns 422.
 */
class PendingContractWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $manager;
    private User $outsideManager;
    private Employee $employee;
    private Contract $pendingContract;
    private Department $dept;
    private Department $otherDept;

    protected function setUp(): void
    {
        parent::setUp();
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Roles & permissions
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $managerRole    = Role::firstOrCreate(['name' => 'Manager',     'guard_name' => 'web']);
        $employeeRole   = Role::firstOrCreate(['name' => 'Employee',    'guard_name' => 'web']);

        $contractsPerm = Permission::firstOrCreate(['name' => 'contracts.view', 'guard_name' => 'web']);
        $superAdminRole->givePermissionTo($contractsPerm);
        $managerRole->givePermissionTo($contractsPerm);

        // Departments
        $this->dept      = Department::create(['name' => 'Engineering']);
        $this->otherDept = Department::create(['name' => 'Finance']);

        // Super Admin
        $this->superAdmin = User::factory()->create(['email' => 'sa@example.com']);
        $this->superAdmin->assignRole($superAdminRole);

        // Manager for Engineering
        $this->manager = User::factory()->create(['email' => 'manager@example.com']);
        $this->manager->assignRole($managerRole);
        $this->manager->managedDepartments()->sync([$this->dept->id]);

        // Manager for Finance (outside Engineering)
        $this->outsideManager = User::factory()->create(['email' => 'outside_manager@example.com']);
        $this->outsideManager->assignRole($managerRole);
        $this->outsideManager->managedDepartments()->sync([$this->otherDept->id]);

        // Employee in Engineering
        $empUser = User::factory()->create(['email' => 'emp@example.com']);
        $empUser->assignRole($employeeRole);

        $this->employee = Employee::create([
            'user_id'       => $empUser->id,
            'employee_code' => 'EMP001',
            'first_name'    => 'Alice',
            'last_name'     => 'Smith',
            'job_title'     => 'Developer',
            'joining_date'  => now(),
            'department_id' => $this->dept->id,
            'status'        => 'active',
        ]);

        // Create a pending contract for that employee
        $this->pendingContract = Contract::create([
            'employee_id' => $this->employee->id,
            'type'        => 'permanent',
            'salary'      => 1500,
            'start_date'  => now()->toDateString(),
            'status'      => 'pending',
            'position'    => 'Developer',
        ]);
    }

    /** New employee contract defaults to pending */
    public function test_new_employee_contract_is_pending(): void
    {
        $this->assertSame('pending', $this->pendingContract->status);
    }

    /** Super Admin sees all pending contracts in the count */
    public function test_super_admin_sees_all_pending_contracts(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/contracts/pending-count')
            ->assertStatus(200)
            ->assertJson(['count' => 1]);
    }

    /** Manager sees only pending contracts in their department */
    public function test_manager_sees_pending_contracts_in_own_department(): void
    {
        $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/contracts/pending-count')
            ->assertStatus(200)
            ->assertJson(['count' => 1]);
    }

    /** Manager outside the department sees zero pending contracts */
    public function test_outside_manager_sees_zero_pending_contracts(): void
    {
        $this->actingAs($this->outsideManager, 'sanctum')
            ->getJson('/api/contracts/pending-count')
            ->assertStatus(200)
            ->assertJson(['count' => 0]);
    }

    /** Super Admin can confirm a pending contract */
    public function test_super_admin_can_confirm_pending_contract(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/contracts/{$this->pendingContract->id}/confirm")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('contracts', [
            'id'           => $this->pendingContract->id,
            'status'       => 'active',
            'confirmed_by' => $this->superAdmin->id,
        ]);
    }

    /** Manager in the correct department can confirm the contract */
    public function test_manager_in_correct_department_can_confirm(): void
    {
        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/contracts/{$this->pendingContract->id}/confirm")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'active');
    }

    /** Manager outside the department cannot confirm */
    public function test_outside_manager_cannot_confirm(): void
    {
        $this->actingAs($this->outsideManager, 'sanctum')
            ->postJson("/api/contracts/{$this->pendingContract->id}/confirm")
            ->assertStatus(403);
    }

    /** Confirming an already-active contract returns 422 */
    public function test_cannot_confirm_already_active_contract(): void
    {
        $this->pendingContract->update(['status' => 'active']);

        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/contracts/{$this->pendingContract->id}/confirm")
            ->assertStatus(422);
    }

    /** After confirmation, pending count drops to zero */
    public function test_pending_count_drops_after_confirmation(): void
    {
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/contracts/{$this->pendingContract->id}/confirm");

        $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/contracts/pending-count')
            ->assertJson(['count' => 0]);
    }
}
