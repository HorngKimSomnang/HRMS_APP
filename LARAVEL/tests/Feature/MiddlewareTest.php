<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Route;

class MiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Register a test route protected by role
        Route::middleware('auth:sanctum', 'role:Super Admin')->get('/api/admin-only', function () {
            return 'OK';
        });

        $this->seed(RolePermissionSeeder::class);
    }

    public function test_super_admin_can_access_protected_route()
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        $this->actingAs($user, 'sanctum')
             ->getJson('/api/admin-only')
             ->assertStatus(200);
    }

    public function test_employee_cannot_access_protected_route()
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');

        $this->actingAs($user, 'sanctum')
             ->getJson('/api/admin-only')
             ->assertStatus(403);
    }
}
