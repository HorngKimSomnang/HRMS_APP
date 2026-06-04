<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Notifications\EmployeeClockedIn;
use Illuminate\Support\Facades\Notification;

class AttendanceController extends Controller
{
    public function clockIn(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $user = Auth::user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        // Check already clocked in today
        $today = Carbon::today();
        $existing = Attendance::where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        if ($existing) {
            return $this->errorResponse('Already clocked in today.', 400);
        }

        // Location Validation Logic
        $officeLat = \App\Models\Setting::where('key', 'office_latitude')->value('value');
        $officeLng = \App\Models\Setting::where('key', 'office_longitude')->value('value');
        $allowedRadius = \App\Models\Setting::where('key', 'attendance_allowed_radius')->value('value') ?? 100;

        if ($officeLat && $officeLng) {
            $distance = $this->calculateDistance($officeLat, $officeLng, $request->latitude, $request->longitude);
            if ($distance > $allowedRadius) {
                return $this->errorResponse('You are outside the allowed office area. (Distance: ' . round($distance) . 'm, Allowed: ' . $allowedRadius . 'm).', 400);
            }
        }

        // Determine Lateness
        $isLate = false;
        if ($employee->shift_id) {
            $shift = $employee->shift;
            $startTime = is_array($shift) ? ($shift['start_time'] ?? null) : $shift->start_time;
            $graceMinutes = is_array($shift) ? (int) ($shift['grace_period_minutes'] ?? 0) : (int) $shift->grace_period_minutes;

            if ($startTime) {
                $shiftStart = Carbon::today()->setTimeFromTimeString($startTime);
                $shiftStart->addMinutes($graceMinutes);

                if (Carbon::now()->greaterThan($shiftStart)) {
                    $isLate = true;
                }
            }
        }

        // Create Attendance
        $attendance = Attendance::create([
            'employee_id' => $employee->id,
            'date' => $today,
            'clock_in' => Carbon::now(),
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'address' => $request->address,
            'status' => $isLate ? 'late' : 'present', // Use 'late' status for accurate dashboard reporting
            'is_late' => $isLate,
        ]);

        // Notify Admins only (Super Admin is not an operational recipient)
        $admins = User::role('Admin')->get();
        Notification::send($admins, new EmployeeClockedIn($attendance));

        $msg = $isLate ? 'Clocked in successfully (Late)' : 'Clocked in successfully';
        return $this->successResponse($attendance, $msg);
    }


    public function clockOut(Request $request)
    {
        $user = Auth::user();
        $employee = $user->employee;

        $today = Carbon::today();
        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        if (!$attendance) {
            return $this->errorResponse('You have not clocked in today.', 400);
        }

        if ($attendance->clock_out) {
            return $this->errorResponse('Already clocked out.', 400);
        }

        // Location Validation Logic
        if ($request->has('latitude') && $request->has('longitude')) {
            $officeLat = \App\Models\Setting::where('key', 'office_latitude')->value('value');
            $officeLng = \App\Models\Setting::where('key', 'office_longitude')->value('value');
            $allowedRadius = \App\Models\Setting::where('key', 'attendance_allowed_radius')->value('value') ?? 100;

            if ($officeLat && $officeLng) {
                $distance = $this->calculateDistance($officeLat, $officeLng, $request->latitude, $request->longitude);
                if ($distance > $allowedRadius) {
                    return $this->errorResponse('You are outside the allowed office area. (Distance: ' . round($distance) . 'm, Allowed: ' . $allowedRadius . 'm).', 400);
                }
            }
        } else {
             // If they don't provide coordinates at all, we might want to block it, but for backward compatibility, 
             // we'll require it only if it's sent. Wait, let's require it if the office location is set.
             $officeLat = \App\Models\Setting::where('key', 'office_latitude')->value('value');
             if ($officeLat) {
                  return $this->errorResponse('Location (GPS) is required to clock out.', 400);
             }
        }

        // Determine Early Out
        $isEarly = false;
        $earlyReason = $request->reason;

        if ($employee->shift_id) {
            $shift = $employee->shift;
            $endTime = is_array($shift) ? ($shift['end_time'] ?? null) : null;
            
            if ($endTime) {
                $shiftEnd = Carbon::today()->setTimeFromTimeString($endTime);
                
                // If they clock out before shift ends
                if (Carbon::now()->lessThan($shiftEnd)) {
                    $isEarly = true;
                    // If no reason was provided, maybe auto-fill one
                    if (!$earlyReason) {
                        $earlyReason = 'Auto-detected: Clocked out early before shift end.';
                    }
                }
            }
        }

        $attendance->update([
            'clock_out' => Carbon::now(),
            'early_out_reason' => $earlyReason,
        ]);

        // Notify Admins only (Super Admin is not an operational recipient)
        $admins = User::role('Admin')->get();
        Notification::send($admins, new EmployeeClockedIn($attendance, 'clocked out'));

        return $this->successResponse($attendance, 'Clocked out successfully');
    }

    public function history(Request $request)
    {
        $user = Auth::user();
        if (!$user->employee) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        $history = Attendance::where('employee_id', $user->employee->id)
            ->orderBy('date', 'desc')
            ->take(30) // Last 30 records
            ->get();

        return response()->json([
            'data' => $history
        ]);
    }

    public function clearLogs(Request $request)
    {
        // Clearing daily operational logs is an Admin task — Super Admin is not involved
        $user = Auth::user();
        if (!$user->hasRole('Admin')) {
            return $this->errorResponse('Unauthorized. Only Admin (HR Manager) can clear attendance logs.', 403);
        }

        // Logical Clear: 
        // We delete all attendance records EXCEPT those from TODAY that are still active (no clock_out).
        // This ensures employees currently clocked in are not interrupted during your demo logic.
        $today = Carbon::today();
        
        Attendance::where(function($query) use ($today) {
            $query->whereNotNull('clock_out') // Fully completed records
                  ->orWhere('date', '<', $today); // Older abandoned records from previous days
        })->delete();

        return response()->json(['message' => 'Past & completed logs cleared (active sessions preserved).']);
    }

    // Haversine Formula for distance in meters
    private function calculateDistance($lat1, $lon1, $lat2, $lon2) {
        $earthRadius = 6371000; // in meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    public function manualClockOut(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user->hasRole(['Admin', 'Super Admin'])) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        $request->validate([
            'clock_out_time' => 'required|date_format:H:i'
        ]);

        $attendance = Attendance::findOrFail($id);
        
        $date = Carbon::parse($attendance->date)->format('Y-m-d');
        $clockOutDateTime = Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . $request->clock_out_time, 'Asia/Phnom_Penh')->setTimezone('UTC');

        $attendance->update([
            'clock_out' => $clockOutDateTime,
            'early_out_reason' => 'Manually clocked out by Admin/HR'
        ]);

        return $this->successResponse($attendance, 'Manual clock-out time saved.');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        if (!$user->hasRole(['Admin', 'Super Admin'])) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        $attendance = Attendance::findOrFail($id);
        $attendance->delete();

        return response()->json(['message' => 'Attendance record deleted successfully.']);
    }
}
