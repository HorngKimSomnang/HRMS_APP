<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\User;
use App\Notifications\ContractExpiring;
use Carbon\Carbon;

class ContractExpiryNotificationService
{
    private const REMINDER_DAYS = [14, 7, 1];

    public function sendForDate(Carbon $today): array
    {
        $admins = User::role(['Admin', 'Super Admin'])->get();
        $contractsFound = 0;
        $notificationsSent = 0;

        foreach (self::REMINDER_DAYS as $daysLeft) {
            $contracts = Contract::with('employee.user')
                ->where('status', 'active')
                ->whereDate('end_date', $today->copy()->addDays($daysLeft))
                ->get();

            foreach ($contracts as $contract) {
                $contractsFound++;
                $recipients = collect($admins->all());

                if ($contract->employee?->user) {
                    $recipients->push($contract->employee->user);
                }

                foreach ($recipients->unique('id') as $recipient) {
                    $recipient->notify(
                        new ContractExpiring($contract, $daysLeft)
                    );
                    $notificationsSent++;
                }
            }
        }

        return [
            'contracts_found' => $contractsFound,
            'notifications_sent' => $notificationsSent,
        ];
    }
}
