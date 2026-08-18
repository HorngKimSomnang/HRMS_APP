<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PermissionUpdatedNotification extends Notification
{
    use Queueable;

    public $jobTitle;
    public $status;

    /**
     * Create a new notification instance.
     * $status can be 'granted', 'revoked', or 'updated'
     */
    public function __construct($jobTitle, $status = 'granted')
    {
        $this->jobTitle = $jobTitle;
        $this->status = $status;
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
        if ($this->status === 'revoked') {
            return [
                'title' => 'Permissions Revoked',
                'message' => "That's unfortunate. Some of your permissions were revoked. You are now a {$this->jobTitle}.",
            ];
        } elseif ($this->status === 'updated') {
            return [
                'title' => 'Permissions Updated',
                'message' => "Your permissions have been updated. You are now a {$this->jobTitle}.",
            ];
        }

        return [
            'title' => 'Permissions Upgraded!',
            'message' => "Congratulations! Your permissions have been upgraded and you are now a {$this->jobTitle}.",
        ];
    }
}
