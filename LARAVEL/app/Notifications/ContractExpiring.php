<?php

namespace App\Notifications;

use App\Models\Contract;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ContractExpiring extends Notification
{
    use Queueable;

    protected Contract $contract;
    protected int $daysLeft;

    public function __construct(Contract $contract, int $daysLeft)
    {
        $this->contract = $contract;
        $this->daysLeft = $daysLeft;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $employeeName = $this->contract->employee?->name ?? 'An employee';
        $label = $this->contract->type === 'probation' ? 'probation' : 'contract';
        $isEmployee = (int) ($this->contract->employee?->user_id ?? 0)
            === (int) $notifiable->id;
        $message = $isEmployee
            ? "Your {$label} ends in {$this->daysLeft} day(s) ({$this->contract->end_date->toDateString()})."
            : "{$employeeName}'s {$label} ends in {$this->daysLeft} day(s) ({$this->contract->end_date->toDateString()}).";

        return [
            'type' => 'contract_expiring',
            'title' => $isEmployee
                ? 'Contract Expiry Reminder'
                : 'Employee Contract Expiry',
            'message' => $message,
            'contract_id' => $this->contract->id,
            'employee_id' => $this->contract->employee_id,
            'days_left' => $this->daysLeft,
            'action_url' => $isEmployee ? '/my-contract' : '/lifecycle',
        ];
    }
}
