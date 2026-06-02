<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use Database\Seeders\RolePermissionSeeder;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

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
}
