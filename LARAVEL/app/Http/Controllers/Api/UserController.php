<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with(['roles', 'employee:id,user_id,employee_code,first_name,last_name'])
            ->when(! $request->boolean('all'), function ($query) {
                $query->whereHas('roles', function ($roleQuery) {
                    $roleQuery->whereIn('name', ['Admin', 'Super Admin']);
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
            $user->fresh(['roles', 'employee']),
            'User role updated successfully'
        );
    }

    public function show(User $user)
    {
        $user->load('roles');
        return $this->successResponse($user);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $this->changeRole($user, $request->string('role')->toString());

        return $this->successResponse(
            $user->fresh(['roles', 'employee']),
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
            && User::role('Super Admin')->count() <= 1
        ) {
            throw ValidationException::withMessages([
                'role' => 'The last Super Admin cannot be changed to another role.',
            ]);
        }

        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        $user->syncRoles([$role]);
    }
}
