<?php

namespace App\Http\Controllers\Api;

use App\Events\PermissionChanged;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;

class EmployeePermissionController extends Controller
{
    /**
     * Grant a direct permission
     */
    public function grant(Request $request, Employee $employee)
    {
        // Must be Super Admin to grant permissions
        if (!$request->user()->hasPermissionTo('employees.edit') && !$request->user()->hasRole('Super Admin')) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'permission' => 'required|string',
        ]);

        $allPermissions = Permission::all();
        $targetPerm = $allPermissions->firstWhere('name', $validated['permission']);
        
        if (!$targetPerm) {
            abort(404, 'Permission not found');
        }

        $targetUser = $employee->user;

        $targetUser->givePermissionTo($targetPerm->name);

        // Audit Log
        \App\Models\AuditLog::create([
            'user_id' => $request->user()->id,
            'role' => 'Super Admin',
            'action' => 'granted_permission',
            'model_type' => \App\Models\User::class,
            'model_id' => $targetUser->id,
            'context' => ['permission_granted' => $validated['permission']],
            'ip_address' => $request->ip(),
        ]);

        \App\Services\LiveDataVersion::bump('permissions');

        // Broadcast to the employee's private channel so the React client can
        // refresh permissions live — no logout, no manual page reload needed.
        broadcast(new PermissionChanged($targetUser, 'granted'))->toOthers();

        return response()->json(['message' => 'Permission granted successfully']);
    }

    /**
     * Revoke a direct permission
     */
    public function revoke(Request $request, Employee $employee, $perm)
    {
        $actor = $request->user();
        $targetUser = $employee->user;

        // Check auth: Super Admin or Manager of this employee's department
        if ($actor->hasPermissionTo('employees.edit') || $actor->hasRole('Super Admin')) {
            $actorRole = 'Super Admin';
        } elseif ($actor->managedDepartments()->exists()) {
            $actorRole = 'Manager';

            // Must have permission to revoke team access (if that was the old role behavior, mapped to permissions.revoke_team)
            // Wait, the prompt says: "Keep the roles.revoke_team-equivalent gate, but as a permission... permissions.revoke_team"
            if (!$actor->hasPermissionTo('permissions.revoke_team')) {
                abort(403, 'You do not have permission to revoke team access.');
            }

            abort_unless(
                $actor->managedDepartments->pluck('id')->contains($employee->department_id),
                403,
                'You can only manage employees in your assigned department(s).'
            );

            // Block revoking from other Managers or Super Admin
            if ($targetUser->hasRole('Super Admin') || $targetUser->managedDepartments()->exists()) {
                abort(403, 'You cannot revoke permissions from Super Admins or other Managers.');
            }
        } else {
            abort(403, 'Unauthorized action.');
        }

        // Replace hyphens with dots if the route parameter was converted (e.g. leave-approve -> leave.approve)
        // Usually Laravel keeps dots in params if constraints allow, but let's be safe.
        // Or we can just use query param, but the route says /permissions/{perm}
        // Let's assume perm comes exactly as feature.action
        
        $permissionName = $perm; 
        
        DB::transaction(function () use ($actor, $targetUser, $permissionName, $actorRole, $request) {
            $targetUser->revokePermissionTo($permissionName);
            
            // Revoke tokens for instant logout
            $targetUser->tokens()->delete();
            
            // Audit Log
            \App\Models\AuditLog::create([
                'user_id' => $actor->id,
                'role' => $actorRole,
                'action' => 'revoked_permission',
                'model_type' => \App\Models\User::class,
                'model_id' => $targetUser->id,
                'context' => ['permission_revoked' => $permissionName],
                'ip_address' => $request->ip(),
            ]);
        });

        \App\Services\LiveDataVersion::bump('permissions');

        // Broadcast revocation so the React client redirects immediately to login.
        broadcast(new PermissionChanged($targetUser, 'revoked'))->toOthers();

        return response()->json(['message' => 'Permission revoked and user logged out']);
    }

    /**
     * Assign managed departments
     */
    public function assignManagedDepartments(Request $request, Employee $employee)
    {
        if (!$request->user()->hasPermissionTo('employees.edit') && !$request->user()->hasRole('Super Admin')) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'department_ids' => 'array',
            'department_ids.*' => 'exists:departments,id',
        ]);

        $targetUser = $employee->user;
        $targetUser->managedDepartments()->sync($validated['department_ids'] ?? []);

        \App\Services\LiveDataVersion::bump('permissions');
        \App\Services\LiveDataVersion::bump('employees');

        return response()->json(['message' => 'Managed departments updated successfully']);
    }
    /**
     * Bulk update permissions, job title, and departments
     */
    public function bulkUpdate(Request $request, Employee $employee)
    {
        if (!$request->user()->hasPermissionTo('employees.manage_access')) {
            abort(403, 'Unauthorized action.');
        }

        if (!$request->user()->role?->is_super_admin) {
            abort(403, 'Only Super Admins can manage employee access.');
        }

        $validated = $request->validate([
            'role_ids' => 'required|array|min:1',
            'role_ids.*' => 'exists:roles,id',
            'department_id' => 'required|exists:departments,id',
            'managed_departments' => 'array',
            'managed_departments.*' => 'exists:departments,id',
        ]);

        $targetUser = $employee->user;

        $superAdminRole = \App\Models\Role::where('is_super_admin', true)->first();
        $targetUserWasSuperAdmin = $superAdminRole && $targetUser->role_id === $superAdminRole->id;
        $targetUserIsSuperAdmin = $superAdminRole && in_array($superAdminRole->id, $validated['role_ids']);

        if ($superAdminRole && $targetUserWasSuperAdmin && !$targetUserIsSuperAdmin) {
            $superAdminCount = \App\Models\User::where('role_id', $superAdminRole->id)->count();
            if ($superAdminCount <= 1) {
                return response()->json(['message' => 'Cannot change role: There must be at least one Super Admin in the system.'], 403);
            }
        }

        // Protect Super Admin's department coverage: explicitly reject any attempt to reduce it.
        // A Super Admin must always manage every department.
        if ($superAdminRole && $targetUserIsSuperAdmin) {
            $allDepartmentIds = \App\Models\Department::pluck('id')->sort()->values()->toArray();
            $incomingIds = collect($validated['managed_departments'] ?? [])->map('intval')->sort()->values()->toArray();
            $isReduction = $incomingIds !== $allDepartmentIds;

            if ($isReduction) {
                // Write rejected-attempt audit log before returning
                \App\Models\AuditLog::create([
                    'user_id'    => $request->user()->id,
                    'role'       => 'Super Admin',
                    'action'     => 'rejected_super_admin_department_reduction',
                    'model_type' => \App\Models\User::class,
                    'model_id'   => $targetUser->id,
                    'context'    => [
                        'attempted_managed_departments' => $validated['managed_departments'] ?? [],
                        'required_all_departments'      => $allDepartmentIds,
                        'target_user_email'             => $targetUser->email,
                    ],
                    'ip_address' => $request->ip(),
                ]);

                return response()->json([
                    'message' => 'Cannot reduce department coverage for a Super Admin. Super Admins must manage all departments.',
                ], 403);
            }
        }

        DB::transaction(function () use ($targetUser, $employee, $validated, $superAdminRole, $targetUserIsSuperAdmin) {
            $currentActiveRole = $targetUser->role_id;
            $newActiveRole = in_array($currentActiveRole, $validated['role_ids']) ? $currentActiveRole : $validated['role_ids'][0];

            // Employee model no longer has department_id; it was moved to User.
            $targetUser->update([
                'role_id'       => $newActiveRole,
                'department_id' => $validated['department_id'],
            ]);

            // Sync assigned roles
            $targetUser->assignedRoles()->sync($validated['role_ids']);

            if ($targetUserIsSuperAdmin) {
                // Being assigned Super Admin: ensure full coverage
                $targetUser->managedDepartments()->sync(\App\Models\Department::pluck('id'));
            } else {
                $targetUser->managedDepartments()->sync($validated['managed_departments'] ?? []);
            }
        });

        // Send Congratulatory Email
        try {
            \Illuminate\Support\Facades\Mail::to($targetUser->email)->send(new \App\Mail\PermissionGrantedMail($targetUser, 'Role Updated'));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send permission granted email: ' . $e->getMessage());
        }

        // Send In-App Notification dynamically
        try {
            $targetUser->notify(new \App\Notifications\PermissionUpdatedNotification('Role Updated', 'updated'));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send permission granted notification: ' . $e->getMessage());
        }

        // Audit Log
        \App\Models\AuditLog::create([
            'user_id' => $request->user()->id,
            'role' => 'Super Admin',
            'action' => 'bulk_updated_employee_permissions',
            'model_type' => \App\Models\User::class,
            'model_id' => $targetUser->id,
            'context' => [
                'role_ids' => $validated['role_ids'],
                'department_id' => $validated['department_id'],
                'managed_departments' => $validated['managed_departments'] ?? [],
            ],
            'ip_address' => $request->ip(),
        ]);

        \App\Services\LiveDataVersion::bump('permissions');
        \App\Services\LiveDataVersion::bump('users');
        \App\Services\LiveDataVersion::bump('employees');
        // Broadcast to the employee's private channel — React picks this up and refreshes permissions live.
        broadcast(new PermissionChanged($targetUser, 'updated'))->toOthers();

        return response()->json(['message' => 'Employee permissions updated successfully']);
    }
}
