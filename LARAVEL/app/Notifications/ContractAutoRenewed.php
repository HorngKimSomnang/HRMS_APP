<?php

namespace App\Notifications;

use App\Models\Contract;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ContractAutoRenewed extends Notification
{
    use Queueable;

    protected Contract $contract;

    public function __construct(Contract $contract)
    {
        $this->contract = $contract;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $employeeName = $this->contract->employee?->name ?? 'An employee';
        $isEmployee = (int) ($this->contract->employee?->user_id ?? 0) === (int) $notifiable->id;
        
        $message = $isEmployee
            ? "Your contract expired and a new {$this->contract->type} contract was auto-generated. It is currently pending approval."
            : "{$employeeName}'s contract expired and was auto-renewed. It is pending your review.";

        return [
            'type' => 'contract_auto_renewed',
            'title' => 'Contract Auto-Renewed',
            'message' => $message,
            'contract_id' => $this->contract->id,
            'employee_id' => $this->contract->employee_id,
            'action_url' => $isEmployee ? '/my-contract' : '/employees',
        ];
    }
}
