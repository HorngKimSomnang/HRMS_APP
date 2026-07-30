<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use Database\Seeders\RolePermissionSeeder;

class LeaveTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_employee_can_request_leave()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');
        $employee = Employee::factory()->create(['user_id' => $user->id]);
        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/leaves', [
                             'leave_type' => 'Sick Leave',
                             'start_date' => '2027-01-10',
                             'end_date' => '2027-01-12',
                             'reason' => 'Sick'
                         ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('leaves', ['employee_id' => $employee->id, 'days_count' => 3]);
    }

    public function test_admin_can_approve_leave()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $user = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $user->id]);
        // Create a pending leave
        $leave = \App\Models\Leave::create([
            'employee_id' => $employee->id,
            'leave_type' => 'Sick Leave',
            'start_date' => '2027-01-10',
            'end_date' => '2027-01-12',
            'days_count' => 3,
            'reason' => 'Sick',
            'status' => 'pending'
        ]);

        $response = $this->actingAs($admin, 'sanctum')
                         ->putJson("/api/leaves/{$leave->id}/status", [
                             'status' => 'approved'
                         ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('leaves', ['id' => $leave->id, 'status' => 'approved']);
    }

    public function test_admin_cannot_override_an_archived_leave_directly()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $employee = Employee::factory()->create();
        $leave = \App\Models\Leave::create([
            'employee_id' => $employee->id,
            'leave_type' => 'Annual Leave',
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => now()->addDays(11)->toDateString(),
            'days_count' => 2,
            'reason' => 'Family event',
            'status' => 'approved',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/leaves/{$leave->id}/status", [
                'status' => 'rejected',
                'rejection_reason' => 'Changed directly',
            ])
            ->assertStatus(409);

        $this->assertDatabaseHas('leaves', [
            'id' => $leave->id,
            'status' => 'approved',
        ]);
    }

    public function test_admin_can_restore_archived_leave_to_pending()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $employee = Employee::factory()->create();
        $leave = \App\Models\Leave::create([
            'employee_id' => $employee->id,
            'leave_type' => 'Annual Leave',
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => now()->addDays(11)->toDateString(),
            'days_count' => 2,
            'reason' => 'Family event',
            'status' => 'rejected',
            'approved_by' => $admin->id,
            'rejection_reason' => 'Submitted by mistake',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/leaves/{$leave->id}/restore-status")
            ->assertOk();

        $this->assertDatabaseHas('leaves', [
            'id' => $leave->id,
            'status' => 'pending',
            'approved_by' => null,
            'rejection_reason' => null,
        ]);
    }

    public function test_super_admin_can_restore_archived_leave_to_pending()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $employee = Employee::factory()->create();
        $leave = \App\Models\Leave::create([
            'employee_id' => $employee->id,
            'leave_type' => 'Sick Leave',
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => now()->addDays(10)->toDateString(),
            'days_count' => 1,
            'reason' => 'Medical appointment',
            'status' => 'approved',
            'approved_by' => $superAdmin->id,
        ]);

        $this->actingAs($superAdmin, 'sanctum')
            ->putJson("/api/leaves/{$leave->id}/restore-status")
            ->assertOk();

        $this->assertDatabaseHas('leaves', [
            'id' => $leave->id,
            'status' => 'pending',
            'approved_by' => null,
        ]);
    }
}
