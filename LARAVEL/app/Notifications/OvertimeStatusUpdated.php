<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class OvertimeStatusUpdated extends Notification
{
    use Queueable;

    protected $overtime;

    public function __construct($overtime)
    {
        $this->overtime = $overtime;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('HRMS Overtime Update')
            ->greeting('Hello ' . ($notifiable->name ?? 'Employee') . ',')
            ->line('Your overtime request for ' . $this->overtime->hours . ' hours on ' . $this->overtime->date . ' has been ' . $this->overtime->status . '.')
            ->line('Please check your HRMS mobile app for more details.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'overtime_status',
            'message' => 'Your overtime request for ' . $this->overtime->hours . ' hours on ' . \Carbon\Carbon::parse($this->overtime->date)->format('M d') . ' has been ' . $this->overtime->status . '.',
            'overtime_id' => $this->overtime->id,
            'status' => $this->overtime->status,
        ];
    }
}
