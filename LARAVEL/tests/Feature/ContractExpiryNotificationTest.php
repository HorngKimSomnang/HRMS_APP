<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\Employee;
use App\Models\User;
use App\Notifications\ContractExpiring;
use App\Services\ContractExpiryNotificationService;
use Carbon\Carbon;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ContractExpiryNotificationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_contract_expiry_alert_is_sent_to_employee_and_admin(): void
    {
        $this->seed(RolePermissionSeeder::class);
        Notification::fake();

        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $employeeUser = User::factory()->create(['name' => 'Sok Dara']);
        $employeeUser->assignRole('Employee');
        $employee = Employee::factory()->for($employeeUser)->create([
            'first_name' => 'Sok',
            'last_name' => 'Dara',
        ]);
        $contract = Contract::create([
            'employee_id' => $employee->id,
            'type' => 'fixed_term',
            'start_date' => '2026-01-01',
            'end_date' => '2026-08-04',
            'status' => 'active',
        ]);

        $result = app(ContractExpiryNotificationService::class)->sendForDate(
            Carbon::parse('2026-07-28', 'Asia/Phnom_Penh')
        );

        $this->assertSame(1, $result['contracts_found']);
        $this->assertSame(2, $result['notifications_sent']);
        Notification::assertSentTo(
            $employeeUser,
            ContractExpiring::class,
            fn (ContractExpiring $notification): bool =>
                $notification->toArray($employeeUser)['action_url']
                    === '/my-contract'
        );
        Notification::assertSentTo(
            $admin,
            ContractExpiring::class,
            fn (ContractExpiring $notification): bool =>
                $notification->toArray($admin)['action_url']
                    === '/lifecycle'
        );

        $employeePayload = (new ContractExpiring($contract, 7))
            ->toArray($employeeUser);
        $this->assertSame('contract_expiring', $employeePayload['type']);
        $this->assertSame('Contract Expiry Reminder', $employeePayload['title']);
        $this->assertStringStartsWith('Your contract ends', $employeePayload['message']);
    }
}
