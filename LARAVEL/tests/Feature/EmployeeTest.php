<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

class EmployeeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_can_create_employee()
    {
        // Create an Admin user
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin'); // Or Admin

        // Prepare Employee Data
        $employeeData = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'employee_code' => 'EMP001',
            'phone' => '9876543210',
            'department' => 'Engineering',
            'job_title' => 'Engineer',
            'joining_date' => '2025-01-01',
            'salary' => 50000.00,
            'address' => '123 Street',
            'gender' => 'Male',
            'dob' => '1990-01-01'
        ];

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/employees', $employeeData);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'data' => [
                         'id',
                         'full_name',
                         'employee_code',
                         'role'
                     ]
                 ]);

        // Verify User was created
        $this->assertDatabaseHas('users', ['email' => 'john.doe@example.com']);

        // Verify Employee Profile was created
        $this->assertDatabaseHas('employees', ['employee_code' => 'EMP001']);

        // Verify Role was assigned
        $newUser = User::where('email', 'john.doe@example.com')->first();
        $this->assertTrue($newUser->hasRole('Employee'));
    }
}
