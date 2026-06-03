<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payslip;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayslipController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if ($this->isAdmin($user)) {
            $payslips = Payslip::with(['employee.user'])->orderBy('year', 'desc')->orderBy('month', 'desc')->get();
        } else {
            if (!$user->employee) {
                return response()->json([]);
            }

            $payslips = Payslip::with(['employee'])->where('employee_id', $user->employee->id)->orderBy('year', 'desc')->orderBy('month', 'desc')->get();
        }
        return response()->json($payslips);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$this->isAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'employee_id'      => 'nullable|exists:employees,id',
            'user_id'          => 'nullable|exists:users,id',
            'month'            => 'required|string',
            'year'             => 'required|string',
            'basic_salary'     => 'required|numeric|min:0',
            'overtime_amount'  => 'nullable|numeric|min:0',
            'commission'       => 'nullable|numeric|min:0',
            'attendance_bonus' => 'nullable|numeric|min:0',
            'allowances'       => 'nullable|numeric|min:0',
            'advance_deduction'=> 'nullable|numeric|min:0',
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

        $basic    = $request->basic_salary;
        $ot       = $request->overtime_amount   ?? 0;
        $comm     = $request->commission        ?? 0;
        $att      = $request->attendance_bonus  ?? 0;
        $allow    = $request->allowances        ?? 0;
        $adv      = $request->advance_deduction ?? 0;
        $ded      = $request->deductions        ?? 0;

        $net_salary = $basic + $ot + $comm + $att + $allow - $adv - $ded;

        $isSuperAdmin = $user->roles->contains('name', 'Super Admin');

        $payslip = Payslip::create([
            'employee_id'      => $employeeId,
            'month'            => $request->month,
            'year'             => $request->year,
            'basic_salary'     => $basic,
            'overtime_amount'  => $ot,
            'commission'       => $comm,
            'attendance_bonus' => $att,
            'allowances'       => $allow,
            'advance_deduction'=> $adv,
            'deductions'       => $ded,
            'net_salary'       => $net_salary,
            'status'           => $isSuperAdmin ? ($request->status ?? 'approved') : 'draft',
            'notes'            => $request->notes,
        ]);

        AuditLogger::log($request, 'PAYSLIP_GENERATED', $payslip, [
            'month'      => $payslip->month . ' ' . $payslip->year,
            'status'     => $payslip->status,
            'net_salary' => $net_salary,
        ]);

        if (in_array($payslip->status, ['approved', 'paid'])) {
            try {
                $payslip->employee?->user?->notify(new \App\Notifications\PayslipGenerated($payslip));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send payslip generation notification: ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Payslip generated successfully.', 'data' => $payslip], 201);
    }

    public function show($id)
    {
        $payslip = Payslip::with(['employee.user'])->findOrFail($id);
        $user = Auth::user();
        
        if (!$this->isAdmin($user) && !$this->belongsToUser($payslip, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        return response()->json($payslip);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!$this->isAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payslip = Payslip::findOrFail($id);
        
        $request->validate([
            'status' => 'sometimes|in:draft,pending,approved,paid',
        ]);
        
        $isSuperAdmin = $user->roles->contains('name', 'Super Admin');

        if ($request->has('status') && $request->status !== $payslip->status) {
            if (!$isSuperAdmin && in_array($request->status, ['approved', 'paid'])) {
                return response()->json(['message' => 'Only Super Admin can authorize and publish payslips.'], 403);
            }
            
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

        if ($request->hasAny(['basic_salary','overtime_amount','commission','attendance_bonus','allowances','advance_deduction','deductions'])) {
            $basic = $request->input('basic_salary',      $payslip->basic_salary);
            $ot    = $request->input('overtime_amount',   $payslip->overtime_amount);
            $comm  = $request->input('commission',        $payslip->commission);
            $att   = $request->input('attendance_bonus',  $payslip->attendance_bonus);
            $allow = $request->input('allowances',        $payslip->allowances);
            $adv   = $request->input('advance_deduction', $payslip->advance_deduction);
            $ded   = $request->input('deductions',        $payslip->deductions);

            $net_salary = $basic + $ot + $comm + $att + $allow - $adv - $ded;

            $payslip->update([
                'basic_salary'     => $basic,
                'overtime_amount'  => $ot,
                'commission'       => $comm,
                'attendance_bonus' => $att,
                'allowances'       => $allow,
                'advance_deduction'=> $adv,
                'deductions'       => $ded,
                'net_salary'       => $net_salary,
            ]);
        }
        if ($request->has('notes')) $payslip->update(['notes' => $request->notes]);

        return response()->json(['message' => 'Payslip updated successfully.', 'data' => $payslip]);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        if (!$this->isAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payslip = Payslip::findOrFail($id);
        $payslip->delete();
        
        return response()->json(['message' => 'Payslip deleted successfully.']);
    }

    public function sign($id)
    {
        $user = auth()->user();
        if (!$this->isAdmin($user)) {
            return response()->json(['message' => 'Only Admins can mark payslips as signed.'], 403);
        }

        $payslip = Payslip::findOrFail($id);

        if ($payslip->is_signed) {
            return response()->json(['message' => 'Payslip is already marked as signed.'], 400);
        }

        $payslip->update([
            'is_signed' => true,
            'signed_at' => now(),
        ]);

        return response()->json(['message' => 'Payslip marked as signed successfully.', 'data' => $payslip]);
    }

    private function isAdmin($user): bool
    {
        return $user->roles->pluck('name')->intersect(['Admin', 'Super Admin'])->isNotEmpty();
    }

    private function belongsToUser(Payslip $payslip, $user): bool
    {
        return $user->employee && (int) $payslip->employee_id === (int) $user->employee->id;
    }
}
