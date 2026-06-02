<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class NewHoliday extends Notification
{
    use Queueable;

    protected $holiday;

    public function __construct($holiday)
    {
        $this->holiday = $holiday;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'id' => $this->holiday->id,
            'title' => 'New ' . $this->holiday->type . ' Announced: ' . $this->holiday->title,
            'message' => $this->holiday->content,
            'type' => 'announcement'
        ];
    }
}
