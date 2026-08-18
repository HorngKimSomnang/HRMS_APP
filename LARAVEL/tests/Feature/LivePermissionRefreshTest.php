<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Department;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\LiveDataVersion;

class LivePermissionRefreshTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Employee', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'leaves.view', 'guard_name' => 'web']);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function test_granting_permission_bumps_live_version_and_updates_user_permissions_without_logout()
    {
        $superAdmin = User::factory()->create(['email' => 'admin@example.com']);
        $superAdmin->assignRole('Super Admin');

        $department = Department::create(['name' => 'Engineering', 'code' => 'ENG']);

        $employeeUser = User::factory()->create(['email' => 'employee@example.com']);
        $employeeUser->assignRole('Employee');

        $employee = Employee::create([
            'user_id' => $employeeUser->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'employee_code' => 'EMP001',
            'department_id' => $department->id,
            'status' => 'active',
            'job_title' => 'Software Engineer',
            'joining_date' => now()->toDateString(),
        ]);

        $initialVersion = LiveDataVersion::snapshot(['permissions'])['permissions'] ?? '0';

        // Super Admin grants permission
        $grantResponse = $this->actingAs($superAdmin, 'sanctum')
            ->postJson("/api/employees/{$employee->id}/permissions", [
                'permission' => 'leaves.view',
            ]);
        $grantResponse->assertStatus(200);

        // Version must be bumped
        $updatedVersion = LiveDataVersion::snapshot(['permissions'])['permissions'] ?? '0';
        $this->assertNotEquals($initialVersion, $updatedVersion);

        // Employee fetching /api/user should see new permission without re-logging in
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        unset($this->user);

        $userResponse = $this->actingAs($employeeUser->fresh(), 'sanctum')
            ->getJson('/api/user');
        $userResponse->assertStatus(200);

        // /api/user now returns { user: {...}, permissions: [...], direct_permissions: [...] }
        $permissions = $userResponse->json('permissions') ?? [];
        $this->assertContains('leaves.view', $permissions);
    }
}
