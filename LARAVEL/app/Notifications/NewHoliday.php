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
        $typeStr = strtolower($this->holiday->type) === 'holiday' ? 'Holiday' : $this->holiday->type . ' Notice';
        
        return [
            'id' => $this->holiday->id,
            'title' => 'New ' . $typeStr . ' Announced: ' . $this->holiday->title,
            'message' => $this->holiday->content,
            'type' => 'announcement',
            'announcement_type' => $this->holiday->type,
            'action_url' => strtolower($this->holiday->type) === 'holiday'
                ? '/holidays'
                : '/notices?notice=' . $this->holiday->id,
        ];
    }
}
