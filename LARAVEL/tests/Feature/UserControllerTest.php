<?php

namespace Tests\Feature;

use App\Mail\EmployeeWelcomeMail;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
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

    public function test_super_admin_can_create_administrator_without_entering_password(): void
    {
        Mail::fake();

        $boss = User::factory()->create([
            'name' => 'Heng Camary',
            'email' => 'boss@example.com',
        ]);
        $boss->assignRole('Super Admin');

        $response = $this->actingAs($boss, 'sanctum')
            ->postJson('/api/users', [
                'name' => 'Chan Sreyneang',
                'email' => 'sreyneang.chan@example.com',
                'role' => 'Admin',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Chan Sreyneang')
            ->assertJsonPath('data.email', 'sreyneang.chan@example.com')
            ->assertJsonPath('data.roles.0.name', 'Admin')
            ->assertJsonPath('credentials_email_sent', true)
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('generated_password');

        $created = User::where('email', 'sreyneang.chan@example.com')->firstOrFail();
        $this->assertTrue($created->hasRole('Admin'));
        $this->assertFalse(Hash::check('', $created->password));

        Mail::assertSent(EmployeeWelcomeMail::class, function (EmployeeWelcomeMail $mail): bool {
            return $mail->hasTo('sreyneang.chan@example.com')
                && $mail->adminName === 'Heng Camary'
                && $mail->generatedPassword !== '';
        });
    }

    public function test_admin_cannot_create_or_change_administrator_role(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $target = User::factory()->create();
        $target->assignRole('Admin');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'name' => 'Blocked User',
                'email' => 'blocked@example.com',
                'role' => 'Admin',
            ])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/users/{$target->id}", [
                'name' => $target->name,
                'email' => $target->email,
                'role' => 'Super Admin',
            ])
            ->assertForbidden();

        $this->assertTrue($target->fresh()->hasRole('Admin'));
        $this->assertFalse($target->fresh()->hasRole('Super Admin'));
    }
}
