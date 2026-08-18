<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PermissionGrantedNotification extends Notification
{
    use Queueable;

    public $jobTitle;

    /**
     * Create a new notification instance.
     */
    public function __construct($jobTitle)
    {
        $this->jobTitle = $jobTitle;
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
        return [
            'title' => 'Permissions Upgraded!',
            'message' => "Congratulations! Your permissions have been upgraded and you are now a {$this->jobTitle}.",
        ];
    }
}
