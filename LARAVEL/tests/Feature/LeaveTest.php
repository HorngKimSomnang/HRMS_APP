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
}
