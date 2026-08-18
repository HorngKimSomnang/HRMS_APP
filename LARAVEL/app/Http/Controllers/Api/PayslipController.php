<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Models\Payslip;
use App\Services\AuditLogger;
use App\Support\HrCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayslipController extends Controller
{
    public function preview(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'month'       => ['required', 'string', 'regex:/^(0[1-9]|1[0-2])$/'],
            'year'        => ['required', 'string', 'regex:/^\d{4}$/'],
        ]);

        $employee = \App\Models\Employee::findOrFail($request->employee_id);
        $month = $request->month;
        $year = $request->year;

        $contract = \App\Models\Contract::where('employee_id', $employee->id)
            ->whereIn('status', ['active', 'pending'])
            ->orderBy('start_date', 'desc')
            ->first();
        $basic = $contract ? $contract->salary : 0;

        // Calculate cycle dates
        if (!$contract) {
            $periodStart = \Carbon\Carbon::createFromDate((int)$year, (int)$month, 1)->startOfMonth();
            $periodEnd   = $periodStart->copy()->endOfMonth();
        } else {
            $cycleDay = \Carbon\Carbon::parse($contract->start_date)->day;
            $daysInMonth = \Carbon\Carbon::createFromDate((int)$year, (int)$month, 1)->daysInMonth;
            $actualDay = min($cycleDay, $daysInMonth);

            $periodStart = \Carbon\Carbon::createFromDate((int)$year, (int)$month, $actualDay)->startOfDay();
            $periodEnd = $periodStart->copy()->addMonth()->subDay()->endOfDay();

            if ($contract->end_date && $periodEnd->gt(\Carbon\Carbon::parse($contract->end_date)->endOfDay())) {
                $periodEnd = \Carbon\Carbon::parse($contract->end_date)->endOfDay();
            }
        }

        $payrollService = app(\App\Services\PayrollService::class);
        $calc = $payrollService->calculateDynamicData($employee, $periodStart, $periodEnd);

        $settings = \App\Models\Setting::where('group', 'payroll')->pluck('value', 'key')->toArray();
        $reduceOther = (float) ($settings['payroll_reduce_other'] ?? 0);

        $totalDeductions = $calc['unpaid_leave_amt'] + $calc['late_penalty_amt'] + $reduceOther;
        $net_salary = max(0, $basic + $calc['overtime_amt'] + $calc['attendance_bonus_amt'] + $calc['allowances_amt'] - $totalDeductions);

        return response()->json([
            'basic_salary'           => $basic,
            'overtime_amount'        => $calc['overtime_amt'],
            'unpaid_leave_deduction' => $calc['unpaid_leave_amt'],
            'net_salary'             => $net_salary,
            'summary'                => [
                'absent_unpaid_days' => $calc['absent_unpaid_days'],
                'calc_unpaid_leave'  => $calc['unpaid_leave_amt'],
                'late_days'          => $calc['late_days'],
                'calc_late_penalty'  => $calc['late_penalty_amt'],
                'ot_hours'           => $calc['ot_hours'],
                'calc_ot_amount'     => $calc['overtime_amt'],
                'on_time_days'       => $calc['on_time_days'],
                'calc_bonus'         => $calc['attendance_bonus_amt'],
                'present_days'       => $calc['present_days'],
                'calc_allowances'    => $calc['allowances_amt'],
            ]
        ]);
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $personal = $request->query('personal') || $request->query('mine');
        
        $query = Payslip::with(['employee' => fn($q) => $q->withTrashed()->with('user')])
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc');

        if ($personal) {
            $query->where('employee_id', $user->employee?->id ?? -1)
                  ->where('status', 'paid');
        } else if (!$user->hasRole('Super Admin')) {
            $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();
            if (empty($managedDepartmentIds)) {
                $query->where('employee_id', $user->employee?->id ?? -1)
                      ->where('status', 'paid');
            } else {
                $query->where(function ($q) use ($managedDepartmentIds, $user) {
                    $q->whereHas('employee.user', function ($q2) use ($managedDepartmentIds) {
                        $q2->whereIn('department_id', $managedDepartmentIds);
                    })->orWhere(function ($q3) use ($user) {
                        $q3->where('employee_id', $user->employee?->id ?? -1)
                           ->where('status', 'paid');
                    });
                });
            }
        }
        
        $payslips = $query->get();
        return response()->json($payslips);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'employee_id'      => 'nullable|exists:employees,id',
            'user_id'          => 'nullable|exists:users,id',
            'month'            => ['required', 'string', 'regex:/^(0[1-9]|1[0-2])$/'],
            'year'             => ['required', 'string', 'regex:/^\d{4}$/'],
            'basic_salary'     => 'required|numeric|min:0',
            'overtime_amount'  => 'nullable|numeric|min:0',
            'commission'       => 'nullable|numeric|min:0',
            'attendance_bonus' => 'nullable|numeric|min:0',
            'allowances'       => 'nullable|numeric|min:0',
            'advance_deduction'=> 'nullable|numeric|min:0',
            'unpaid_leave_deduction' => 'nullable|numeric|min:0',
            'deductions'       => 'nullable|numeric|min:0',
            'notes'            => 'nullable|string',
        ]);

        $employeeId = $request->employee_id;
        if (!$employeeId && $request->filled('user_id')) {
            $employeeId = \App\Models\Employee::where('user_id', $request->user_id)->value('id');
        }
        if (!$employeeId) {
            return response()->json(['message' => 'Valid employee_id or user_id is required.'], 422);
        }

        $formattedMonth = str_pad($request->month, 2, '0', STR_PAD_LEFT);
        $existing = Payslip::where('employee_id', $employeeId)
                           ->where('month', $formattedMonth)
                           ->where('year', $request->year)
                           ->exists();
        
        if ($existing) {
            return response()->json(['message' => 'A payslip for this employee already exists for the selected month and year.'], 422);
        }

        $basic    = (float) $request->basic_salary;
        $ot       = (float) ($request->overtime_amount   ?? 0);
        $comm     = (float) ($request->commission        ?? 0);
        $att      = (float) ($request->attendance_bonus  ?? 0);
        $allow    = (float) ($request->allowances        ?? 0);
        $adv      = (float) ($request->advance_deduction ?? 0);
        $unpaidLeave = (float) ($request->unpaid_leave_deduction ?? 0);
        $ded      = (float) ($request->deductions        ?? 0);

        $net_salary = $basic + $ot + $comm + $att + $allow - $adv - $unpaidLeave - $ded;

        $payslip = Payslip::create([
            'employee_id'            => $employeeId,
            'month'                  => $request->month,
            'year'                   => $request->year,
            'basic_salary'           => $basic,
            'overtime_amount'        => $ot,
            'commission'             => $comm,
            'attendance_bonus'       => $att,
            'allowances'             => $allow,
            'advance_deduction'      => $adv,
            'unpaid_leave_deduction' => $unpaidLeave,
            'deductions'             => $ded,
            'net_salary'             => $net_salary,
            'status'                 => 'draft',
            'notes'                  => $request->notes,
            'requires_signature'     => false,
        ]);

        AuditLogger::log($request, 'PAYSLIP_GENERATED', $payslip, [
            'month'      => $payslip->month . ' ' . $payslip->year,
            'status'     => $payslip->status,
            'net_salary' => $net_salary,
        ]);

        if ($payslip->status === 'paid') {
            try {
                $payslip->employee?->user?->notify(new \App\Notifications\PayslipGenerated($payslip));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send payslip generation notification: ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Payslip generated successfully.', 'data' => $payslip], 201);
    }

    public function batchStore(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'month' => ['required', 'string', 'regex:/^(0[1-9]|1[0-2])$/'],
            'year'  => ['required', 'string', 'regex:/^\d{4}$/'],
        ]);

        $month = $request->month;
        $year = $request->year;

        $employees = \App\Models\Employee::where('status', 'active')->get();
        
        $generatedCount = 0;
        $skippedCount = 0;

        // Leave types flagged is_paid=false (e.g. "Unpaid Leave") reduce pay;
        // annual/sick/maternity/paternity etc. do not.
        $unpaidLeaveTypeNames = collect(HrCatalog::getLeaveTypes())
            ->reject(fn (array $type) => $type['is_paid'] ?? true)
            ->map(fn (array $type) => strtolower($type['name']))
            ->all();

        foreach ($employees as $employee) {
            // Check if payslip already exists
            $exists = Payslip::where('employee_id', $employee->id)
                ->where('month', $month)
                ->where('year', $year)
                ->exists();

            if ($exists) {
                $skippedCount++;
                continue;
            }

            $basic = $employee->basic_salary ?? 0;
            
            // Calculate Overtime for this month and year
            $totalHours = \App\Models\Overtime::where('employee_id', $employee->id)
                ->where('status', 'approved')
                ->whereMonth('date', $month)
                ->whereYear('date', $year)
                ->sum('hours');
                
            $hourlyRate = $basic > 0 ? ($basic / 160) : 0;
            $overtimeAmount = round($totalHours * $hourlyRate * 1.5, 2);

            // Deduct pay for approved unpaid-leave days taken this month.
            // Daily rate assumes a 20-working-day month (same 160h/8h basis as the overtime rate above).
            $unpaidLeaveDays = (int) Leave::where('employee_id', $employee->id)
                ->where('status', 'approved')
                ->whereMonth('start_date', $month)
                ->whereYear('start_date', $year)
                ->get()
                ->filter(fn ($leave) => in_array(strtolower($leave->leave_type), $unpaidLeaveTypeNames))
                ->sum('days_count');

            $dailyRate = $basic > 0 ? $basic / 20 : 0;
            $unpaidLeaveDeduction = round($dailyRate * $unpaidLeaveDays, 2);

            $net_salary = max(0, $basic + $overtimeAmount - $unpaidLeaveDeduction);

            $payslip = Payslip::create([
                'employee_id'            => $employee->id,
                'month'                  => $month,
                'year'                   => $year,
                'basic_salary'           => $basic,
                'overtime_amount'        => $overtimeAmount,
                'commission'             => 0,
                'attendance_bonus'       => 0,
                'allowances'             => 0,
                'advance_deduction'      => 0,
                'unpaid_leave_deduction' => $unpaidLeaveDeduction,
                'deductions'             => 0,
                'net_salary'             => $net_salary,
                'status'                 => 'draft',
                'notes'                  => 'Auto-generated via Batch Payroll',
                'requires_signature'     => false,
            ]);

            AuditLogger::log($request, 'PAYSLIP_GENERATED', $payslip, [
                'month'                  => $payslip->month . ' ' . $payslip->year,
                'status'                 => $payslip->status,
                'net_salary'             => $net_salary,
                'unpaid_leave_deduction' => $unpaidLeaveDeduction,
                'batch'                  => true,
            ]);

            $generatedCount++;
        }

        return response()->json([
            'message' => "Batch payroll completed. Generated: $generatedCount, Skipped (already exists): $skippedCount."
        ], 201);
    }

    public function show(int|string $id)
    {
        $payslip = Payslip::with(['employee.user'])->findOrFail($id);
        $user = Auth::user();
        
        if (!$user->hasRole('Super Admin') && !$this->belongsToUser($payslip, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        return response()->json($payslip);
    }

    public function update(Request $request, int|string $id)
    {
        $user = Auth::user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payslip = Payslip::findOrFail($id);

        // Locked payslips belong to archived employees — block all status changes.
        // The lock is automatically lifted when the employee is restored.
        if ($payslip->status === 'locked') {
            return response()->json([
                'message' => 'This payslip is locked because the employee is currently archived. Restore the employee first.',
            ], 422);
        }

        $request->validate([
            'status' => 'sometimes|in:draft,pending,approved,paid,locked',
        ]);
        
        $isSuperAdmin = $user->hasRole('Super Admin');

        $payslip->load('employee');
        if (!$isSuperAdmin && $payslip->employee && $payslip->employee->user_id === $user->id) {
            return response()->json(['message' => 'Super Admins cannot modify their own payslips. Super Admin must do it.'], 403);
        }

        if ($request->has('status') && $request->status !== $payslip->status) {
            AuditLogger::log($request, 'PAYSLIP_STATUS_CHANGED', $payslip, [
                'status'      => $request->status,
                'from_status' => $payslip->status,
                'net_salary'  => $payslip->net_salary,
                'month'       => $payslip->month . ' ' . $payslip->year,
            ]);
            
            $payslip->update(['status' => $request->status]);

            try {
                $payslip->employee?->user?->notify(new \App\Notifications\PayslipStatusChanged($payslip));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send payslip status notification: ' . $e->getMessage());
            }
        }

        if ($request->hasAny(['basic_salary','overtime_amount','commission','attendance_bonus','allowances','advance_deduction','unpaid_leave_deduction','deductions'])) {
            $basic = (float) $request->input('basic_salary',            $payslip->basic_salary);
            $ot    = (float) $request->input('overtime_amount',         $payslip->overtime_amount);
            $comm  = (float) $request->input('commission',              $payslip->commission);
            $att   = (float) $request->input('attendance_bonus',        $payslip->attendance_bonus);
            $allow = (float) $request->input('allowances',              $payslip->allowances);
            $adv   = (float) $request->input('advance_deduction',       $payslip->advance_deduction);
            $unpaidLeave = (float) $request->input('unpaid_leave_deduction', $payslip->unpaid_leave_deduction);
            $ded   = (float) $request->input('deductions',              $payslip->deductions);

            $net_salary = $basic + $ot + $comm + $att + $allow - $adv - $unpaidLeave - $ded;

            $payslip->update([
                'basic_salary'           => $basic,
                'overtime_amount'        => $ot,
                'commission'             => $comm,
                'attendance_bonus'       => $att,
                'allowances'             => $allow,
                'advance_deduction'      => $adv,
                'unpaid_leave_deduction' => $unpaidLeave,
                'deductions'             => $ded,
                'net_salary'             => $net_salary,
            ]);
        }
        if ($request->has('notes')) $payslip->update(['notes' => $request->notes]);

        return response()->json(['message' => 'Payslip updated successfully.', 'data' => $payslip]);
    }

    public function destroy(int|string $id)
    {
        $user = Auth::user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payslip = Payslip::findOrFail($id);
        
        $isSuperAdmin = $user->hasRole('Super Admin');
        $payslip->load('employee');
        if (!$isSuperAdmin && $payslip->employee && $payslip->employee->user_id === $user->id) {
            return response()->json(['message' => 'Super Admins cannot delete their own payslips.'], 403);
        }

        AuditLogger::log(request(), 'PAYSLIP_DELETED', $payslip, [
            'id' => $payslip->id,
            'net_salary' => $payslip->net_salary
        ]);
        $payslip->delete();
        
        return response()->json(['message' => 'Payslip deleted successfully.']);
    }

    public function sign(Request $request, int|string $id)
    {
        $user = Auth::user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only Super Admins can mark payslips as signed.'], 403);
        }

        $payslip = Payslip::findOrFail($id);

        if ($payslip->is_signed) {
            return response()->json(['message' => 'Payslip is already marked as signed.'], 400);
        }

        // Verification is proven by the scanned copy of the physically-signed paper,
        // not a click — uploading it is what marks the payslip as signed.
        $request->validate([
            'signed_document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $path = $request->file('signed_document')->store('payslip_signatures', 'public');

        $payslip->update([
            'is_signed' => true,
            'signed_at' => now(),
            'signed_document_path' => $path,
        ]);

        return response()->json(['message' => 'Payslip marked as signed successfully.', 'data' => $payslip]);
    }

    /**
     * One scan of the whole signed roster verifies several employees at once.
     * The admin visually confirms each row against the scan and checks it off
     * client-side — this endpoint just applies that confirmed list, it does not
     * itself decide who signed.
     */
    public function signBatch(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only Super Admins can mark payslips as signed.'], 403);
        }

        $request->validate([
            'payslip_ids'      => 'required|array|min:1',
            'payslip_ids.*'    => 'integer|exists:payslips,id',
            'signed_document'  => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $isSuperAdmin = $user->hasRole('Super Admin');
        $path = $request->file('signed_document')->store('payslip_signatures', 'public');

        $verifiedCount = 0;
        $skippedCount = 0;

        /** @var \Illuminate\Support\Collection<int, \App\Models\Payslip> $batchPayslips */
        $batchPayslips = Payslip::with('employee')->whereIn('id', $request->payslip_ids)->get();

        foreach ($batchPayslips as $payslip) {
            if ($payslip->is_signed) {
                $skippedCount++;
                continue;
            }
            if (!$isSuperAdmin && $payslip->employee && $payslip->employee->user_id === $user->id) {
                $skippedCount++;
                continue;
            }

            $payslip->update([
                'is_signed' => true,
                'signed_at' => now(),
                'signed_document_path' => $path,
            ]);
            $verifiedCount++;

            AuditLogger::log($request, 'PAYSLIP_STATUS_CHANGED', $payslip, [
                'action'  => 'signed_via_roster_scan',
                'month'   => $payslip->month . ' ' . $payslip->year,
            ]);
        }

        $message = "Verified $verifiedCount payslip" . ($verifiedCount === 1 ? '' : 's') . " from the scan.";
        if ($skippedCount > 0) {
            $message .= " $skippedCount skipped (already signed or self-payslip).";
        }

        return response()->json([
            'message' => $message,
            'verified' => $verifiedCount,
            'skipped' => $skippedCount,
        ]);
    }

    /**
     * Best-effort auto-suggestion for which rows on a scanned roster look signed.
     * This is pixel-density ink detection, not handwriting recognition — it can be
     * thrown off by skew, shadows, or smudges. The frontend pre-checks these
     * suggestions but still requires the admin to review/confirm before signBatch()
     * actually commits anything, so a bad guess here never silently authorizes pay.
     */
    public function detectSignatures(Request $request)
    {
        $user = Auth::user();
        if (!$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Only Super Admins can do this.'], 403);
        }

        $request->validate([
            'payslip_ids'      => 'required|array|min:1',
            'payslip_ids.*'    => 'integer',
            'signed_document'  => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $ids  = array_values($request->payslip_ids);
        $file = $request->file('signed_document');

        // Ink detection only works on raster images — a PDF upload just skips
        // straight to manual review (no suggestions, not an error).
        if (!in_array($file->getMimeType(), ['image/jpeg', 'image/png'])) {
            return response()->json(['suggestions' => array_fill_keys($ids, false)]);
        }

        $image = @imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (!$image) {
            return response()->json(['suggestions' => array_fill_keys($ids, false)]);
        }

        $width  = imagesx($image);
        $height = imagesy($image);

        // Fixed fractions derived from the actual roster PDF's known geometry
        // (A4 portrait 210x297mm, table startY=48mm, header row ~14mm,
        // minCellHeight=24mm, signature column spans x=146mm to x=196mm).
        // Rows do NOT stretch to fill the image — a short roster (few employees)
        // leaves real blank space below the table before the footer signature
        // lines, and treating that blank space as part of the last row's band
        // is exactly what caused false positives on unsigned rosters.
        $tableTopFraction    = 48 / 297;
        $headerRowFraction   = 14 / 297;
        $bodyRowFraction     = 24 / 297;
        $sigColStartFraction = 146 / 210; // signature col starts after No(10)+Name(25)+Position(18)+Basic(18)+Allow(15)+Deduct(15)+Net(18)+Date(13) = 132mm + 14mm margin
        $sigColEndFraction   = 196 / 210; // stop at the table's right border — beyond it are
                                          // page margins where scan shadows read as "ink".

        $sigColStart = (int) ($width * $sigColStartFraction);
        $sigColEnd   = (int) ($width * $sigColEndFraction);

        // Pass 1: measure the dark-pixel ratio of every row's signature band.
        $ratios = [];
        foreach ($ids as $i => $id) {
            $rowTop = $height * ($tableTopFraction + $headerRowFraction + $i * $bodyRowFraction);
            $rowBottom = min((float) $height, $rowTop + $height * $bodyRowFraction);

            // Inset the sampled band so the row's own top/bottom grid border
            // (a thin line, but still "dark" pixels) isn't mistaken for ink.
            $inset  = ($rowBottom - $rowTop) * 0.2;
            $yStart = (int) ($rowTop + $inset);
            $yEnd   = (int) ($rowBottom - $inset);

            $darkPixels = 0;
            $sampled    = 0;
            for ($y = $yStart; $y < $yEnd; $y += 2) {
                for ($x = $sigColStart; $x < $sigColEnd; $x += 2) {
                    $rgb = imagecolorat($image, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;
                    if (($r + $g + $b) / 3 < 180) $darkPixels++;
                    $sampled++;
                }
            }

            $ratios[$id] = $sampled > 0 ? $darkPixels / $sampled : 0;
        }

        // Pass 2: decide. A row is "signed" when it's clearly inkier than the page's
        // cleanest row (relative check handles light pens and grey scans), or when it
        // passes the absolute threshold outright (handles rosters where everyone signed).
        //
        // The relative check has a hard floor of 0.018 regardless of how clean the
        // "cleanest" row measures. Without that floor, a fully blank roster (every row's
        // ratio near 0) collapses the relative term to ~0.002-0.004 — well within what a
        // real-world photo's shadows, uneven lighting, or JPEG compression noise produce
        // even where nobody has signed, causing false positives on genuinely blank pages.
        $minRatio = count($ratios) > 0 ? min($ratios) : 0;
        $suggestions = [];
        foreach ($ratios as $id => $ratio) {
            $suggestions[$id] = $ratio > 0.02
                || $ratio > max(0.018, $minRatio * 4 + 0.006);
        }

        return response()->json(['suggestions' => $suggestions, 'ratios' => $ratios]);
    }



    private function belongsToUser(Payslip $payslip, \App\Models\User $user): bool
    {
        return $user->employee && (int) $payslip->employee_id === (int) $user->employee->id;
    }
}
