<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class PayslipStatusChanged extends Notification
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
            ->subject('HRMS Payslip Update')
            ->greeting('Hello ' . ($notifiable->name ?? 'Employee') . ',')
            ->line('Your payslip for ' . $this->payslip->month . ' ' . $this->payslip->year . ' has been marked as ' . $this->payslip->status . '.')
            ->line('Please check your HRMS mobile app for more details.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'payslip_status',
            'message' => 'Your payslip for ' . $this->payslip->month . ' ' . $this->payslip->year . ' is now ' . $this->payslip->status . '.',
            'payslip_id' => $this->payslip->id,
            'status' => $this->payslip->status,
        ];
    }
}
