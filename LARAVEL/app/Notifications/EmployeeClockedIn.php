<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Attendance;

class EmployeeClockedIn extends Notification
{
    use Queueable;

    private const BUSINESS_TIMEZONE = 'Asia/Phnom_Penh';

    protected $attendance;
    protected $action;

    public function __construct(Attendance $attendance, $action = 'clocked in')
    {
        $this->attendance = $attendance;
        $this->action = $action;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        $employee = $this->attendance->employee;
        $name = $employee->first_name . ' ' . $employee->last_name;
        
        $attendanceTime = $this->action === 'clocked out' && $this->attendance->clock_out
            ? $this->attendance->clock_out
            : $this->attendance->clock_in;
        $time = $attendanceTime
            ->copy()
            ->setTimezone(self::BUSINESS_TIMEZONE)
            ->format('h:i A');

        return [
            'id' => $this->attendance->id,
            'title' => 'Attendance Update',
            'message' => "{$name} just {$this->action} at {$time}.",
            'type' => 'attendance'
        ];
    }
}
