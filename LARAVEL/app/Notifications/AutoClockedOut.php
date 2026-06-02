<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Attendance;
use Carbon\Carbon;

class AutoClockedOut extends Notification
{
    use Queueable;

    protected $attendance;
    protected $shiftEndTime;

    /**
     * Create a new notification instance.
     */
    public function __construct(Attendance $attendance, $shiftEndTime)
    {
        $this->attendance = $attendance;
        $this->shiftEndTime = $shiftEndTime;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $formattedTime = Carbon::parse($this->shiftEndTime)->format('h:i A');
        return [
            'type' => 'attendance_auto_clock_out',
            'attendance_id' => $this->attendance->id,
            'title' => 'Auto Clock-Out',
            'message' => "You forgot to clock out today. The system automatically clocked you out at {$formattedTime}.",
        ];
    }
}
