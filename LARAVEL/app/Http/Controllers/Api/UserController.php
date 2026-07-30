<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EmployeeWelcomeMail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
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
        $generatedPassword = Str::random(12);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($generatedPassword),
        ]);

        // Ensure role exists before assigning (guards against missing seeder data)
        Role::firstOrCreate(['name' => $request->role, 'guard_name' => 'web']);
        $user->assignRole($request->role);

        $credentialsEmailSent = true;
        try {
            Mail::to($user->email)->send(new EmployeeWelcomeMail(
                $user,
                $generatedPassword,
                $request->user()->name
            ));
        } catch (\Exception $exception) {
            $credentialsEmailSent = false;
            Log::error('Failed to send administrator credentials: '.$exception->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => $credentialsEmailSent
                ? 'Administrator created and credentials emailed successfully.'
                : 'Administrator created, but the credential email could not be sent. They can use Forgot Password to activate access.',
            'data' => $user->fresh(['roles']),
            'credentials_email_sent' => $credentialsEmailSent,
        ], 201);
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
