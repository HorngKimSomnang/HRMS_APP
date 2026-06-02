<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LeaveRequested extends Notification
{
    use Queueable;

    protected $leave;

    public function __construct($leave)
    {
        $this->leave = $leave;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $requesterName = $this->leave->employee?->user?->name ?? 'Employee';

        return [
            'type' => 'leave_request',
            'message' => "New Leave Request from " . $requesterName,
            'leave_id' => $this->leave->id,
            'dates' => $this->leave->start_date->toDateString() . ' to ' . $this->leave->end_date->toDateString(),
        ];
    }
}
