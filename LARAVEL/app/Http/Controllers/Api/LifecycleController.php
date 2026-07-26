<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\EmployeeEvent;
use App\Models\Offboarding;
use App\Models\Employee;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LifecycleController extends Controller
{
    /**
     * Overview for the lifecycle dashboard: expiring contracts,
     * probations ending soon, and open offboardings.
     */
    public function overview()
    {
        $soon = Carbon::today()->addDays(30);

        $expiringContracts = Contract::with('employee:id,first_name,last_name,job_title,department')
            ->where('status', 'active')
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<=', $soon)
            ->whereDate('end_date', '>=', Carbon::today())
            ->orderBy('end_date')
            ->get();

        $probations = Contract::with('employee:id,first_name,last_name,job_title,department')
            ->where('status', 'active')
            ->where('type', 'probation')
            ->orderBy('end_date')
            ->get();

        $openOffboardings = Offboarding::with('employee:id,first_name,last_name,job_title,department')
            ->whereIn('status', ['pending', 'in_progress'])
            ->orderBy('last_working_day')
            ->get();

        return response()->json([
            'expiring_contracts' => $expiringContracts,
            'probations' => $probations,
            'open_offboardings' => $openOffboardings,
            'counts' => [
                'expiring_contracts' => $expiringContracts->count(),
                'probations' => $probations->count(),
                'open_offboardings' => $openOffboardings->count(),
            ],
        ]);
    }

    /**
     * The authenticated employee's own contract (+ history). Employee-facing.
     */
    public function myContract()
    {
        $employee = Auth::user()->employee;
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        $contracts = Contract::where('employee_id', $employee->id)
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json([
            'data' => [
                'current' => $contracts->firstWhere('status', 'active'),
                'history' => $contracts->where('status', '!=', 'active')->values(),
            ],
        ]);
    }

    // ==================== Contracts ====================

    public function contractsIndex(Request $request)
    {
        $query = Contract::with('employee:id,first_name,last_name,job_title,department')
            ->orderBy('start_date', 'desc');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function contractsStore(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'type' => 'required|in:probation,fixed_term,permanent',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string',
        ]);

        // A new active contract supersedes previous active ones for this employee.
        Contract::where('employee_id', $validated['employee_id'])
            ->where('status', 'active')
            ->update(['status' => 'expired']);

        $contract = Contract::create($validated + ['status' => 'active']);

        AuditLogger::log($request, 'CONTRACT_CREATED', $contract, ['type' => $contract->type, 'employee_id' => $contract->employee_id]);

        return response()->json(['data' => $contract->load('employee:id,first_name,last_name,job_title,department'), 'message' => 'Contract created.'], 201);
    }

    public function contractsUpdate(Request $request, Contract $contract)
    {
        $validated = $request->validate([
            'type' => 'sometimes|in:probation,fixed_term,permanent',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date',
            'status' => 'sometimes|in:active,expired,terminated',
            'notes' => 'nullable|string',
        ]);

        $contract->update($validated);

        AuditLogger::log($request, 'CONTRACT_UPDATED', $contract, $validated);

        return response()->json(['data' => $contract->fresh()->load('employee:id,first_name,last_name,job_title,department'), 'message' => 'Contract updated.']);
    }

    public function contractsDestroy(Request $request, Contract $contract)
    {
        AuditLogger::log($request, 'CONTRACT_DELETED', $contract, ['employee_id' => $contract->employee_id, 'type' => $contract->type]);
        $contract->delete();
        return response()->json(['message' => 'Contract deleted.']);
    }

    // ==================== Employee events (promotion/transfer history) ====================

    public function eventsIndex(Request $request)
    {
        $query = EmployeeEvent::with(['employee:id,first_name,last_name,job_title,department', 'creator:id,name'])
            ->orderBy('effective_date', 'desc');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function eventsStore(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'type' => 'required|in:promotion,transfer,salary_change,status_change',
            'old_value' => 'nullable|string|max:255',
            'new_value' => 'nullable|string|max:255',
            'effective_date' => 'required|date',
            'notes' => 'nullable|string',
            'apply_to_employee' => 'boolean',
        ]);

        $applyToEmployee = (bool) ($validated['apply_to_employee'] ?? false);
        unset($validated['apply_to_employee']);

        $event = EmployeeEvent::create($validated + ['created_by' => Auth::id()]);

        // Optionally reflect the change on the employee record itself.
        if ($applyToEmployee && !empty($validated['new_value'])) {
            $employee = Employee::find($validated['employee_id']);
            if ($employee) {
                if ($validated['type'] === 'promotion') {
                    $employee->update(['job_title' => $validated['new_value']]);
                } elseif ($validated['type'] === 'transfer') {
                    $employee->update(['department' => $validated['new_value']]);
                }
            }
        }

        AuditLogger::log($request, 'EMPLOYEE_EVENT_RECORDED', $event, ['type' => $event->type, 'employee_id' => $event->employee_id, 'new_value' => $event->new_value]);

        return response()->json(['data' => $event->load(['employee:id,first_name,last_name,job_title,department', 'creator:id,name']), 'message' => 'Event recorded.'], 201);
    }

    public function eventsDestroy(Request $request, EmployeeEvent $event)
    {
        AuditLogger::log($request, 'EMPLOYEE_EVENT_DELETED', $event, ['type' => $event->type, 'employee_id' => $event->employee_id]);
        $event->delete();
        return response()->json(['message' => 'Event deleted.']);
    }

    // ==================== Offboarding ====================

    public function offboardingsIndex(Request $request)
    {
        $query = Offboarding::with([
            'employee' => fn ($q) => $q->withTrashed()->select('id', 'first_name', 'last_name', 'job_title', 'department'),
            'creator:id,name',
        ])->orderBy('last_working_day');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function offboardingsStore(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'resignation_date' => 'required|date',
            'last_working_day' => 'required|date|after_or_equal:resignation_date',
            'reason' => 'nullable|string',
        ]);

        $exists = Offboarding::where('employee_id', $validated['employee_id'])
            ->whereIn('status', ['pending', 'in_progress'])
            ->exists();
        if ($exists) {
            return response()->json(['message' => 'This employee already has an open offboarding.'], 422);
        }

        $offboarding = Offboarding::create($validated + [
            'status' => 'pending',
            'checklist' => Offboarding::DEFAULT_CHECKLIST,
            'created_by' => Auth::id(),
        ]);

        AuditLogger::log($request, 'OFFBOARDING_STARTED', $offboarding, ['employee_id' => $offboarding->employee_id, 'last_working_day' => $offboarding->last_working_day->toDateString()]);

        return response()->json(['data' => $offboarding->load('employee:id,first_name,last_name,job_title,department'), 'message' => 'Offboarding started.'], 201);
    }

    public function offboardingsUpdate(Request $request, Offboarding $offboarding)
    {
        $validated = $request->validate([
            'resignation_date' => 'sometimes|date',
            'last_working_day' => 'sometimes|date',
            'reason' => 'nullable|string',
            'status' => 'sometimes|in:pending,in_progress,completed',
            'checklist' => 'sometimes|array',
            'checklist.*.key' => 'required_with:checklist|string',
            'checklist.*.label' => 'required_with:checklist|string',
            'checklist.*.done' => 'required_with:checklist|boolean',
            'settlement_notes' => 'nullable|string',
        ]);

        $completingNow = ($validated['status'] ?? null) === 'completed' && $offboarding->status !== 'completed';
        if ($completingNow) {
            $validated['completed_at'] = now();
        }

        DB::transaction(function () use ($offboarding, $validated, $completingNow) {
            $offboarding->update($validated);

            if ($completingNow) {
                // Completing an offboarding terminates the employee straight to
                // Archived — no separate manual archive step needed.
                $offboarding->employee->archive();
            }
        });

        AuditLogger::log(
            $request,
            $offboarding->status === 'completed' ? 'OFFBOARDING_COMPLETED' : 'OFFBOARDING_UPDATED',
            $offboarding,
            ['employee_id' => $offboarding->employee_id, 'status' => $offboarding->status]
        );

        return response()->json([
            'data' => $offboarding->fresh()->load(['employee' => fn ($q) => $q->withTrashed()->select('id', 'first_name', 'last_name', 'job_title', 'department')]),
            'message' => 'Offboarding updated.',
        ]);
    }

    public function offboardingsDestroy(Request $request, Offboarding $offboarding)
    {
        AuditLogger::log($request, 'OFFBOARDING_DELETED', $offboarding, ['employee_id' => $offboarding->employee_id]);
        $offboarding->delete();
        return response()->json(['message' => 'Offboarding deleted.']);
    }
}
