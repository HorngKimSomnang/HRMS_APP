<?php

namespace Tests\Feature;

use App\Mail\EmployeeWelcomeMail;
use App\Models\User;
use Tests\TestCase;

class EmployeeWelcomeMailTest extends TestCase
{
    public function test_welcome_email_embeds_logo_and_has_no_login_button(): void
    {
        $user = User::factory()->make([
            'name' => 'Chan Sokha',
            'email' => 'sokha.chan@example.com',
        ]);

        $html = (new EmployeeWelcomeMail(
            $user,
            'Temporary123',
            'Heng Camary'
        ))->render();

        $this->assertStringContainsString('HEN CHEN', $html);
        $this->assertStringContainsString(
            'Your HEN CHEN Employee Account Is Ready',
            $html
        );
        $this->assertStringNotContainsString('Welcome to HEN CHEN HRMS', $html);
        $this->assertStringContainsString('cid:', $html);
        $this->assertStringContainsString('Temporary123', $html);
        $this->assertStringContainsString('sokha.chan@example.com', $html);
        $this->assertStringContainsString('Heng Camary', $html);
        $this->assertStringNotContainsString('Login Now', $html);
    }
}
