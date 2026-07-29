<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\User;

class EmployeeWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $generatedPassword;
    public $adminName;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, $generatedPassword, string $adminName)
    {
        $this->user = $user;
        $this->generatedPassword = $generatedPassword;
        $this->adminName = $adminName;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your HEN CHEN Employee Account Is Ready',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.employee_welcome',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
