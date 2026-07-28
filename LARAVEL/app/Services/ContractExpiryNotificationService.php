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
        $today = $today->copy()->setTimezone('Asia/Phnom_Penh')->startOfDay();
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
                    if ($this->notifyOnce(
                        $recipient,
                        $contract,
                        $daysLeft,
                        $today
                    )) {
                        $notificationsSent++;
                    }
                }
            }
        }

        return [
            'contracts_found' => $contractsFound,
            'notifications_sent' => $notificationsSent,
        ];
    }

    public function notifyEmployeeForSavedContract(
        Contract $contract,
        ?Carbon $today = null
    ): bool {
        $today = ($today ?? Carbon::today('Asia/Phnom_Penh'))
            ->copy()
            ->setTimezone('Asia/Phnom_Penh')
            ->startOfDay();
        $contract->loadMissing('employee.user');

        if (
            $contract->status !== 'active'
            || !$contract->end_date
            || !$contract->employee?->user
        ) {
            return false;
        }

        $endDate = Carbon::parse(
            $contract->end_date,
            'Asia/Phnom_Penh'
        )->startOfDay();
        $daysLeft = (int) $today->diffInDays($endDate, false);

        if ($daysLeft < 0 || $daysLeft > 14) {
            return false;
        }

        return $this->notifyOnce(
            $contract->employee->user,
            $contract,
            $daysLeft,
            $today
        );
    }

    public function notifyEmployeesWithNearExpiryContracts(
        Carbon $today
    ): array {
        $today = $today->copy()->setTimezone('Asia/Phnom_Penh')->startOfDay();
        $contracts = Contract::with('employee.user')
            ->where('status', 'active')
            ->whereNotNull('end_date')
            ->whereDate('end_date', '>=', $today)
            ->whereDate('end_date', '<=', $today->copy()->addDays(14))
            ->get();
        $notificationsSent = 0;

        foreach ($contracts as $contract) {
            if ($this->notifyEmployeeForSavedContract($contract, $today)) {
                $notificationsSent++;
            }
        }

        return [
            'contracts_found' => $contracts->count(),
            'notifications_sent' => $notificationsSent,
        ];
    }

    private function notifyOnce(
        User $recipient,
        Contract $contract,
        int $daysLeft,
        Carbon $today
    ): bool {
        $alreadySent = $recipient->notifications()
            ->where('type', ContractExpiring::class)
            ->whereBetween('created_at', [
                $today->copy()->startOfDay(),
                $today->copy()->endOfDay(),
            ])
            ->get()
            ->contains(function ($notification) use ($contract, $daysLeft): bool {
                $data = is_array($notification->data)
                    ? $notification->data
                    : json_decode($notification->data, true);

                return (int) ($data['contract_id'] ?? 0) === (int) $contract->id
                    && (int) ($data['days_left'] ?? -1) === $daysLeft;
            });

        if ($alreadySent) {
            return false;
        }

        $recipient->notify(new ContractExpiring($contract, $daysLeft));

        return true;
    }
}
