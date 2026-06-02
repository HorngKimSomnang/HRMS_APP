<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class LeaveStatusUpdated extends Notification
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

    public function toMail(object $notifiable): MailMessage
    {
        $message = $this->leave->leave_type === 'Scheduled Day Off'
            ? "HR has assigned you a Scheduled Day Off for " . \Carbon\Carbon::parse($this->leave->start_date)->format('l, M d, Y') . "."
            : "Your leave request has been " . $this->leave->status . ".";

        return (new MailMessage)
            ->subject('HRMS Leave Update')
            ->greeting('Hello ' . ($notifiable->name ?? 'Employee') . ',')
            ->line($message)
            ->line('Please check your HRMS mobile app for more details.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'leave_status',
            'message' => $this->leave->leave_type === 'Scheduled Day Off' 
                ? "HR has assigned you a Scheduled Day Off for " . \Carbon\Carbon::parse($this->leave->start_date)->format('M d')
                : "Your leave request has been " . $this->leave->status,
            'leave_id' => $this->leave->id,
            'status' => $this->leave->status,
        ];
    }
}
