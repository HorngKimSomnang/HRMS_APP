<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BackupStatusTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_super_admin_can_view_backup_status(): void
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        $this->actingAs($user)
            ->getJson('/api/backups/status')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'healthy',
                    'latest',
                    'backup_count',
                    'uploaded_files_included',
                    'schedule' => ['installed'],
                    'retention',
                    'restore_protection',
                ],
            ]);
    }

    public function test_employee_cannot_view_backup_status(): void
    {
        $user = User::factory()->create();
        $user->assignRole('Employee');

        $this->actingAs($user)
            ->getJson('/api/backups/status')
            ->assertForbidden();
    }
}
