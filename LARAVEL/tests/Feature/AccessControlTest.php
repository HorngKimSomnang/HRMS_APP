<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use Spatie\Permission\Models\Permission;

/**
 * Access Control Tests
 *
 * Tests the permission system using the canonical {feature}.{action} names.
 * Old granular permissions (employee.view_all, attendance.view_own, etc.)
 * were removed in the 2026_08_04_200000 migration cleanup.
 */
class AccessControlTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        // Clear Spatie permission cache between tests
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function test_user_can_be_assigned_role()
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        $this->assertTrue($user->hasRole('Super Admin'));
    }

    public function test_super_admin_bypasses_permission_checks()
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        // Super Admin gets wildcard access via the Gate::before() hook in AppServiceProvider
        $this->assertTrue($user->can('employees.view'));
        $this->assertTrue($user->can('payroll.view'));
        $this->assertTrue($user->can('audit_logs.view'));
    }

    public function test_user_with_direct_permission_can_view_feature()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('attendance.view');

        $this->assertTrue($user->can('attendance.view'));
        $this->assertFalse($user->can('employees.view'));
        $this->assertFalse($user->can('payroll.view'));
    }

    public function test_user_with_view_cannot_edit_without_edit_permission()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('leaves.view');

        $this->assertTrue($user->can('leaves.view'));
        $this->assertFalse($user->can('leaves.edit'));
        $this->assertFalse($user->can('leaves.delete'));
    }

    public function test_user_with_edit_has_edit_not_delete()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('tasks.edit');

        $this->assertTrue($user->can('tasks.edit'));
        $this->assertFalse($user->can('tasks.delete'));
    }

    public function test_system_permissions_exist_in_db()
    {
        $this->assertDatabaseHas('permissions', ['name' => 'roles.manage']);
        $this->assertDatabaseHas('permissions', ['name' => 'settings.manage']);
        $this->assertDatabaseHas('permissions', ['name' => 'audit_logs.view']);
        $this->assertDatabaseHas('permissions', ['name' => 'departments.view']);
        $this->assertDatabaseHas('permissions', ['name' => 'permissions.revoke_team']);
    }

    public function test_old_orphaned_permissions_no_longer_exist()
    {
        $this->assertDatabaseMissing('permissions', ['name' => 'employee.view_all']);
        $this->assertDatabaseMissing('permissions', ['name' => 'attendance.view_own']);
        $this->assertDatabaseMissing('permissions', ['name' => 'role.manage']);
        $this->assertDatabaseMissing('permissions', ['name' => 'setting.manage']);
        $this->assertDatabaseMissing('permissions', ['name' => 'roles.revoke_team']);
    }

    public function test_all_canonical_permissions_exist()
    {
        $features = ['employees', 'contracts', 'assets', 'holidays', 'attendance',
                     'leaves', 'overtime', 'documents', 'tasks', 'payroll', 'reports', 'departments'];
        $actions = ['view', 'edit', 'delete'];

        foreach ($features as $feature) {
            foreach ($actions as $action) {
                $permName = "{$feature}.{$action}";
                $exists = \Spatie\Permission\Models\Permission::where('name', $permName)->exists();
                $this->assertTrue($exists, "Missing canonical permission: {$permName}");
            }
        }
    }
}
