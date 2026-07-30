<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Setting;
use App\Notifications\EmployeeClockedIn;
use App\Support\HrCatalog;
use Illuminate\Support\Facades\Notification;

class AttendanceController extends Controller
{
    private const BUSINESS_TIMEZONE = 'Asia/Phnom_Penh';

    public function clockIn(Request $request)
    {
        $request->validate([
            'latitude'    => 'required|numeric',
            'longitude'   => 'required|numeric',
            'address'     => 'nullable|string|max:500',
            'accuracy'    => 'nullable|numeric',
            'late_reason' => 'nullable|string|max:500',
        ]);

        $user     = Auth::user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        $today = Carbon::today(self::BUSINESS_TIMEZONE)->toDateString();

        // Location validation
        $officeSettings = Setting::whereIn('key', [
            'office_latitude',
            'office_longitude',
            'office_address',
            'attendance_allowed_radius',
        ])->pluck('value', 'key');
        $officeLat = $officeSettings->get('office_latitude');
        $officeLng = $officeSettings->get('office_longitude');
        $officeAddress = $officeSettings->get('office_address');
        $allowedRadius = $officeSettings->get('attendance_allowed_radius') ?? 100;

        if ($officeLat && $officeLng) {
            $distance = $this->calculateDistance($officeLat, $officeLng, $request->latitude, $request->longitude);
            if ($distance > $allowedRadius) {
                return $this->errorResponse(
                    'You are outside the allowed office area. (Distance: ' . round($distance) . 'm, Allowed: ' . $allowedRadius . 'm).',
                    400
                );
            }
        }

        // Determine lateness against shift
        $isLate = false;
        $shift = $employee->shift ?? (HrCatalog::getShifts()[0] ?? null);
        if ($shift) {
            $startTime    = is_array($shift) ? ($shift['start_time'] ?? null) : $shift->start_time;
            $graceMinutes = is_array($shift)
                ? (int) ($shift['grace_period_minutes'] ?? 15)
                : (int) ($shift->grace_period_minutes ?? 15);

            if ($startTime) {
                $shiftStart = Carbon::today(self::BUSINESS_TIMEZONE)->setTimeFromTimeString($startTime)->addMinutes($graceMinutes);
                $isLate     = Carbon::now(self::BUSINESS_TIMEZONE)->greaterThan($shiftStart);
            }
        }

        $attendanceAddress = $officeLat && $officeLng && $officeAddress
            ? $officeAddress
            : ($request->address ?? 'Unknown');

        $attendance = DB::transaction(function () use (
            $employee,
            $today,
            $request,
            $isLate,
            $attendanceAddress
        ) {
            return Attendance::firstOrCreate(
                ['employee_id' => $employee->id, 'date' => $today],
                [
                    'clock_in'          => Carbon::now(),
                    'latitude'          => $request->latitude,
                    'longitude'         => $request->longitude,
                    'address'           => $attendanceAddress,
                    'location_accuracy' => $request->accuracy,
                    'status'            => $isLate ? 'late' : 'present',
                    'is_late'           => $isLate,
                    'late_reason'       => ($isLate && $request->late_reason) ? $request->late_reason : null,
                ]
            );
        });

        if (!$attendance->wasRecentlyCreated) {
            if ($attendance->clock_in) {
                return $this->errorResponse('Already clocked in today.', 400);
            }
            // Record exists (e.g. admin-created absent placeholder) but has no clock_in — update it
            $attendance->update([
                'clock_in'          => Carbon::now(),
                'latitude'          => $request->latitude,
                'longitude'         => $request->longitude,
                'address'           => $attendanceAddress,
                'location_accuracy' => $request->accuracy,
                'status'            => $isLate ? 'late' : 'present',
                'is_late'           => $isLate,
                'late_reason'       => ($isLate && $request->late_reason) ? $request->late_reason : null,
            ]);
            $attendance->refresh();
        }

        $admins = User::role(['Admin', 'Super Admin'], 'web')->get();
        Notification::send($admins, new EmployeeClockedIn($attendance));

        $msg = $isLate ? 'Clocked in successfully (Late)' : 'Clocked in successfully';
        return $this->successResponse($attendance, $msg);
    }

