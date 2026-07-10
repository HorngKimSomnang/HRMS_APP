<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use Database\Seeders\RolePermissionSeeder;

class DashboardTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_dashboard_stats()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        // Create 2 active employees
        Employee::factory()->count(2)->create([
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
                         ->getJson('/api/dashboard');

        $response->assertStatus(200)
                 ->assertJsonPath('role', 'superadmin')
                 ->assertJsonPath('stats.total_employees', 2);
    }

    public function test_employee_dashboard_stats()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');
        
        $employee = Employee::factory()->create([
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')
                         ->getJson('/api/dashboard');

        $response->assertStatus(200)
                 ->assertJsonPath('role', 'employee');
    }
}
