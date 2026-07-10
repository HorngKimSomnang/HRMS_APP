<?php

namespace App\Notifications;

use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ClockOutReminder extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Attendance $attendance,
        public readonly Carbon $shiftEnd
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'    => 'clock_out_reminder',
            'title'   => 'Clock-Out Reminder',
            'message' => 'Your shift ends at ' . $this->shiftEnd->setTimezone('Asia/Phnom_Penh')->format('h:i A') . '. Please clock out before leaving.',
            'action'  => 'clock_out',
        ];
    }
}
