<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Support\HrCatalog;
use Illuminate\Validation\Rule;
use App\Models\Employee;

class ShiftController extends Controller
{
    public function index()
    {
        $shifts = HrCatalog::getShifts();
        return response()->json(['data' => $shifts]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'grace_period_minutes' => 'nullable|integer',
            'work_days' => 'required|array|min:1',
            'work_days.*' => ['required', Rule::in(HrCatalog::defaultWorkDays())],
        ]);

        $shifts = HrCatalog::getShifts();
        $shift = [
            'id' => HrCatalog::nextId($shifts),
            'name' => $validated['name'],
            'start_time' => $validated['start_time'] . ':00',
            'end_time' => $validated['end_time'] . ':00',
            'grace_period_minutes' => $validated['grace_period_minutes'] ?? 15,
            'work_days' => array_values($validated['work_days']),
        ];
        $shifts[] = $shift;
        HrCatalog::saveShifts($shifts);

        return response()->json(
            ['data' => $shift, 'message' => 'Shift created successfully.'],
            201
        );
    }

    public function show(int|string $id)
    {
        $shift = HrCatalog::findShiftById((int) $id);
        if (!$shift) {
            return response()->json(['message' => 'Shift not found.'], 404);
        }

        return response()->json(['data' => $shift]);
    }

    public function update(Request $request, int|string $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'required|date_format:H:i:s,H:i',
            'end_time' => 'required|date_format:H:i:s,H:i',
            'grace_period_minutes' => 'nullable|integer',
            'work_days' => 'required|array|min:1',
            'work_days.*' => ['required', Rule::in(HrCatalog::defaultWorkDays())],
        ]);

        $shifts = HrCatalog::getShifts();
        $updated = null;
        foreach ($shifts as &$shift) {
            if ((int) ($shift['id'] ?? 0) === (int) $id) {
                $shift['name'] = $validated['name'];
                $shift['start_time'] = strlen($validated['start_time']) === 5 ? $validated['start_time'] . ':00' : $validated['start_time'];
                $shift['end_time'] = strlen($validated['end_time']) === 5 ? $validated['end_time'] . ':00' : $validated['end_time'];
                $shift['grace_period_minutes'] = (int) ($validated['grace_period_minutes'] ?? 15);
                $shift['work_days'] = array_values($validated['work_days']);
                $updated = $shift;
                break;
            }
        }

        if (!$updated) {
            return response()->json(['message' => 'Shift not found.'], 404);
        }

        HrCatalog::saveShifts($shifts);

        return response()->json(['data' => $updated, 'message' => 'Shift updated successfully.']);
    }

    public function destroy(int|string $id)
    {
        if (Employee::where('shift_id', $id)->exists()) {
            return response()->json(['message' => "Cannot delete this shift because it is currently assigned to employees."], 400);
        }

        $shifts = array_values(array_filter(
            HrCatalog::getShifts(),
            fn ($shift) => (int) ($shift['id'] ?? 0) !== (int) $id
        ));
        HrCatalog::saveShifts($shifts);
        return response()->json(['message' => 'Shift deleted successfully.']);
    }
}
