<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Leave;
use Database\Seeders\RolePermissionSeeder;

/**
 * Unlike MiddlewareTest (which registers a synthetic route just to prove the
 * `role:` middleware works in isolation), these hit real, registered
 * application endpoints to confirm an Employee-role user is actually
 * rejected by them.
 */
class PermissionBoundaryTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_employee_cannot_create_an_employee_record()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');

        $this->actingAs($user, 'sanctum')
             ->postJson('/api/employees', [
                 'first_name' => 'Should', 'last_name' => 'Fail',
                 'email' => 'should-fail@example.com', 'employee_code' => 'EMPFAIL',
                 'job_title' => 'X', 'joining_date' => '2026-01-01',
             ])
             ->assertStatus(403);

        $this->assertDatabaseMissing('users', ['email' => 'should-fail@example.com']);
    }

    public function test_employee_cannot_approve_leave_requests()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $leave = Leave::create([
            'employee_id' => $employee->id,
            'leave_type' => 'Sick Leave',
            'start_date' => '2027-02-01',
            'end_date' => '2027-02-02',
            'days_count' => 2,
            'reason' => 'Sick',
            'status' => 'pending',
        ]);

        $this->actingAs($user, 'sanctum')
             ->putJson("/api/leaves/{$leave->id}/status", ['status' => 'approved'])
             ->assertStatus(403);

        $this->assertDatabaseHas('leaves', ['id' => $leave->id, 'status' => 'pending']);
    }

    public function test_admin_can_create_an_employee_record()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $this->actingAs($admin, 'sanctum')
             ->postJson('/api/employees', [
                 'first_name' => 'Should', 'last_name' => 'Succeed',
                 'email' => 'should-succeed@example.com', 'employee_code' => 'EMPOK',
                 'job_title' => 'X', 'joining_date' => '2026-01-01',
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'should-succeed@example.com']);
    }
}
