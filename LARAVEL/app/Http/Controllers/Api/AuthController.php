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
        $user->load(['roles', 'employee']);

        $token = $user->createToken('auth_token')->plainTextToken;

        AuditLogger::logAuth($request, 'LOGIN_SUCCESS', $user);

        return response()->json([
               'message'      => 'Hi ' . $user->name . ', welcome to home',
               'access_token' => $token,
               'token_type'   => 'Bearer',
               'user'         => $user,
        ]);
    }

    public function logout(Request $request) {
        $user = $request->user();
        AuditLogger::logAuth($request, 'LOGOUT', $user);

        $user->currentAccessToken()->delete();

        return response()->json(['message' => 'You have successfully logged out and the token was successfully deleted']);
    }

    public function me(Request $request) {
        return $request->user()->load(['roles', 'employee']);
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
            if ($request->filled('name')) $employee->name = $request->name;
            if ($request->has('phone')) $employee->phone = $request->phone;
            if ($request->has('address')) $employee->address = $request->address;
            if ($request->has('documents')) $employee->documents = $request->documents;
            $employee->save();
        }

        AuditLogger::logAuth($request, 'PROFILE_UPDATED', $user);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => $user->fresh(['roles', 'employee'])
        ]);
    }
}
