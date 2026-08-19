<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DepartmentController extends Controller
{
    public function index()
    {
        // Auto-initialize Unassigned department description if missing
        DB::table('departments')
            ->where('name', 'Unassigned')
            ->where(function($q) {
                $q->whereNull('description')->orWhere('description', '');
            })
            ->update(['description' => 'System default department for unassigned employees.']);

        $departments = Department::with(['managers.employee'])->get()->map(function ($department) {
            $department->employees_count = $this->calculateHeadcount($department);
            return $department;
        });

        return response()->json($departments);
    }

    public function store(Request $request)
    {
        // Authorization is handled by permission:departments.edit middleware on the route.
        $validated = $request->validate([
            'name' => 'required|string|unique:departments,name',
            'description' => 'nullable|string',
        ]);

        $department = Department::create($validated);
        $department->employees_count = 0;
        return response()->json($department, 201);
    }

    public function show(Department $department)
    {
        $department->load(['managers.employee']);
        $department->employees_count = $this->calculateHeadcount($department);
        return response()->json($department);
    }

    public function update(Request $request, Department $department)
    {
        if (strtolower($department->name) === 'unassigned') {
            return response()->json(['message' => 'Cannot edit the system default Unassigned department.'], 422);
        }

        // Authorization is handled by permission:departments.edit middleware on the route.
        $validated = $request->validate([
            'name' => 'required|string|unique:departments,name,' . $department->id,
            'description' => 'nullable|string',
        ]);

        $department->update($validated);
        $department->load(['managers.employee']);
        $department->employees_count = $this->calculateHeadcount($department);
        return response()->json($department);
    }

    public function destroy(Request $request, Department $department)
    {
        if (strtolower($department->name) === 'unassigned') {
            return response()->json(['message' => 'Cannot delete the system default Unassigned department.'], 422);
        }

        // Authorization is handled by permission:departments.delete middleware on the route.
        $headcount = $this->calculateHeadcount($department);
        if ($headcount > 0) {
            return response()->json([
                'message' => "Cannot delete department because {$headcount} employee(s) are still assigned to it."
            ], 422);
        }

        $department->managers()->detach();
        $department->delete();
        return response()->json(['message' => 'Department deleted successfully.']);
    }

    /**
     * Calculate unique headcount for a department (excluding managers from other departments).
     */
    private function calculateHeadcount(Department $department): int
    {
        // department_id was moved from employees to users in RBAC v2
        // Count users (employees who have user accounts) via users.department_id
        $employeeUserIds = \App\Models\User::where('department_id', $department->id)
            ->pluck('id')
            ->toArray();

        // Also count employees without user accounts via employee relationship to user
        $nonUserEmployeesCount = \App\Models\Employee::whereDoesntHave('user')
            ->whereHas('user', fn($q) => $q->where('department_id', $department->id), '<', 1)
            ->whereIn('user_id', function($query) use ($department) {
                $query->select('id')->from('users')->where('department_id', $department->id);
            })
            ->count();

        $uniqueUsersCount = count(array_unique($employeeUserIds)) + $nonUserEmployeesCount;

        return $uniqueUsersCount;
    }
}
