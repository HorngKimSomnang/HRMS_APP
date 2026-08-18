<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class IncidentReportedNotification extends Notification
{
    use Queueable;

    private $title;
    private $problemMessage;
    private $senderName;

    /**
     * Create a new notification instance.
     */
    public function __construct($title, $problemMessage, $senderName)
    {
        $this->title = $title;
        $this->problemMessage = $problemMessage;
        $this->senderName = $senderName;
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
    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => "Incident Report: {$this->title}",
            'message' => "{$this->senderName} reported: {$this->problemMessage}",
            'action_url' => '/',
            'icon' => 'AlertTriangle',
        ];
    }
}