    public function submitLateReason(Request $request)
    {
        $request->validate(['late_reason' => 'required|string|max:500']);

        $employee = Auth::user()->employee;
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('date', Carbon::today())
            ->whereNotNull('clock_in')
            ->first();

        if (!$attendance) {
            return $this->errorResponse('No clock-in record found for today.', 404);
        }

        if (!$attendance->is_late) {
            return $this->errorResponse('You are not marked as late today.', 400);
        }

        $attendance->update(['late_reason' => $request->late_reason]);

        return $this->successResponse($attendance, 'Late reason submitted.');
    }

    public function clockOut(Request $request)
    {
        $request->validate([
            'latitude'  => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'accuracy'  => 'nullable|numeric',
            'reason'    => 'nullable|string|max:500',
        ]);

        $user     = Auth::user();
        $employee = $user->employee;

        $today      = Carbon::today();
        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        if (!$attendance) {
            return $this->errorResponse('You have not clocked in today.', 400);
        }

        if ($attendance->clock_out) {
            return $this->errorResponse('Already clocked out.', 400);
        }

        $clockInTime  = Carbon::parse($attendance->clock_in);
        $now          = Carbon::now();
        $minutesWorked = $clockInTime->diffInMinutes($now, false); // negative if now < clock_in

        if ($minutesWorked < 0) {
            return $this->errorResponse('Clock-out time cannot be before your clock-in time.', 400);
        }

        if ($minutesWorked > 840) { // > 14 h
            return $this->errorResponse(
                'Cannot clock out after more than 14 hours. Please contact your HR manager to correct this record.',
                400
            );
        }

        // Location validation (required when office coords are set)
        if ($request->has('latitude') && $request->has('longitude')) {
            $officeLat     = \App\Models\Setting::where('key', 'office_latitude')->value('value');
            $officeLng     = \App\Models\Setting::where('key', 'office_longitude')->value('value');
            $allowedRadius = \App\Models\Setting::where('key', 'attendance_allowed_radius')->value('value') ?? 100;

            if ($officeLat && $officeLng) {
                $distance = $this->calculateDistance($officeLat, $officeLng, $request->latitude, $request->longitude);
                if ($distance > $allowedRadius) {
                    return $this->errorResponse(
                        'You are outside the allowed office area. (Distance: ' . round($distance) . 'm, Allowed: ' . $allowedRadius . 'm).',
                        400
                    );
                }
            }
        } else {
            $officeLat = \App\Models\Setting::where('key', 'office_latitude')->value('value');
            if ($officeLat) {
                return $this->errorResponse('Location (GPS) is required to clock out.', 400);
            }
        }

        // Determine early out against shift
        $isEarlyOut  = false;
        $earlyReason = $request->reason;

        if ($employee->shift_id && $employee->shift) {
            $shift   = $employee->shift;
            $endTime = is_array($shift) ? ($shift['end_time'] ?? null) : $shift->end_time;

            if ($endTime) {
                $shiftEnd   = Carbon::today(self::BUSINESS_TIMEZONE)->setTimeFromTimeString($endTime);
                $isEarlyOut = Carbon::now(self::BUSINESS_TIMEZONE)->lessThan($shiftEnd);

                if ($isEarlyOut && !$earlyReason) {
                    $earlyReason = 'Auto-detected: Clocked out early before shift end.';
                }
            }
        }

        // Status update: early_out overrides present/late; late stays if not early
        $newStatus = $attendance->status;
        if ($isEarlyOut) {
            $newStatus = 'early_out';
        }

        $attendance->update([
            'clock_out'         => Carbon::now(),
            'status'            => $newStatus,
            'early_out_reason'  => $earlyReason,
        ]);

        $admins = User::role(['Admin', 'Super Admin'], 'web')->get();
        Notification::send($admins, new EmployeeClockedIn($attendance, 'clocked out'));

        return $this->successResponse($attendance, 'Clocked out successfully');
    }

