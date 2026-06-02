<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Attendance;

class EmployeeClockedIn extends Notification
{
    use Queueable;

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
        
        $time = $this->action === 'clocked out' && $this->attendance->clock_out 
            ? $this->attendance->clock_out->format('h:i A') 
            : $this->attendance->clock_in->format('h:i A');

        return [
            'id' => $this->attendance->id,
            'title' => 'Attendance Update',
            'message' => "{$name} just {$this->action} at {$time}.",
            'type' => 'attendance'
        ];
    }
}
