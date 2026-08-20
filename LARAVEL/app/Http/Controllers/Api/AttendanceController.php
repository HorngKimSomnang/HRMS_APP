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

        // Block clock-in if there is an approved leave today
        $hasApprovedLeaveToday = \App\Models\Leave::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->exists();

        if ($hasApprovedLeaveToday) {
            return $this->errorResponse('You cannot clock in because you have an approved leave for today.', 400);
        }

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



        $admins = User::whereHas('assignedRoles', fn($q) => $q->whereIn('name', ['Super Admin']))->get();
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

        $today      = Carbon::today(self::BUSINESS_TIMEZONE)->toDateString();
        $attendance = Attendance::where('employee_id', $employee->id)
            ->whereDate('date', $today)
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

        $this->handleAutoOvertime($attendance, Carbon::now());

        $attendance->update([
            'clock_out'         => Carbon::now(),
            'status'            => $newStatus,
            'early_out_reason'  => $earlyReason,
        ]);

        // Auto reject pending leave if employee clocked out today
        $pendingLeaveToday = \App\Models\Leave::where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->first();

        if ($pendingLeaveToday) {
            $pendingLeaveToday->update([
                'status' => 'rejected',
                'rejection_reason' => 'Auto-processed: Employee completed their shift and clocked out today.',
            ]);
            
            \App\Services\AuditLogger::log($request, 'LEAVE_STATUS_CHANGED', $pendingLeaveToday, [
                'from_status'      => 'pending',
                'status'           => 'rejected',
                'leave_type'       => $pendingLeaveToday->leave_type,
                'employee'         => $employee->user?->name,
                'rejection_reason' => 'Auto-processed: Employee completed their shift and clocked out today.',
            ]);

            try {
                $employee->user?->notify(new \App\Notifications\LeaveStatusUpdated($pendingLeaveToday));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send auto-leave status notification: ' . $e->getMessage());
            }

            \App\Services\LiveDataVersion::bump('leaves');
        }

        $admins = User::whereHas('assignedRoles', fn($q) => $q->whereIn('name', ['Super Admin']))->get();
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
            ->whereDate('date', Carbon::today(self::BUSINESS_TIMEZONE)->toDateString())
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

    public function manualUpdate(Request $request, int $id)
    {
        $user = Auth::user();

        $request->validate([
            'clock_in_time'  => 'nullable|date_format:H:i',
            'clock_out_time' => 'nullable|date_format:H:i',
        ]);

        $attendance = Attendance::findOrFail($id);

        $tz   = self::BUSINESS_TIMEZONE;
        $date = Carbon::parse($attendance->date)->format('Y-m-d');

        $updates = [];
        $newStatus = $attendance->status;
        $earlyOutReason = $attendance->early_out_reason;
        $lateReason = $attendance->late_reason;
        $isLate = $attendance->is_late;

        // Process Clock In
        if ($request->clock_in_time) {
            $clockInDateTime = Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . $request->clock_in_time, $tz)->setTimezone('UTC');
            $updates['clock_in'] = $clockInDateTime;

            // Re-evaluate late status
            if ($attendance->employee && $attendance->employee->shift_id && $attendance->employee->shift) {
                $shift = $attendance->employee->shift;
                $startTime = is_array($shift) ? ($shift['start_time'] ?? null) : $shift->start_time;
                $graceMinutes = is_array($shift) ? (int)($shift['grace_period_minutes'] ?? 15) : (int)($shift->grace_period_minutes ?? 15);

                if ($startTime) {
                    $shiftStart = Carbon::parse($date . ' ' . $startTime, $tz)->addMinutes($graceMinutes);
                    $clockInTz = $clockInDateTime->copy()->setTimezone($tz);
                    $isLate = $clockInTz->greaterThan($shiftStart);
                    
                    if ($isLate && !$lateReason) {
                        $lateReason = 'Manually set by Admin/HR (late)';
                    }
                    if (!$isLate) {
                        $lateReason = null;
                        if ($newStatus === 'late') $newStatus = 'present';
                    }
                }
            }
            $updates['is_late'] = $isLate;
            $updates['late_reason'] = $lateReason;
            if ($isLate && !in_array($newStatus, ['early_out', 'absent', 'day_off', 'on_leave'])) {
                $newStatus = 'late';
            }
        }

        // Process Clock Out
        $clockOutDateTime = null;
        if ($request->clock_out_time) {
            $clockOutDateTime = Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . $request->clock_out_time, $tz)->setTimezone('UTC');
            
            $baseClockIn = isset($updates['clock_in']) ? $updates['clock_in'] : Carbon::parse($attendance->clock_in);

            // If the entered time is before clock-in, assume the employee worked past midnight
            if ($clockOutDateTime->lessThanOrEqualTo($baseClockIn)) {
                $clockOutDateTime->addDay();
            }

            if ($clockOutDateTime->lessThanOrEqualTo($baseClockIn)) {
                return $this->errorResponse('Clock-out time cannot be before or equal to clock-in time.', 400);
            }

            if ($baseClockIn->diffInMinutes($clockOutDateTime) > 840) {
                return $this->errorResponse('Clock-out time results in more than 14 hours worked. Please check the time and try again.', 400);
            }

            $updates['clock_out'] = $clockOutDateTime;

            if ($attendance->employee && $attendance->employee->shift_id && $attendance->employee->shift) {
                $shift   = $attendance->employee->shift;
                $endTime = is_array($shift) ? ($shift['end_time'] ?? null) : $shift->end_time;
                if ($endTime) {
                    $shiftEnd = Carbon::parse($date . ' ' . $endTime, $tz);
                    $clockOutTz = $clockOutDateTime->copy()->setTimezone($tz);
                    if ($clockOutTz->lessThan($shiftEnd)) {
                        $newStatus      = 'early_out';
                        $earlyOutReason = 'Manually set by Admin/HR (early out)';
                    } else {
                        $earlyOutReason = null;
                        if ($newStatus === 'early_out') {
                            $newStatus = $isLate ? 'late' : 'present';
                        }
                    }
                }
            }
            
            $this->handleAutoOvertime($attendance, $clockOutDateTime);
        }

        $updates['status'] = $newStatus;
        $updates['early_out_reason'] = $earlyOutReason;

        $attendance->update($updates);

        return $this->successResponse($attendance->fresh(), 'Manual update saved.');
    }

    public function destroy(int $id)
    {
        /** @var User $user */
        $user = Auth::user();
        // Authorization handled by permission:attendance.delete middleware on the route.

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

    private function handleAutoOvertime($attendance, $clockOutTime)
    {
        $employee = $attendance->employee;
        if (!$employee) return;

        if (!$employee->shift_id || !$employee->shift) return;
        
        $shift = $employee->shift;
        $start = is_array($shift) ? ($shift['start_time'] ?? null) : $shift->start_time;
        $end = is_array($shift) ? ($shift['end_time'] ?? null) : $shift->end_time;
        
        if (!$start || !$end) return;

        $attendanceDate = Carbon::parse($attendance->date)->format('Y-m-d');
        $shiftStart = Carbon::parse($attendanceDate . ' ' . $start, self::BUSINESS_TIMEZONE);
        $shiftEnd = Carbon::parse($attendanceDate . ' ' . $end, self::BUSINESS_TIMEZONE);

        if ($shiftEnd->lessThan($shiftStart)) {
            $shiftEnd->addDay();
        }

        $clockOutTimeTz = Carbon::parse($clockOutTime)->setTimezone(self::BUSINESS_TIMEZONE);
        $overtimeMinutes = $shiftEnd->diffInMinutes($clockOutTimeTz, false);

        if ($overtimeMinutes > 0) {
            $overtimeHours = round($overtimeMinutes / 60, 2);
            
            $existing = \App\Models\Overtime::where('employee_id', $employee->id)
                ->where('date', $attendance->date)
                ->first();
            
            if (!$existing) {
                $overtime = \App\Models\Overtime::create([
                    'employee_id' => $employee->id,
                    'date'        => $attendance->date,
                    'start_time'  => $shiftEnd->format('H:i'),
                    'end_time'    => $clockOutTimeTz->format('H:i'),
                    'hours'       => $overtimeHours,
                    'reason'      => 'Auto-detected from late clock-out',
                    'status'      => 'pending',
                    'origin'      => 'attendance_auto',
                ]);
                
                try {
                    $overtime->loadMissing('employee.user');
                    $reviewers = \App\Models\User::whereHas('assignedRoles', fn($q) => $q->whereIn('name', ['Super Admin']))->get();
                    \Illuminate\Support\Facades\Notification::send($reviewers, new \App\Notifications\OvertimeRequested($overtime));
                } catch (\Exception $exception) {
                    \Illuminate\Support\Facades\Log::error('Failed to send overtime request notification: '.$exception->getMessage());
                }
                
                try {
                    \App\Services\LiveDataVersion::bump('overtimes');
                } catch (\Throwable $e) {}
            }
        }
    }
}
