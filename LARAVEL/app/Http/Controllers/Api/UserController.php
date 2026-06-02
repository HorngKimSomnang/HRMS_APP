<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;

class UserController extends Controller
{
    public function index()
    {
        // Only return users who are Admins or Super Admins. Hide normal Employees.
        $users = User::with('roles')->whereHas('roles', function ($query) {
            $query->whereIn('name', ['Admin', 'Super Admin']);
        })->get();

        return $this->successResponse($users);
    }

    public function store(StoreUserRequest $request)
    {
        // Only Super Admin can assign the Super Admin role
        if ($request->role === 'Super Admin' && !auth()->user()->hasRole('Super Admin')) {
            return $this->errorResponse('Only a Super Admin can create another Super Admin account.', 403);
        }

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Ensure role exists before assigning (guards against missing seeder data)
        Role::firstOrCreate(['name' => $request->role, 'guard_name' => 'web']);
        $user->assignRole($request->role);

        return $this->successResponse($user, 'User created successfully', 201);
    }

    public function show(User $user)
    {
        $user->load('roles');
        return $this->successResponse($user);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        // Check if target is Super Admin and current user is NOT Super Admin
        if ($user->hasRole('Super Admin') && !auth()->user()->hasRole('Super Admin')) {
            return $this->errorResponse('You do not have permission to modify a Super Admin.', 403);
        }

        // Prevent role escalation: Admin cannot assign Super Admin role
        if ($request->role === 'Super Admin' && !auth()->user()->hasRole('Super Admin')) {
            return $this->errorResponse('Only a Super Admin can assign the Super Admin role.', 403);
        }

        $userData = [
            'name'  => $request->name,
            'email' => $request->email,
        ];

        if ($request->filled('password')) {
            $userData['password'] = Hash::make($request->password);
        }

        $user->update($userData);
        $user->syncRoles([$request->role]);

        return $this->successResponse($user, 'User updated successfully');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return $this->errorResponse('Cannot delete yourself', 403);
        }

        // Check if target is Super Admin and current user is NOT Super Admin
        if ($user->hasRole('Super Admin') && !auth()->user()->hasRole('Super Admin')) {
            return $this->errorResponse('You do not have permission to delete a Super Admin.', 403);
        }

        $user->delete();
        return $this->successResponse(null, 'User deleted successfully');
    }
}
