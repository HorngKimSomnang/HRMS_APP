<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Leave;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AttendanceReconciliationService
{
    private const BUSINESS_TIMEZONE = 'Asia/Phnom_Penh';

    public function reconcileDate(Carbon|string $date): array
    {
        $workDate = $date instanceof Carbon
            ? $date->copy()->setTimezone(self::BUSINESS_TIMEZONE)->startOfDay()
            : Carbon::parse($date, self::BUSINESS_TIMEZONE)->startOfDay();

        $warningsMarked = Attendance::whereDate('date', $workDate)
            ->whereNull('clock_out')
            ->whereNotIn('status', ['absent', 'warning'])
            ->update(['status' => 'warning']);

        if ($workDate->isSunday() || $this->isPublishedHoliday($workDate)) {
            return [
                'warnings_marked' => $warningsMarked,
                'absences_created' => 0,
                'non_working_day' => true,
            ];
        }

        $absencesCreated = DB::transaction(function () use ($workDate): int {
            $existingEmployeeIds = Attendance::withTrashed()
                ->whereDate('date', $workDate)
                ->pluck('employee_id')
                ->map(static fn ($id): int => (int) $id)
                ->all();

            $approvedLeaveEmployeeIds = Leave::where('status', 'approved')
                ->whereDate('start_date', '<=', $workDate)
                ->whereDate('end_date', '>=', $workDate)
                ->pluck('employee_id')
                ->map(static fn ($id): int => (int) $id)
                ->all();

            $excludedEmployeeIds = array_unique(array_merge(
                $existingEmployeeIds,
                $approvedLeaveEmployeeIds
            ));

            $employees = Employee::where('status', 'active')
                ->whereNotNull('joining_date')
                ->whereDate('joining_date', '<=', $workDate)
                ->when(
                    $excludedEmployeeIds !== [],
                    fn ($query) => $query->whereNotIn('id', $excludedEmployeeIds)
                )
                ->get(['id']);

            foreach ($employees as $employee) {
                Attendance::firstOrCreate(
                    [
                        'employee_id' => $employee->id,
                        'date' => $workDate->toDateString(),
                    ],
                    [
                        'clock_in' => null,
                        'clock_out' => null,
                        'status' => 'absent',
                        'is_late' => false,
                        'late_reason' => null,
                        'early_out_reason' => null,
                        'address' => null,
                        'latitude' => null,
                        'longitude' => null,
                        'location_accuracy' => null,
                    ]
                );
            }

            return $employees->count();
        });

        return [
            'warnings_marked' => $warningsMarked,
            'absences_created' => $absencesCreated,
            'non_working_day' => false,
        ];
    }

    public function backfillActiveEmployeesThrough(Carbon|string $throughDate): array
    {
        $endDate = $throughDate instanceof Carbon
            ? $throughDate->copy()->setTimezone(self::BUSINESS_TIMEZONE)->startOfDay()
            : Carbon::parse($throughDate, self::BUSINESS_TIMEZONE)->startOfDay();
        $earliestJoiningDate = Employee::where('status', 'active')
            ->whereNotNull('joining_date')
            ->min('joining_date');

        if (!$earliestJoiningDate) {
            return ['warnings_marked' => 0, 'absences_created' => 0];
        }

        return $this->reconcileRange($earliestJoiningDate, $endDate);
    }

    public function reconcileRange(Carbon|string $startDate, Carbon|string $endDate): array
    {
        $start = $startDate instanceof Carbon
            ? $startDate->copy()->setTimezone(self::BUSINESS_TIMEZONE)->startOfDay()
            : Carbon::parse($startDate, self::BUSINESS_TIMEZONE)->startOfDay();
        $end = $endDate instanceof Carbon
            ? $endDate->copy()->setTimezone(self::BUSINESS_TIMEZONE)->startOfDay()
            : Carbon::parse($endDate, self::BUSINESS_TIMEZONE)->startOfDay();
        $totals = ['warnings_marked' => 0, 'absences_created' => 0];

        for ($date = $start; $date->lte($end); $date->addDay()) {
            $result = $this->reconcileDate($date);
            $totals['warnings_marked'] += $result['warnings_marked'];
            $totals['absences_created'] += $result['absences_created'];
        }

        return $totals;
    }

    private function isPublishedHoliday(Carbon $date): bool
    {
        return Announcement::where('type', 'Holiday')
            ->where('is_published', true)
            ->whereNotNull('start_date')
            ->whereDate('start_date', '<=', $date)
            ->where(function ($query) use ($date): void {
                $query->whereDate('end_date', '>=', $date)
                    ->orWhere(function ($singleDayQuery) use ($date): void {
                        $singleDayQuery->whereNull('end_date')
                            ->whereDate('start_date', $date);
                    });
            })
            ->exists();
    }
}
