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
        // Role is guaranteed to be Super Admin or managed by one.

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
        // Check removed: Route is guarded by Super Admin middleware



        $userData = [
            'name'  => $request->name,
            'email' => $request->email,
        ];

        if ($request->filled('password')) {
            $userData['password'] = Hash::make($request->password);
        }

        $user->update($userData);
        $user->syncRoles([$request->role]);

        return $this->successResponse(
            $user->fresh(['roles', 'employee']),
            'User updated successfully'
        );
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return $this->errorResponse('Cannot delete yourself', 403);
        }

        // Check removed: Route is guarded by Super Admin middleware

        $user->delete();
        return $this->successResponse(null, 'User deleted successfully');
    }
}
