<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\HrCatalog;
use Illuminate\Http\Request;

class LeaveTypeController extends Controller
{
    public function index()
    {
        return response()->json(HrCatalog::getLeaveTypes());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'days_allowed' => 'required|integer|min:0',
            'is_paid' => 'sometimes|boolean',
        ]);

        $types = HrCatalog::getLeaveTypes();
        foreach ($types as $type) {
            if (strtolower($type['name']) === strtolower($request->name)) {
                return response()->json(['message' => 'Leave type already exists.'], 422);
            }
        }

        $leaveType = [
            'id' => HrCatalog::nextId($types),
            'name' => $request->name,
            'days_allowed' => (int) $request->days_allowed,
            'is_paid' => (bool) $request->input('is_paid', true),
        ];
        $types[] = $leaveType;
        HrCatalog::saveLeaveTypes($types);

        return response()->json(['message' => 'Leave type created', 'data' => $leaveType], 201);
    }

    public function show($id)
    {
        $type = HrCatalog::findLeaveTypeById((int) $id);
        if (!$type) {
            return response()->json(['message' => 'Leave type not found'], 404);
        }

        return response()->json($type);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string',
            'days_allowed' => 'required|integer|min:0',
            'is_paid' => 'sometimes|boolean',
        ]);

        $types = HrCatalog::getLeaveTypes();
        $updated = null;
        foreach ($types as &$type) {
            if ((int) ($type['id'] ?? 0) === (int) $id) {
                $type['name'] = $request->name;
                $type['days_allowed'] = (int) $request->days_allowed;
                $type['is_paid'] = (bool) $request->input('is_paid', $type['is_paid'] ?? true);
                $updated = $type;
                break;
            }
        }

        if (!$updated) {
            return response()->json(['message' => 'Leave type not found'], 404);
        }

        HrCatalog::saveLeaveTypes($types);

        return response()->json(['message' => 'Leave type updated', 'data' => $updated]);
    }

    public function destroy($id)
    {
        $types = array_values(array_filter(
            HrCatalog::getLeaveTypes(),
            fn ($type) => (int) ($type['id'] ?? 0) !== (int) $id
        ));
        HrCatalog::saveLeaveTypes($types);

        return response()->json(['message' => 'Leave type deleted']);
    }
}
