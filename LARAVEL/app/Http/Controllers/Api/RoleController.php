<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use App\Services\AuditLogger;

class RoleController extends Controller
{
    // GET /api/admin/users
    public function indexUsers()
    {
        $user = auth()->user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();
        
        $query = User::with(['role', 'employee', 'managedDepartments']);
        
        if (empty($managedDepartmentIds)) {
            // Only see themselves if they manage no departments
            $query->where('id', $user->id);
        } else {
            // See users in managed departments, plus themselves
            $query->where(function($q) use ($managedDepartmentIds, $user) {
                $q->whereIn('department_id', $managedDepartmentIds)
                  ->orWhere('id', $user->id);
            });
        }
        
        $users = $query->get();
        return response()->json($users);
    }

    // GET /api/admin/users/{user}/roles
    public function getUserRoles(User $user)
    {
        return response()->json([
            'roles' => $user->roles->pluck('name'),
            'direct_permissions' => []
        ]);
    }

    // POST /api/admin/users/{user}/roles
    public function assignRole(Request $request, User $user)
    {
        $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        $roleName = $request->role;

        // Validation for Department Manager
        if ($roleName === 'Department Manager') {
            if (!$user->employee || empty($user->employee->department_id) && empty($user->department_id)) {
                return response()->json([
                    'message' => 'User must have a department set before being assigned as Department Manager.'
                ], 422);
            }
        }

        if ($user->hasRole($roleName)) {
            return response()->json(['message' => 'User already has this role.'], 400);
        }

        $role = Role::where('name', $roleName)->firstOrFail();
        $user->update(['role_id' => $role->id]);

        AuditLogger::log($request, 'ROLE_ASSIGNED', $user, [
            'assigned_role' => $roleName,
            'message' => "Assigned role '{$roleName}' to user {$user->id}"
        ]);

        return response()->json([
            'message' => "Role '{$roleName}' assigned successfully.",
            'roles' => $user->roles->pluck('name')
        ]);
    }

    // DELETE /api/admin/users/{user}/roles/{role}
    public function removeRole(Request $request, User $user, $role)
    {
        if (!$user->hasRole($role)) {
            return response()->json(['message' => 'User does not have this role.'], 400);
        }

        // Prevent Super Admin from removing their own Super Admin role
        if ($role === 'Super Admin' && $request->user()->id === $user->id) {
            return response()->json([
                'message' => 'You cannot remove your own Super Admin role to prevent lockout.'
            ], 403);
        }

        // Optional: Check if it's the last Super Admin in the system
        if ($role === 'Super Admin') {
            $superAdminCount = User::whereHas('role', fn($q) => $q->where('name', 'Super Admin'))->count();
            if ($superAdminCount <= 1) {
                return response()->json([
                    'message' => 'Cannot remove the last Super Admin from the system.'
                ], 403);
            }
        }

        $employeeRole = Role::where('name', 'Employee')->first();
        $user->update(['role_id' => $employeeRole?->id]);
        $user->tokens()->delete();

        AuditLogger::log($request, 'ROLE_REMOVED', $user, [
            'removed_role' => $role,
            'message' => "Removed role '{$role}' from user {$user->id}"
        ]);

        return response()->json([
            'message' => "Role '{$role}' removed successfully.",
            'roles' => $user->roles->pluck('name')
        ]);
    }

    // GET /api/admin/roles
    public function indexRoles()
    {
        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    // GET /api/admin/permissions
    public function indexPermissions()
    {
        $permissions = Permission::all();
        return response()->json($permissions);
    }

    // GET /api/admin/roles/{role}
    public function show(Role $role)
    {
        $role->load('permissions');
        return response()->json($role);
    }

    // POST /api/admin/roles
    public function store(Request $request)
    {
        if (!$request->user()->role?->is_super_admin) {
            abort(403, 'Only Super Admins can manage roles.');
        }

        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'string'
        ]);

        $role = Role::create([
            'name' => $request->name,
            'is_system' => false,
        ]);

        if ($request->has('permissions')) {
            $allPermissions = Permission::all();
            $permissionIds = $allPermissions->filter(function($p) use ($request) {
                return in_array($p->name, $request->permissions);
            })->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        AuditLogger::log($request, 'ROLE_CREATED', $role, [
            'role_name' => $role->name,
            'message' => "Created custom role '{$role->name}'"
        ]);

        return response()->json([
            'message' => 'Role created successfully',
            'role' => $role->load('permissions')
        ], 201);
    }

    // PUT /api/admin/roles/{role}
    public function update(Request $request, Role $role)
    {
        if (!$request->user()->role?->is_super_admin) {
            abort(403, 'Only Super Admins can manage roles.');
        }

        // Allow updates to proceed so permissions can be managed,
        // but name changes will be skipped below if is_system is true.
        $request->validate([
            'name' => 'required|string|unique:roles,name,' . $role->id,
            'permissions' => 'array',
            'permissions.*' => 'string'
        ]);

        if (!$role->is_system) {
            $role->update(['name' => $request->name]);
        }

        if ($request->has('permissions')) {
            $allPermissions = Permission::all();
            $permissionIds = $allPermissions->filter(function($p) use ($request) {
                return in_array($p->name, $request->permissions);
            })->pluck('id');
            $role->permissions()->sync($permissionIds);

            // Broadcast the update to all users that belong to this role
            foreach ($role->users as $roleUser) {
                broadcast(new \App\Events\PermissionChanged($roleUser, 'updated'))->toOthers();
            }
        }
        
        \App\Services\LiveDataVersion::bump('permissions');
        \App\Services\LiveDataVersion::bump('roles');

        AuditLogger::log($request, 'ROLE_UPDATED', $role, [
            'role_name' => $role->name,
            'message' => "Updated role '{$role->name}'"
        ]);

        return response()->json([
            'message' => 'Role updated successfully',
            'role' => $role->load('permissions')
        ]);
    }

    // DELETE /api/admin/roles/{role}
    public function destroy(Request $request, Role $role)
    {
        if (!$request->user()->role?->is_super_admin) {
            abort(403, 'Only Super Admins can manage roles.');
        }

        if ($role->is_system) {
            return response()->json(['message' => 'System default roles cannot be deleted.'], 403);
        }

        if ($role->users()->exists()) {
            return response()->json(['message' => 'Cannot delete role because there are users assigned to it.'], 422);
        }

        AuditLogger::log($request, 'ROLE_DELETED', null, [
            'role_name' => $role->name,
            'message' => "Deleted role '{$role->name}'"
        ]);

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }
}

