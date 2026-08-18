<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Shift;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PromotedEmployeeMobileSessionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles & permissions
        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Employee', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'leave.approve', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'permissions.revoke_team', 'guard_name' => 'web']);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function test_promoted_employee_mobile_session_and_grant_revoke_sequence()
    {
        // 1. Create Super Admin and Test Employee
        $superAdminUser = User::factory()->create(['email' => 'admin@example.com']);
        $superAdminUser->assignRole('Super Admin');

        // Seed office location settings
        \App\Models\Setting::updateOrCreate(['key' => 'office_latitude'], ['value' => '11.5564']);
        \App\Models\Setting::updateOrCreate(['key' => 'office_longitude'], ['value' => '104.9282']);
        \App\Models\Setting::updateOrCreate(['key' => 'attendance_allowed_radius'], ['value' => '5000']);

        $department = Department::create(['name' => 'Engineering', 'code' => 'ENG']);

        $employeeUser = User::factory()->create(['email' => 'employee@example.com']);
        $employeeUser->assignRole('Employee');

        $employee = Employee::create([
            'user_id' => $employeeUser->id,
            'first_name' => 'Kimsomnang',
            'last_name' => 'Horng',
            'email' => 'employee@example.com',
            'employee_code' => 'EMP001',
            'department_id' => $department->id,
            'status' => 'active',
            'job_title' => 'Software Engineer',
            'join_date' => now()->toDateString(),
        ]);

        // STEP 1: Log in as employee on mobile (create Sanctum token) and clock in
        $token = $employeeUser->createToken('mobile_app')->plainTextToken;

        $clockInResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attendance/clock-in', [
                'latitude' => 11.5564,
                'longitude' => 104.9282,
                'address' => 'Phnom Penh Office',
            ]);
        $clockInResponse->assertStatus(200);

        // STEP 2: Super Admin grants permission to employee (e.g. leave.approve)
        $grantResponse = $this->actingAs($superAdminUser, 'sanctum')
            ->postJson("/api/employees/{$employee->id}/permissions", [
                'permission' => 'leave.approve',
            ]);
        $grantResponse->assertStatus(200);

        // STEP 3: Confirm mobile session token is COMPLETELY UNAFFECTED
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        unset($this->user);

        $clockOutResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attendance/clock-out', [
                'latitude' => 11.5564,
                'longitude' => 104.9282,
                'address' => 'Phnom Penh Office',
            ]);
        $clockOutResponse->assertStatus(200);

        // Also confirm employee now has the granted permission on subsequent request
        $this->assertTrue($employeeUser->fresh()->hasPermissionTo('leave.approve'));

        // STEP 4: Super Admin REVOKES permission from employee
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        unset($this->user);

        $revokeResponse = $this->actingAs($superAdminUser, 'sanctum')
            ->deleteJson("/api/employees/{$employee->id}/permissions/leave.approve");
        $revokeResponse->assertStatus(200);

        // STEP 5: Confirm THIS DOES force logout (token deleted -> returns 401 Unauthenticated)
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        unset($this->user);

        $unauthenticatedResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/attendance/today');
        $unauthenticatedResponse->assertStatus(401);

        // STEP 6: Employee logs back in on mobile (creates new token) and clock-in works normally as base Employee
        $newToken = $employeeUser->createToken('mobile_app_new')->plainTextToken;

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        unset($this->user);

        $todayResponse = $this->withHeader('Authorization', "Bearer {$newToken}")
            ->getJson('/api/attendance/today');
        $todayResponse->assertStatus(200);
    }
}
