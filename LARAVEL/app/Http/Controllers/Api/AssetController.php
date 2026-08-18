<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    /**
     * List assets with current holder + summary stats.
     * GET /assets?search=&status=&category=
     */
    public function index(Request $request)
    {
        $query = Asset::with(['currentAssignment.employee:id,first_name,last_name']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('code', 'like', "%{$s}%")
                ->orWhere('serial_no', 'like', "%{$s}%"));
        }

        $user = auth()->user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();
        if (empty($managedDepartmentIds)) {
            $query->whereHas('currentAssignment', function ($q) use ($user) {
                $q->where('employee_id', $user->employee?->id ?? -1);
            });
            $stats = [];
        } else {
            $query->where(function ($q) use ($managedDepartmentIds) {
                $q->whereHas('currentAssignment.employee.user', function ($q2) use ($managedDepartmentIds) {
                    $q2->whereIn('users.department_id', $managedDepartmentIds);
                })->orWhereDoesntHave('currentAssignment');
            });
            $stats = [
                'total' => Asset::count(),
                'available' => Asset::where('status', 'available')->count(),
                'assigned' => Asset::where('status', 'assigned')->count(),
                'maintenance' => Asset::where('status', 'maintenance')->count(),
                'total_value' => (float) Asset::whereNot('status', 'retired')->sum('purchase_cost'),
            ];
        }

        $assets = $query->orderBy('code')->get();

        return response()->json(['data' => $assets, 'stats' => $stats]);
    }

    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        if (!$user->hasPermissionTo('assets.create')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to create assets.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:assets,code',
            'category' => 'required|in:laptop,phone,vehicle,furniture,equipment,other',
            'serial_no' => 'nullable|string|max:100',
            'purchase_date' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric|min:0',
            'condition' => 'nullable|in:new,good,fair,poor',
            'notes' => 'nullable|string',
        ]);

        $asset = Asset::create($validated + ['status' => 'available']);

        AuditLogger::log($request, 'ASSET_CREATED', $asset, ['code' => $asset->code, 'name' => $asset->name]);

        return response()->json(['data' => $asset, 'message' => 'Asset created.'], 201);
    }

    public function update(Request $request, Asset $asset)
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        if (!$user->hasPermissionTo('assets.edit')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to edit assets.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:assets,code,' . $asset->id,
            'category' => 'sometimes|in:laptop,phone,vehicle,furniture,equipment,other',
            'serial_no' => 'nullable|string|max:100',
            'purchase_date' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric|min:0',
            'condition' => 'sometimes|in:new,good,fair,poor',
            'status' => 'sometimes|in:available,assigned,maintenance,retired',
            'notes' => 'nullable|string',
        ]);

        // Status can only be set to "assigned" through the assign flow.
        if (($validated['status'] ?? null) === 'assigned' && !$asset->currentAssignment) {
            return response()->json(['message' => 'Use the assign action to hand an asset to an employee.'], 422);
        }

        $asset->update($validated);

        AuditLogger::log($request, 'ASSET_UPDATED', $asset, $validated);

        return response()->json(['data' => $asset->fresh()->load('currentAssignment.employee:id,first_name,last_name'), 'message' => 'Asset updated.']);
    }

    public function destroy(Request $request, Asset $asset)
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        if (!$user->hasPermissionTo('assets.delete')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to delete assets.'], 403);
        }

        if ($asset->currentAssignment) {
            return response()->json(['message' => 'Cannot delete this asset because it is currently assigned to an employee.'], 400);
        }

        AuditLogger::log($request, 'ASSET_DELETED', $asset, ['code' => $asset->code, 'name' => $asset->name]);
        $asset->delete(); // soft delete

        return response()->json(['message' => 'Asset deleted.']);
    }

    /**
     * Hand the asset to an employee.
     * POST /assets/{asset}/assign
     */
    public function assign(Request $request, Asset $asset)
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        if (!$user->hasPermissionTo('assets.assign')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to assign assets.'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'assigned_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($asset->currentAssignment) {
            return response()->json(['message' => 'Asset is already assigned. Return it first.'], 422);
        }
        if (in_array($asset->status, ['maintenance', 'retired'])) {
            return response()->json(['message' => "Cannot assign an asset in '{$asset->status}' status."], 422);
        }

        $assignment = AssetAssignment::create([
            'asset_id' => $asset->id,
            'employee_id' => $validated['employee_id'],
            'assigned_at' => $validated['assigned_at'] ?? now()->toDateString(),
            'assigned_condition' => $asset->condition,
            'notes' => $validated['notes'] ?? null,
        ]);

        $asset->update(['status' => 'assigned']);

        AuditLogger::log($request, 'ASSET_ASSIGNED', $asset, ['code' => $asset->code, 'employee_id' => $validated['employee_id']]);

        return response()->json(['data' => $assignment->load('employee:id,first_name,last_name'), 'message' => 'Asset assigned.'], 201);
    }

    /**
     * Take the asset back from its current holder.
     * POST /assets/{asset}/return
     */
    public function returnAsset(Request $request, Asset $asset)
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        if (!$user->hasPermissionTo('assets.return')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to return assets.'], 403);
        }

        $validated = $request->validate([
            'returned_at' => 'nullable|date',
            'returned_condition' => 'nullable|in:new,good,fair,poor',
            'notes' => 'nullable|string',
        ]);

        $assignment = $asset->currentAssignment;
        if (!$assignment) {
            return response()->json(['message' => 'Asset is not currently assigned.'], 422);
        }

        $assignment->update([
            'returned_at' => $validated['returned_at'] ?? now()->toDateString(),
            'returned_condition' => $validated['returned_condition'] ?? null,
            'notes' => trim(($assignment->notes ? $assignment->notes . "\n" : '') . ($validated['notes'] ?? '')) ?: null,
        ]);

        $asset->update([
            'status' => 'available',
            'condition' => $validated['returned_condition'] ?? $asset->condition,
        ]);

        AuditLogger::log($request, 'ASSET_RETURNED', $asset, ['code' => $asset->code, 'employee_id' => $assignment->employee_id]);

        return response()->json(['data' => $asset->fresh()->load('currentAssignment.employee:id,first_name,last_name'), 'message' => 'Asset returned.']);
    }

    /**
     * Full assignment history for one asset.
     * GET /assets/{asset}/history
     */
    public function history(Asset $asset)
    {
        return response()->json([
            'data' => $asset->assignments()->with('employee:id,first_name,last_name')->orderByDesc('assigned_at')->get(),
        ]);
    }
}
