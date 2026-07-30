<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OvertimeRequested extends Notification
{
    use Queueable;

    public function __construct(protected $overtime)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $employeeName = $this->overtime->employee?->user?->name ?? 'Employee';

        return [
            'type' => 'overtime_request',
            'message' => "New Overtime Request from {$employeeName}",
            'overtime_id' => $this->overtime->id,
            'date' => $this->overtime->date?->toDateString(),
            'hours' => $this->overtime->hours,
            'action_url' => '/overtime',
        ];
    }
}