    public function undoClockOut(Request $request)
    {
        $employee = Auth::user()->employee;
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('date', Carbon::today())
            ->first();

        if (!$attendance || !$attendance->clock_out) {
            return $this->errorResponse('No clock-out found to undo.', 400);
        }

        $minutesSinceClockOut = Carbon::parse($attendance->clock_out)->diffInMinutes(Carbon::now());
        if ($minutesSinceClockOut > 5) {
            return $this->errorResponse(
                'The undo window (5 minutes) has expired. Please contact your HR manager to correct this record.',
                400
            );
        }

        $attendance->update([
            'clock_out'        => null,
            'early_out_reason' => null,
            'status'           => $attendance->is_late ? 'late' : 'present',
        ]);

        return $this->successResponse($attendance->fresh(), 'Clock-out undone. You are clocked in again.');
    }

    public function today()
    {
        $employee = Auth::user()->employee;
        if (!$employee) {
            return response()->json(['data' => null]);
        }

        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('date', Carbon::today())
            ->first();

        return response()->json(['data' => $attendance]);
    }

    public function history()
    {
        $user = Auth::user();
        if (!$user->employee) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        $history = Attendance::where('employee_id', $user->employee->id)
            ->orderBy('date', 'desc')
            ->take(30)
            ->get();

        return response()->json(['data' => $history]);
    }

    public function manualClockOut(Request $request, int $id)
    {
        /** @var User $user */
        $user = Auth::user();
        if (!$user->hasRole(['Admin', 'Super Admin'])) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        $request->validate(['clock_out_time' => 'required|date_format:H:i']);

        $attendance = Attendance::findOrFail($id);

        $tz   = self::BUSINESS_TIMEZONE;
        $date = Carbon::parse($attendance->date)->format('Y-m-d');

        $clockOutDateTime = Carbon::createFromFormat(
            'Y-m-d H:i',
            $date . ' ' . $request->clock_out_time,
            $tz
        )->setTimezone('UTC');

        $clockInTime = Carbon::parse($attendance->clock_in);

        // If the entered time is before clock-in, assume the employee worked past midnight
        // (e.g. clocked in at 08:00 AM, admin enters 00:30 → means next day 00:30)
        if ($clockOutDateTime->lessThanOrEqualTo($clockInTime)) {
            $clockOutDateTime->addDay();
        }

        // After next-day adjustment, if still invalid reject it
        if ($clockOutDateTime->lessThanOrEqualTo($clockInTime)) {
            return $this->errorResponse(
                'Clock-out time (' . $request->clock_out_time . ') cannot be before or equal to clock-in time (' .
                $clockInTime->setTimezone($tz)->format('H:i') . ').',
                400
            );
        }

        // Reject if duration would exceed 14 h (almost certainly a data error)
        if ($clockInTime->diffInMinutes($clockOutDateTime) > 840) {
            return $this->errorResponse(
                'Clock-out time results in more than 14 hours worked. Please check the time and try again.',
                400
            );
        }

        // Determine if early-out and set reason accordingly
        $newStatus        = $attendance->status;
        $earlyOutReason   = null;

        if ($attendance->employee && $attendance->employee->shift_id && $attendance->employee->shift) {
            $shift   = $attendance->employee->shift;
            $endTime = is_array($shift) ? ($shift['end_time'] ?? null) : $shift->end_time;
            if ($endTime) {
                $shiftEnd = Carbon::parse($date . ' ' . $endTime, self::BUSINESS_TIMEZONE);
                if ($clockOutDateTime->lessThan($shiftEnd)) {
                    $newStatus      = 'early_out';
                    $earlyOutReason = 'Manually set by Admin/HR (early out)';
                }
            }
        }

        $attendance->update([
            'clock_out'        => $clockOutDateTime,
            'status'           => $newStatus,
            'early_out_reason' => $earlyOutReason,
        ]);

        return $this->successResponse($attendance->fresh(), 'Manual clock-out time saved.');
    }

    public function destroy(int $id)
    {
        /** @var User $user */
        $user = Auth::user();
        if (!$user->hasRole(['Admin', 'Super Admin'])) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        $attendance = Attendance::findOrFail($id);
        $attendance->delete();

        return response()->json(['message' => 'Attendance record deleted successfully.']);
    }

    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2)
    {
        $earthRadius = 6371000;
        $dLat        = deg2rad($lat2 - $lat1);
        $dLon        = deg2rad($lon2 - $lon1);
        $a           = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
