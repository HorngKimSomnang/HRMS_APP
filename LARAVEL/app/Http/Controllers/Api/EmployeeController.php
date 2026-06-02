<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\EmployeeWelcomeMail;
use Spatie\Permission\Models\Role;

class EmployeeController extends Controller
{
    public function index()
    {
        $employees = Employee::with(['user'])->paginate(10);
        return EmployeeResource::collection($employees);
    }

    public function store(\App\Http\Requests\StoreEmployeeRequest $request)
    {
        try {
            DB::beginTransaction();

            $generatedPassword = Str::random(10);

            $user = User::create([
                'name' => $request->first_name . ' ' . $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($generatedPassword),
            ]);

            // Auto-generate employee code (e.g., EMP001, EMP002)
            $lastEmployee = Employee::where('employee_code', 'like', 'EMP%')
                ->orderBy('employee_code', 'desc')
                ->first();

            if (!$lastEmployee) {
                $nextNumber = 1;
            } else {
                // Extract number from 'EMP005' -> 5
                $lastNumber = (int) substr($lastEmployee->employee_code, 3);
                $nextNumber = $lastNumber + 1;
            }

            $employeeCode = 'EMP' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

            // Ensure the Employee role exists, then assign it
            Role::firstOrCreate(['name' => 'Employee', 'guard_name' => 'web']);
            $user->assignRole('Employee');

            $documentsData = [
                'marital_status' => $request->marital_status ?? 'Single',
                'name_kh' => $request->name_kh ?? null,
                'emergency_contact' => $request->emergency_contact ?? null,
                'attachments' => []
            ];

            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $file) {
                    $path = $file->store('employee_documents', 'public');
                    $documentsData['attachments'][] = [
                        'name' => $file->getClientOriginalName(),
                        'path' => $path
                    ];
                }
            }

            $employee = Employee::create([
                'user_id' => $user->id,
                'employee_code' => $employeeCode,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'phone' => $request->phone,
                'job_title' => $request->job_title,
                'department' => $request->department,
                'joining_date' => $request->joining_date,
                'basic_salary' => $request->salary,
                'address' => $request->address,
                'gender' => $request->gender,
                'dob' => $request->dob,
                'shift_id' => $request->shift_id,
                'documents' => $documentsData,
            ]);
            
            if ($request->hasFile('profile_picture')) {
                $path = $request->file('profile_picture')->store('profile_pictures', 'public');
                $employee->update(['profile_picture' => $path]);
            }

            DB::commit();

            // Send Welcome Email
            try {
                Mail::to($user->email)->send(new EmployeeWelcomeMail($user, $generatedPassword));
            } catch (\Exception $mailException) {
                \Illuminate\Support\Facades\Log::error('Failed to send welcome email: ' . $mailException->getMessage());
            }

            AuditLogger::log($request, 'EMPLOYEE_CREATED', $employee, [
                'employee_code' => $employee->employee_code,
                'employee'      => $employee->first_name . ' ' . $employee->last_name,
                'department'    => $employee->department,
                'job_title'     => $employee->job_title,
            ]);

            return response()->json([
                'success'            => true,
                'message'            => 'Employee created successfully',
                'data'               => new EmployeeResource($employee),
                'generated_password' => $generatedPassword
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to create employee: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $employee = Employee::with(['user'])->findOrFail($id);
            return $this->successResponse(new EmployeeResource($employee));
        } catch (\Exception $e) {
            return $this->errorResponse('Employee not found', 404);
        }
    }
    
    public function update(\App\Http\Requests\UpdateEmployeeRequest $request, $id)
    {
        try {
            $employee = Employee::findOrFail($id);
            $user = $employee->user;
            
            DB::beginTransaction();

            // Update User
            if ($request->has('first_name') || $request->has('last_name')) {
                $user->name = trim(($request->first_name ?? $employee->first_name) . ' ' . ($request->last_name ?? $employee->last_name));
            }
            if ($request->has('email')) $user->email = $request->email;
            if ($request->has('password') && !empty($request->password)) $user->password = Hash::make($request->password);
            $user->save();

            // Update Employee
            $employeeData = $request->only([
                'employee_code', 'first_name', 'last_name', 'phone', 
                'job_title', 'department', 'joining_date', 
                'address', 'gender', 'dob', 'shift_id'
            ]);
            
            if ($request->has('salary')) {
                $employeeData['basic_salary'] = $request->salary;
            }
            
            $existingDocs = $employee->documents ?? ['marital_status' => 'Single', 'attachments' => []];
            
            if ($request->has('marital_status')) {
                $existingDocs['marital_status'] = $request->marital_status;
            }
            if ($request->has('name_kh')) {
                $existingDocs['name_kh'] = $request->name_kh;
            }
            if ($request->has('emergency_contact')) {
                $existingDocs['emergency_contact'] = $request->emergency_contact;
            }

            if ($request->hasFile('documents')) {
                if (!isset($existingDocs['attachments'])) {
                    $existingDocs['attachments'] = [];
                }
                foreach ($request->file('documents') as $file) {
                    $path = $file->store('employee_documents', 'public');
                    $existingDocs['attachments'][] = [
                        'name' => $file->getClientOriginalName(),
                        'path' => $path
                    ];
                }
            }
            $employeeData['documents'] = $existingDocs;

            if (!empty($employeeData)) $employee->update($employeeData);

            if ($request->hasFile('profile_picture')) {
                if ($employee->profile_picture) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($employee->profile_picture);
                }
                $path = $request->file('profile_picture')->store('profile_pictures', 'public');
                $employee->update(['profile_picture' => $path]);
            }
            
            DB::commit();

            AuditLogger::log($request, 'EMPLOYEE_UPDATED', $employee, [
                'employee_code' => $employee->employee_code,
                'employee'      => $employee->first_name . ' ' . $employee->last_name,
                'fields_updated'=> array_keys($employeeData),
            ]);

            return $this->successResponse(new EmployeeResource($employee), 'Employee updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to update employee: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $employee = Employee::findOrFail($id);
            $user = $employee->user;

            DB::beginTransaction();
            
            $employeeName = $employee->first_name . ' ' . $employee->last_name;
            $employeeCode = $employee->employee_code;

            // Instead of hard deleting records, we mark the employee as terminated
            $employee->update(['status' => 'terminated']);
            
            // Revoke user roles to prevent login access or API actions
            if ($user) {
                $user->syncRoles([]);
                // Delete active API tokens
                $user->tokens()->delete();
            }

            DB::commit();

            AuditLogger::log($request, 'EMPLOYEE_OFFBOARDED', null, [
                'employee_code' => $employeeCode,
                'employee'      => $employeeName,
            ]);

            return $this->successResponse(null, 'Employee offboarded successfully');
            
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to delete employee: ' . $e->getMessage(), 500);
        }
    }
}
