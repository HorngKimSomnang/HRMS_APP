<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\PasswordPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request) {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'string', 'confirmed', PasswordPolicy::rule()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'data' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function login(Request $request) {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            // Log failed login attempt (no authenticated user yet)
            AuditLogger::logAuth($request, 'LOGIN_FAILED', null, [
                'email'  => $request->email,
                'reason' => 'Invalid credentials',
            ]);

            return response()->json(['message' => 'Invalid login details'], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->load(['role', 'assignedRoles', 'department', 'employee.department', 'employee.contracts', 'managedDepartments']);

        // Resolve active role at login if necessary
        $assignedRoles = $user->assignedRoles;
        $superAdminRole = $assignedRoles->firstWhere('is_super_admin', true);
        if ($superAdminRole) {
            if (!$user->role || !$user->role->is_super_admin) {
                $user->update(['role_id' => $superAdminRole->id]);
                $user->load('role');
            }
        } else {
            if (!$user->role || $user->role->permissions()->count() === 0) {
                foreach ($assignedRoles as $assignedRole) {
                    if ($assignedRole->permissions()->count() > 0) {
                        $user->update(['role_id' => $assignedRole->id]);
                        $user->load('role');
                        break;
                    }
                }
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        AuditLogger::logAuth($request, 'LOGIN_SUCCESS', $user);

        return response()->json([
               'message'      => 'Hi ' . $user->name . ', welcome to home',
               'access_token' => $token,
               'token_type'   => 'Bearer',
               'user'         => $user,
               'permissions'  => $user->getAllPermissions()->pluck('name'),
               'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
        ]);
    }

    public function logout(Request $request) {
        $user = $request->user();
        AuditLogger::logAuth($request, 'LOGOUT', $user);

        $user->currentAccessToken()->delete();

        return response()->json(['message' => 'You have successfully logged out and the token was successfully deleted']);
    }

    public function me(Request $request) {
        $user = $request->user()->load(['role', 'assignedRoles', 'department', 'employee.department', 'employee.contracts', 'managedDepartments']);
        // Return plain name strings for permissions — same shape as login(), avoids Eloquent object bleed
        return response()->json([
            'user'               => $user,
            'permissions'        => $user->getAllPermissions()->pluck('name')->values(),
            'direct_permissions' => $user->getDirectPermissions()->pluck('name')->values(),
        ]);
    }

    public function changePassword(Request $request) {
        $user = $request->user();
        
        // First time changing the auto-generated password? (explicit flag on the user)
        $needsPasswordChange = $user->needs_password_change;

        if (!$needsPasswordChange) {
            $request->validate([
                'current_password' => 'required',
                'password' => ['required', 'string', 'confirmed', PasswordPolicy::rule()],
            ]);

            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json(['message' => 'Current password does not match.'], 400);
            }
        } else {
            $request->validate([
                'password' => ['required', 'string', 'confirmed', PasswordPolicy::rule()],
            ]);
        }

        $user->password = Hash::make($request->password);
        $user->password_changed_at = now();
        $user->save();

        \App\Services\LiveDataVersion::bump('user');

        AuditLogger::logAuth($request, 'PASSWORD_CHANGED', $user);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    public function updateProfile(Request $request) {
        $user = $request->user();
        $employee = $user->employee;

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
        ]);

        // Account fields — work even without an employee record (e.g. Super Admin)
        if ($request->filled('name')) {
            $user->name = $request->name;
        }
        if ($request->has('email')) {
            $user->email = $request->email;
        }
        $user->save();

        // Employee fields — only when an employee record exists
        if ($employee) {
            if ($request->filled('first_name')) $employee->first_name = $request->first_name;
            if ($request->filled('last_name')) $employee->last_name = $request->last_name;
            
            // In case a generic name is passed instead of first/last
            if ($request->filled('name') && !$request->filled('first_name')) {
                $parts = explode(' ', $request->name, 2);
                $employee->first_name = $parts[0] ?? '';
                if (isset($parts[1])) {
                    $employee->last_name = $parts[1];
                }
            }

            if ($request->filled('phone')) $employee->phone = $request->phone;
            if ($request->filled('address')) $employee->address = $request->address;
            if ($request->has('documents')) $employee->documents = $request->documents;
            
            if ($request->hasFile('profile_picture')) {
                if ($employee->profile_picture) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($employee->profile_picture);
                }
                $path = $request->file('profile_picture')->store('profile_pictures', 'public');
                $employee->profile_picture = $path;
            }
            
            $employee->save();
        }

        AuditLogger::logAuth($request, 'PROFILE_UPDATED', $user);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => $user->fresh(['role', 'assignedRoles', 'department', 'employee.department', 'employee.contracts', 'managedDepartments'])
        ]);
    }

    public function switchRole(Request $request)
    {
        $request->validate([
            'role_id' => 'required|exists:roles,id'
        ]);

        $user = $request->user();
        
        // Ensure the user actually has this role assigned to them
        $hasRole = $user->assignedRoles()->where('roles.id', $request->role_id)->exists();
        if (!$hasRole) {
            return response()->json(['message' => 'You are not assigned to this role.'], 403);
        }

        // Update the active role
        $user->update(['role_id' => $request->role_id]);
        
        $user->load(['role', 'assignedRoles', 'department', 'employee.department', 'employee.contracts', 'managedDepartments']);
        
        AuditLogger::logAuth($request, 'ROLE_SWITCHED', $user, [
            'switched_role_id' => $request->role_id,
            'switched_role_name' => $user->role->name,
            'message' => "Switched active role to '{$user->role->name}'"
        ]);

        return response()->json([
            'message' => 'Role switched successfully',
            'user' => $user,
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
            'direct_permissions' => $user->getDirectPermissions()->pluck('name')->values(),
        ]);
    }
}
