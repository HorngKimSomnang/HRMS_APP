<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskCompleted extends Notification
{
    use Queueable;

    protected $task;

    public function __construct($task)
    {
        $this->task = $task;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $employee = $this->task->employee;
        $name = $employee ? "{$employee->first_name} {$employee->last_name}" : 'An employee';

        return [
            'type'    => 'task_completed',
            'task_id' => $this->task->id,
            'title'   => 'Task Completed',
            'message' => "{$name} has completed: {$this->task->title}",
        ];
    }
}
