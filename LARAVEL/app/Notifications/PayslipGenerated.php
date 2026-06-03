<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class PayslipGenerated extends Notification
{
    use Queueable;

    protected $payslip;

    public function __construct($payslip)
    {
        $this->payslip = $payslip;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('HRMS Payslip Available')
            ->greeting('Hello ' . ($notifiable->name ?? 'Employee') . ',')
            ->line('Your payslip for ' . $this->payslip->month . ' ' . $this->payslip->year . ' has been generated.')
            ->line('Please check your HRMS mobile app for more details.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'payslip_generated',
            'message' => 'Your payslip for ' . $this->payslip->month . ' ' . $this->payslip->year . ' is now available.',
            'payslip_id' => $this->payslip->id,
        ];
    }
}
