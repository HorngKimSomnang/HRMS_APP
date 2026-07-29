<?php

namespace Tests\Feature;

use App\Mail\EmployeeWelcomeMail;
use App\Models\Employee;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmployeeCredentialSecurityTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        Mail::fake();
    }

    public function test_employee_creation_never_returns_the_generated_password(): void
    {
        $boss = User::factory()->create();
        $boss->assignRole('Super Admin');

        $response = $this->actingAs($boss, 'sanctum')
            ->postJson('/api/employees', [
                'first_name' => 'Sokha',
                'last_name' => 'Chan',
                'email' => 'sokha.chan@example.com',
                'job_title' => 'HR Assistant',
                'joining_date' => '2026-07-29',
            ]);

        $response
            ->assertCreated()
            ->assertJsonMissingPath('generated_password')
            ->assertJsonPath('credentials_email_sent', true);

        Mail::assertSent(EmployeeWelcomeMail::class, function (EmployeeWelcomeMail $mail): bool {
            return $mail->hasTo('sokha.chan@example.com');
        });
    }

    public function test_regenerated_key_is_emailed_without_returning_the_password_to_admin(): void
    {
        $boss = User::factory()->create();
        $boss->assignRole('Super Admin');

        $employeeUser = User::factory()->create([
            'email' => 'employee@example.com',
        ]);
        $employeeUser->assignRole('Employee');
        $employee = Employee::factory()->create([
            'user_id' => $employeeUser->id,
        ]);

        $response = $this->actingAs($boss, 'sanctum')
            ->postJson("/api/employees/{$employee->id}/resend-credentials");

        $response
            ->assertOk()
            ->assertJsonMissingPath('generated_password');

        $this->assertStringNotContainsString(
            'password:',
            strtolower($response->getContent())
        );

        Mail::assertSent(EmployeeWelcomeMail::class, function (EmployeeWelcomeMail $mail): bool {
            return $mail->hasTo('employee@example.com');
        });
    }
}
