<?php

namespace App\Console\Commands;

use App\Services\ContractExpiryNotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendContractExpiryReminders extends Command
{
    protected $signature = 'contracts:send-expiry-reminders
        {--date= : Optional date in YYYY-MM-DD format}
        {--include-near-expiry : Alert employees for every active contract ending within 14 days}';

    protected $description = 'Notify employees and admins about contracts ending in 14, 7, or 1 day';

    public function handle(ContractExpiryNotificationService $service): int
    {
        $date = $this->option('date')
            ? Carbon::createFromFormat(
                'Y-m-d',
                (string) $this->option('date'),
                'Asia/Phnom_Penh'
            )->startOfDay()
            : Carbon::today('Asia/Phnom_Penh');

        $result = $service->sendForDate($date);

        if ($this->option('include-near-expiry')) {
            $nearExpiry = $service->notifyEmployeesWithNearExpiryContracts(
                $date
            );
            $result['contracts_found'] += $nearExpiry['contracts_found'];
            $result['notifications_sent'] +=
                $nearExpiry['notifications_sent'];
        }

        $this->info(
            "Contract reminders complete: {$result['contracts_found']} contract(s), "
            . "{$result['notifications_sent']} notification(s)."
        );

        return self::SUCCESS;
    }
}
