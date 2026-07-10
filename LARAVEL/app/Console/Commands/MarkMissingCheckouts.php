<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Console\Command;

class MarkMissingCheckouts extends Command
{
    protected $signature = 'attendance:mark-missing-checkouts {--date= : Date to process (Y-m-d), defaults to yesterday}';
    protected $description = 'Mark attendance records with no clock-out by midnight as Warning';

    public function handle(): int
    {
        $date = $this->option('date')
            ? Carbon::parse($this->option('date'))->toDateString()
            : Carbon::yesterday()->toDateString();

        // We intentionally do NOT auto-set clock_out here.
        // Auto clock-out at shift end would credit employees for hours they may not
        // have worked (e.g. left early without clocking out). HR must review and
        // enter the correct time manually by asking the employee.
        $affected = Attendance::where('date', $date)
            ->whereNull('clock_out')
            ->whereNotIn('status', ['absent', 'warning'])
            ->update(['status' => 'warning']);

        $this->info("Marked {$affected} attendance record(s) on {$date} as 'warning' — HR review required.");

        return self::SUCCESS;
    }
}
