<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ReportSentNotification extends Notification
{
    use Queueable;

    private $senderName;
    private $period;
    private $reportType;

    public function __construct($senderName, $period, $reportType = 'Attendance')
    {
        $this->senderName = $senderName;
        $this->period = $period;
        $this->reportType = ucfirst($reportType);
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toDatabase($notifiable)
    {
        return [
            'message' => "{$this->senderName} has submitted the {$this->reportType} Report for {$this->period}.",
            'action_url' => '/reports',
            'icon' => 'FileText',
        ];
    }
}
