<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Setting;
use App\Notifications\EmployeeClockedIn;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Notification;

class AttendanceTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_employee_can_clock_in()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');

        Employee::factory()->create([
            'user_id' => $user->id,
            'employee_code' => 'EMP999',
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);

        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/attendance/clock-in', [
                             'latitude' => 13.7563,
                             'longitude' => 100.5018,
                         ]);

        $response->assertStatus(200)
                 ->assertJson(['message' => 'Clocked in successfully']);
    }

    public function test_employee_cannot_clock_in_twice_on_same_day()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');

        Employee::factory()->create([
            'user_id' => $user->id,
            'employee_code' => 'EMP999',
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);

        $this->actingAs($user, 'sanctum')
             ->postJson('/api/attendance/clock-in', [
                 'latitude' => 13.7563,
                 'longitude' => 100.5018,
             ])
             ->assertStatus(200);

        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/attendance/clock-in', [
                             'latitude' => 13.8000,
                             'longitude' => 100.5018,
                         ]);

        $response->assertStatus(400)
                 ->assertJson(['message' => 'Already clocked in today.']);
    }

    public function test_clock_in_notifies_admin_and_super_admin(): void
    {
        Notification::fake();

        $employeeUser = User::factory()->create();
        $employeeUser->assignRole('Employee');
        Employee::factory()->create([
            'user_id' => $employeeUser->id,
            'employee_code' => 'EMP997',
            'first_name' => 'Sophal',
            'last_name' => 'Soreachpooh',
        ]);

        $admin = User::factory()->create();
        $admin->assignRole('Admin');
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('Super Admin');

        $this->actingAs($employeeUser, 'sanctum')
            ->postJson('/api/attendance/clock-in', [
                'latitude' => 13.7563,
                'longitude' => 100.5018,
            ])
            ->assertOk();

        Notification::assertSentTo($admin, EmployeeClockedIn::class);
        Notification::assertSentTo($superAdmin, EmployeeClockedIn::class);
        Notification::assertNotSentTo($employeeUser, EmployeeClockedIn::class);
    }

    public function test_clock_in_uses_the_configured_office_address(): void
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');

        $employee = Employee::factory()->create([
            'user_id' => $user->id,
            'employee_code' => 'EMP998',
            'first_name' => 'Sok',
            'last_name' => 'Dara',
        ]);

        foreach ([
            'office_latitude' => '11.58817',
            'office_longitude' => '104.93074',
            'office_address' => 'Norton University, St. Keo Chenda, Phnom Penh, Cambodia',
            'attendance_allowed_radius' => '100',
        ] as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value,
                    'type' => 'text',
                    'group' => 'attendance',
                ]
            );
        }

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/attendance/clock-in', [
                'latitude' => 11.58817,
                'longitude' => 104.93074,
                'address' => 'Khan Chamkar Mon, Phnom Penh',
            ])
            ->assertOk();

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'address' => 'Norton University, St. Keo Chenda, Phnom Penh, Cambodia',
        ]);
    }
}
