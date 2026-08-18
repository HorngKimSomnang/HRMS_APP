<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Models\Role;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with(['role', 'employee:id,user_id,employee_code,first_name,last_name'])
            ->when(! $request->boolean('all'), function ($query) {
                $query->whereHas('role', function ($roleQuery) {
                    $roleQuery->whereIn('name', ['Super Admin']);
                });
            })
            ->orderBy('name')
            ->get();

        return $this->successResponse($users);
    }

    public function store(StoreUserRequest $request)
    {
        $user = User::findOrFail($request->integer('user_id'));
        $this->changeRole($user, $request->string('role')->toString());

        return $this->successResponse(
            $user->fresh(['role', 'employee']),
            'User role updated successfully'
        );
    }

    public function show(User $user)
    {
        $user->load('role');
        return $this->successResponse($user);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $this->changeRole($user, $request->string('role')->toString());

        return $this->successResponse(
            $user->fresh(['role', 'employee']),
            'User role updated successfully'
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

    private function changeRole(User $user, string $role): void
    {
        if (
            $user->hasRole('Super Admin')
            && $role !== 'Super Admin'
            && User::whereHas('role', fn($q) => $q->where('name', 'Super Admin'))->count() <= 1
        ) {
            throw ValidationException::withMessages([
                'role' => 'The last Super Admin cannot be changed to another role.',
            ]);
        }

        $newRole = Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        
        if ($user->role_id !== $newRole->id) {
            $user->update(['role_id' => $newRole->id]);
            
            // Broadcast permission changed so the target user's sidebar updates immediately
            broadcast(new \App\Events\PermissionChanged($user, 'updated'))->toOthers();
            
            // Bump LiveData so tables like EmployeeList refresh automatically
            \App\Services\LiveDataVersion::bump('users');
            \App\Services\LiveDataVersion::bump('employees');
        }
    }
}
