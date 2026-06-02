<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use App\Models\User;
use App\Models\Leave;
use App\Models\Employee;
use Database\Seeders\RolePermissionSeeder;

class NotificationVerifyTest extends TestCase
{
    use RefreshDatabase;

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
                 'leave_type' => 'Sick',
                 'start_date' => '2025-01-01',
                 'end_date' => '2025-01-02',
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
}
