<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class UserControllerTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_updated_admin_response_contains_current_name_email_and_roles(): void
    {
        $boss = User::factory()->create([
            'name' => 'Super Admin Henchen',
            'email' => 'superadmin@example.com',
        ]);
        $boss->assignRole('Super Admin');

        $response = $this->actingAs($boss, 'sanctum')
            ->putJson("/api/users/{$boss->id}", [
                'name' => 'Hen Chen',
                'email' => 'henchen@example.com',
                'password' => '',
                'role' => 'Super Admin',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $boss->id)
            ->assertJsonPath('data.name', 'Hen Chen')
            ->assertJsonPath('data.email', 'henchen@example.com')
            ->assertJsonPath('data.roles.0.name', 'Super Admin');

        $this->assertDatabaseHas('users', [
            'id' => $boss->id,
            'name' => 'Hen Chen',
            'email' => 'henchen@example.com',
        ]);
    }
}
