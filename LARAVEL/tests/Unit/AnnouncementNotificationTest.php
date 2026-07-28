<?php

namespace Tests\Unit;

use App\Models\Announcement;
use App\Notifications\NewHoliday;
use PHPUnit\Framework\TestCase;

class AnnouncementNotificationTest extends TestCase
{
    public function test_general_notice_links_employee_to_its_notice_details(): void
    {
        $notice = new Announcement([
            'type' => 'Urgent',
            'title' => 'Meeting at 5:30',
            'content' => 'All finance employees must attend.',
        ]);
        $notice->id = 25;

        $payload = (new NewHoliday($notice))->toArray(null);

        $this->assertSame('announcement', $payload['type']);
        $this->assertSame('Urgent', $payload['announcement_type']);
        $this->assertSame('/notices?notice=25', $payload['action_url']);
    }

    public function test_holiday_notice_still_links_to_holidays(): void
    {
        $holiday = new Announcement([
            'type' => 'Holiday',
            'title' => 'Pchum Ben Festival',
            'content' => 'Public holiday.',
        ]);
        $holiday->id = 26;

        $payload = (new NewHoliday($holiday))->toArray(null);

        $this->assertSame('/holidays', $payload['action_url']);
    }
}
