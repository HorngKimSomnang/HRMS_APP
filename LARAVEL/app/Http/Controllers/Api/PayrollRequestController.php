<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollRequest;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayrollRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = PayrollRequest::with(['employee.user', 'approver'])->orderBy('created_at', 'desc');

        // Optional filtering by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if (!$this->isAdmin($user)) {
            if (!$user->employee) {
                return response()->json([]);
            }
            $query->where('employee_id', $user->employee->id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:overtime,advance_payment,bonus,expense_claim',
            'date' => 'required|date',
            'value' => 'required|numeric|min:0',
            'reason' => 'required|string',
            'bank_account' => 'nullable|string',
            'bank_name' => 'nullable|string',
        ]);

        $user = Auth::user();
        if (!$user->employee) {
            return response()->json(['message' => 'Employee profile not found.'], 400);
        }
        
        $payrollRequest = PayrollRequest::create([
            'employee_id' => $user->employee->id,
            'type' => $request->type,
            'date' => $request->date,
            'value' => $request->value,
            'bank_account' => $request->bank_account,
            'bank_name' => $request->bank_name,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => ucfirst(str_replace('_', ' ', $request->type)) . ' request submitted successfully.', 
            'data' => $payrollRequest
        ], 201);
    }

    public function show($id)
    {
        $payrollRequest = PayrollRequest::with(['employee.user', 'approver'])->findOrFail($id);
        $user = Auth::user();
        
        if (!$this->isAdmin($user) && !$this->belongsToUser($payrollRequest, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        return response()->json($payrollRequest);
    }

    public function update(Request $request, $id)
    {
        $payrollRequest = PayrollRequest::findOrFail($id);
        $user = Auth::user();
        $isSuperAdmin = $user->roles->contains('name', 'Super Admin');
        $isAdmin = $user->roles->contains('name', 'Admin') || $isSuperAdmin;

        // ── Admin: Approve or Reject pending requests ──────────────────────
        if ($isAdmin && !$isSuperAdmin) {
            $request->validate([
                'status' => 'required|in:pending,approved,rejected',
            ]);

            // Admin cannot authorize if already super-admin authorized
            if ($payrollRequest->status === 'approved' && $request->status !== 'rejected') {
                return $this->errorResponse('This request has already been authorized by Super Admin.', 403);
            }

            $payrollRequest->update([
                'status'      => $request->status,
                'approved_by' => $user->id,
            ]);

            AuditLogger::log($request, 'PAYROLL_REQUEST_' . strtoupper($request->status), $payrollRequest, [
                'type'     => $payrollRequest->type,
                'status'   => $request->status,
                'net_salary' => $payrollRequest->value,
                'employee' => $payrollRequest->employee?->user?->name,
            ]);

        // ── Super Admin: Final financial authorization ──────────────────────
        } elseif ($isSuperAdmin) {
            $request->validate([
                'status' => 'required|in:pending,approved,rejected',
            ]);

            $payrollRequest->update([
                'status'      => $request->status,
                'approved_by' => $user->id,
            ]);

            AuditLogger::log($request, 'PAYROLL_REQUEST_FINAL_' . strtoupper($request->status), $payrollRequest, [
                'type'       => $payrollRequest->type,
                'status'     => $request->status,
                'net_salary' => $payrollRequest->value,
                'employee'   => $payrollRequest->employee?->user?->name,
                'override'   => true,
            ]);

        // ── Employee: Can only edit their own pending requests ─────────────
        } else {
            if (!$this->belongsToUser($payrollRequest, $user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if ($payrollRequest->status !== 'pending') {
                return response()->json(['message' => 'Cannot update processed request'], 400);
            }

            $request->validate([
                'date'   => 'sometimes|date',
                'value'  => 'sometimes|numeric|min:0.1',
                'reason' => 'sometimes|string',
            ]);

            $payrollRequest->update($request->only(['date', 'value', 'reason']));
        }

        return response()->json(['message' => 'Request updated successfully.', 'data' => $payrollRequest]);
    }

    public function destroy($id)
    {
        $payrollRequest = PayrollRequest::findOrFail($id);
        $user = Auth::user();

        if (!$this->isAdmin($user) && !$this->belongsToUser($payrollRequest, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if (!$this->isAdmin($user) && $payrollRequest->status !== 'pending') {
            return response()->json(['message' => 'Cannot delete processed request'], 400);
        }

        $payrollRequest->delete();
        return response()->json(['message' => 'Request deleted successfully.']);
    }

    private function isAdmin($user): bool
    {
        return $user->roles->pluck('name')->intersect(['Admin', 'Super Admin'])->isNotEmpty();
    }

    private function belongsToUser(PayrollRequest $payrollRequest, $user): bool
    {
        return $user->employee && (int) $payrollRequest->employee_id === (int) $user->employee->id;
    }
}
