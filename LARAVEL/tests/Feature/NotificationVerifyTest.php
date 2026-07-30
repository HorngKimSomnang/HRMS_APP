<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use App\Models\User;
use App\Models\Leave;
use App\Models\Employee;
use App\Models\Overtime;
use Database\Seeders\RolePermissionSeeder;

class NotificationVerifyTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_leave_request_sends_notification_to_admin()
    {
        Notification::fake();

        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $employeeUser = User::factory()->create();
        $employeeUser->assignRole('Employee');
        Employee::factory()->create(['user_id' => $employeeUser->id]);

        // Employee requests leave
        $this->actingAs($employeeUser, 'sanctum')
             ->postJson('/api/leaves', [
                 'leave_type' => 'Sick Leave',
                 'start_date' => '2027-01-01',
                 'end_date' => '2027-01-02',
                 'reason' => 'Fever'
             ]);

        Notification::assertSentTo(
            [$admin],
            \App\Notifications\LeaveRequested::class
        );
    }

    public function test_leave_approval_sends_notification_to_employee()
    {
        Notification::fake();

        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $employeeUser = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $employeeUser->id]);
        
        $leave = Leave::factory()->create([
            'employee_id' => $employee->id,
            'status' => 'pending'
        ]);

        // Admin approves
        $this->actingAs($admin, 'sanctum')
             ->putJson("/api/leaves/{$leave->id}/status", [
                 'status' => 'approved'
             ]);

        Notification::assertSentTo(
            $employeeUser,
            \App\Notifications\LeaveStatusUpdated::class
        );
    }

    public function test_overtime_request_notifies_admin_and_super_admin()
    {
        Notification::fake();

        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $employeeUser = User::factory()->create();
        $employeeUser->assignRole('Employee');
        Employee::factory()->create(['user_id' => $employeeUser->id]);

        $this->actingAs($employeeUser, 'sanctum')
            ->postJson('/api/overtimes', [
                'date' => '2027-01-15',
                'start_time' => '17:00',
                'end_time' => '20:00',
                'hours' => 3,
                'reason' => 'Production server maintenance',
            ])
            ->assertCreated();

        Notification::assertSentTo(
            [$admin, $superAdmin],
            \App\Notifications\OvertimeRequested::class
        );
    }

    public function test_super_admin_can_approve_overtime_request()
    {
        Notification::fake();

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $employeeUser = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $employeeUser->id]);
        $overtime = Overtime::create([
            'employee_id' => $employee->id,
            'date' => '2027-01-15',
            'start_time' => '17:00',
            'end_time' => '20:00',
            'hours' => 3,
            'reason' => 'Production server maintenance',
            'status' => 'pending',
        ]);

        $this->actingAs($superAdmin, 'sanctum')
            ->putJson("/api/overtimes/{$overtime->id}", [
                'status' => 'approved',
            ])
            ->assertOk();

        $this->assertDatabaseHas('overtimes', [
            'id' => $overtime->id,
            'status' => 'approved',
            'approved_by' => $superAdmin->id,
        ]);
    }
}
