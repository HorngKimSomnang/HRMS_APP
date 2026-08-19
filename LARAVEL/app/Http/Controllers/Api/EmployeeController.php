<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\HrCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Mail\EmployeeWelcomeMail;
use Spatie\Permission\Models\Role;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $isManager = $user->managedDepartments()->exists();
        
        if (!$user->hasRole('Super Admin') && !$user->hasPermissionTo('employees.view') && !$isManager) {
            abort(403, 'Forbidden. You do not have permission to view employees.');
        }

        if ($request->boolean('archived')) {
            $query = Employee::onlyTrashed()->with([
                'user' => fn ($userQuery) => $userQuery->withTrashed()->with(['department', 'assignedRoles']),
            ]);
        } else {
            $query = Employee::with(['user.department', 'user.assignedRoles']);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $user = auth()->user();
        if (!$user->hasRole('Super Admin')) {
            $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();
            if (empty($managedDepartmentIds)) {
                $query->where('id', $user->employee?->id ?? -1);
            } else {
                $query->where(function ($q) use ($managedDepartmentIds, $user) {
                    $q->whereHas('user', function ($q2) use ($managedDepartmentIds) {
                        $q2->withTrashed()->whereIn('department_id', $managedDepartmentIds);
                    })->orWhere('id', $user->employee?->id ?? -1);
                });
            }
        }

        if ($request->has('department_id')) {
            if (!auth()->user()->hasPermissionTo('departments.view_employees')) {
                abort(403, 'Forbidden. You do not have the required permission.');
            }
            $query->whereHas('user', function($q) use ($request) {
                $q->withTrashed()->where('department_id', $request->department_id);
            });
        }

        $query->orderBy('employee_code');

        if ($request->has('all') && $request->all == 'true') {
            $employees = $query->get();
            return EmployeeResource::collection($employees);
        }

        $employees = $query->paginate(10);

        if ($request->boolean('archived')) {
            $emails = $employees->getCollection()
                ->pluck('user.email')
                ->filter()
                ->values();

            $activeEmployeesByEmail = Employee::with('user')
                ->whereHas('user', fn ($userQuery) => $userQuery->whereIn('email', $emails))
                ->get()
                ->keyBy(fn (Employee $employee) => strtolower($employee->user->email));

            $employees->getCollection()->each(function (Employee $employee) use ($activeEmployeesByEmail) {
                $email = $employee->user?->email;
                $conflict = $email ? $activeEmployeesByEmail->get(strtolower($email)) : null;

                $employee->setAttribute('restore_conflict', $conflict !== null);
                $employee->setAttribute('conflicting_employee_code', $conflict?->employee_code);
            });
        }

        return EmployeeResource::collection($employees);
    }

    public function store(\App\Http\Requests\StoreEmployeeRequest $request)
    {
        try {
            DB::beginTransaction();

            $generatedPassword = Str::random(10);

            $user = User::create([
                'name' => $request->last_name . ' ' . $request->first_name,
                'email' => $request->email,
                'password' => Hash::make($generatedPassword),
            ]);

            // Auto-generate employee code (e.g., EM001, EM002).
            // Includes trashed (archived) employees so a code already issued to
            // a terminated employee is never reissued to someone new.
            $lastEmployee = Employee::withTrashed()
                ->where('employee_code', 'like', 'EM%')
                ->orderByRaw('LENGTH(employee_code) desc')
                ->orderBy('employee_code', 'desc')
                ->first();

            if (!$lastEmployee) {
                $nextNumber = 1;
            } else {
                // Extract number from 'EM005' or 'EMP005' -> 5
                $numberString = preg_replace('/[^0-9]/', '', $lastEmployee->employee_code);
                $lastNumber = (int) $numberString;
                $nextNumber = $lastNumber + 1;
            }

            $employeeCode = 'EM' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

            // Assign the requested role or fallback to default 'Employee'
            $roleName = $request->input('role', 'Employee');
            $role = \App\Models\Role::where('name', $roleName)->first();
            
            if (!$role) {
                $role = \App\Models\Role::where('name', 'Employee')->first();
            }
            
            $departmentName = $request->input('department');
            $department = \App\Models\Department::where('name', $departmentName)->first();
            
            $userUpdates = [];
            if ($department) $userUpdates['department_id'] = $department->id;
            
            if (!empty($userUpdates)) {
                $user->update($userUpdates);
            }

            if ($role) {
                $user->assignedRoles()->sync([$role->id]);
            }

            $documentsData = [
                'marital_status' => $request->marital_status ?? 'Single',
                'name_kh' => $request->name_kh ?? null,
                'emergency_contact' => $request->emergency_contact ?? null,
                'attachments' => []
            ];

            if ($request->hasFile('doc_national_id')) {
                $path = $request->file('doc_national_id')->store('employee_documents', 'public');
                $documentsData['attachments'][] = ['name' => 'National ID', 'path' => $path];
            }
            if ($request->hasFile('doc_degree')) {
                $path = $request->file('doc_degree')->store('employee_documents', 'public');
                $documentsData['attachments'][] = ['name' => 'Degree / Certificate', 'path' => $path];
            }
            if ($request->hasFile('doc_cv')) {
                $path = $request->file('doc_cv')->store('employee_documents', 'public');
                $documentsData['attachments'][] = ['name' => 'CV / Resume', 'path' => $path];
            }
            
            // Still support old "documents[]" array if any existing apps use it
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
                'job_title' => $roleName,
                'joining_date' => $request->joining_date,
                'address' => $request->address,
                'gender' => $request->gender,
                'dob' => $request->dob,
                'shift_id' => $request->shift_id
                    ?: (HrCatalog::getShifts()[0]['id'] ?? null),
                'documents' => $documentsData,
            ]);
            
            $startDate = $request->joining_date ?? now();
            $contract = \App\Models\Contract::create([
                'employee_id' => $employee->id,
                'type' => 'fixed_term',
                'salary' => $request->salary ?? 0,
                'start_date' => $startDate,
                'end_date' => \Carbon\Carbon::parse($startDate)->addMonth(),
                'status' => 'pending',
                'position' => $roleName,
                'created_by' => $request->user() ? $request->user()->id : null,
            ]);

            \App\Models\AuditLog::create([
                'user_id' => null,
                'role' => 'System',
                'action' => 'CONTRACT_GENERATED',
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'model_type' => \App\Models\Contract::class,
                'model_id' => $contract->id,
                'context' => [
                    'employee' => $employee->user->name,
                    'status' => 'automated'
                ]
            ]);
            
            if ($request->hasFile('profile_picture')) {
                $path = $request->file('profile_picture')->store('profile_pictures', 'public');
                $employee->update(['profile_picture' => $path]);
            }

            DB::commit();

            $credentialsEmailSent = true;

            // Send the generated password only to the employee's email.
            try {
                Mail::to($user->email)->send(new EmployeeWelcomeMail(
                    $user,
                    $generatedPassword,
                    $request->user()->name
                ));
            } catch (\Exception $mailException) {
                $credentialsEmailSent = false;
                \Illuminate\Support\Facades\Log::error('Failed to send welcome email: ' . $mailException->getMessage());
            }

            AuditLogger::log($request, 'EMPLOYEE_CREATED', $employee, [
                'employee_code' => $employee->employee_code,
                'employee'      => $employee->last_name . ' ' . $employee->first_name,
                'department'    => $employee->department,
                'job_title'     => $employee->job_title,
            ]);

            return response()->json([
                'success' => true,
                'message' => $credentialsEmailSent
                    ? 'Employee created and login credentials emailed successfully.'
                    : 'Employee created, but the credential email could not be sent. Please check the mail settings and generate a new key.',
                'data' => new EmployeeResource($employee),
                'credentials_email_sent' => $credentialsEmailSent,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to create employee: ' . $e->getMessage(), 500);
        }
    }
    public function resendCredentials(string|int $id)
    {
        try {
            $employee = Employee::with('user')->findOrFail($id);
            $user = $employee->user;

            $generatedPassword = Str::random(10);
            $previousPassword = $user->password;
            $previousPasswordChangedAt = $user->password_changed_at;
            $user->password = Hash::make($generatedPassword);
            $user->password_changed_at = null; // back to auto-generated -> show change-password warning
            $user->save();

            try {
                Mail::to($user->email)->send(new EmployeeWelcomeMail(
                    $user,
                    $generatedPassword,
                    auth()->user()->name
                ));
            } catch (\Exception $mailException) {
                // Do not lock the employee out when delivery fails.
                $user->password = $previousPassword;
                $user->password_changed_at = $previousPasswordChangedAt;
                $user->save();

                \Illuminate\Support\Facades\Log::error('Failed to send welcome email: ' . $mailException->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'The new key could not be emailed. The employee can continue using the previous password.',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Credentials regenerated and email sent successfully.',
            ]);

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to resend credentials: ' . $e->getMessage(), 500);
        }
    }

    public function show(string|int $id)
    {
        $user = auth()->user();
        $isManager = $user->managedDepartments()->exists();
        
        if (!$user->hasRole('Super Admin') && !$user->hasPermissionTo('employees.view') && !$isManager) {
            abort(403, 'Forbidden. You do not have permission to view this employee.');
        }

        try {
            $employee = Employee::with(['user.department'])->findOrFail($id);
            
            if (!$user->hasRole('Super Admin') && !$user->hasPermissionTo('employees.view') && $isManager) {
                $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();
                $empDeptId = $employee->user?->department_id;
                if (!in_array($empDeptId, $managedDepartmentIds) && $employee->id !== $user->employee?->id) {
                    abort(403, 'Forbidden. This employee is not in your managed department.');
                }
            }

            return $this->successResponse(new EmployeeResource($employee));
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            throw $e;
        } catch (\Exception $e) {
            return $this->errorResponse('Employee not found', 404);
        }
    }

    public function attendance(string|int $id)
    {
        try {
            $employee = Employee::findOrFail($id);
            $history = \App\Models\Attendance::where('employee_id', $employee->id)
                ->orderBy('date', 'desc')
                ->take(10)
                ->get();
            return response()->json(['data' => $history]);
        } catch (\Exception $e) {
            return $this->errorResponse('Employee not found', 404);
        }
    }

    public function deleteDocument(string|int $id, string $name)
    {
        try {
            $employee = Employee::findOrFail($id);
            $documentsData = $employee->documents ?? [];
            if (isset($documentsData['attachments'])) {
                $decodedName = urldecode($name);
                $documentsData['attachments'] = array_filter($documentsData['attachments'], function($doc) use ($decodedName) {
                    return $doc['name'] !== $decodedName;
                });
                $documentsData['attachments'] = array_values($documentsData['attachments']);
                $employee->update(['documents' => $documentsData]);
            }
            return response()->json(['success' => true, 'message' => 'Document deleted']);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete document', 500);
        }
    }
    
    public function update(\App\Http\Requests\UpdateEmployeeRequest $request, string|int $id)
    {
        try {
            $employee = Employee::findOrFail($id);
            $user = $employee->user;
            
            DB::beginTransaction();

            // Update User
            if ($request->has('first_name') || $request->has('last_name')) {
                $user->name = trim(($request->last_name ?? $employee->last_name) . ' ' . ($request->first_name ?? $employee->first_name));
            }
            if ($request->has('email')) {
                $request->validate(['email' => ['email', Rule::unique('users', 'email')->whereNull('deleted_at')->ignore($user->id)]]);
                $user->email = $request->email;
            }
            if ($request->has('password') && !empty($request->password)) {
                $user->password = Hash::make($request->password);
                $user->password_changed_at = null; // admin-set password -> employee should change it
            }
            
            $userUpdates = [];
            if ($request->has('role')) {
                $roleName = $request->role;
                $role = \App\Models\Role::where('name', $roleName)->first();
                if ($role) {
                    $user->assignedRoles()->sync([$role->id]);
                }
            }
            if ($request->has('department')) {
                $departmentName = $request->department;
                $department = \App\Models\Department::where('name', $departmentName)->first();
                if ($department) {
                    $userUpdates['department_id'] = $department->id;
                }
            }
            
            if (!empty($userUpdates)) {
                $user->update($userUpdates);
            }
            
            $user->save();

            // Update Employee
            $employeeData = $request->only([
                'employee_code', 'first_name', 'last_name', 'phone', 
                'joining_date', 
                'address', 'gender', 'dob', 'shift_id'
            ]);
            if ($request->has('role')) {
                $employeeData['job_title'] = $request->role;
            }
            $documentsData = $employee->documents ?? ['attachments' => []];
            $documentsData['marital_status'] = $request->marital_status ?? ($documentsData['marital_status'] ?? 'Single');
            $documentsData['name_kh'] = $request->name_kh ?? ($documentsData['name_kh'] ?? null);
            $documentsData['emergency_contact'] = $request->emergency_contact ?? ($documentsData['emergency_contact'] ?? null);
            
            if (!isset($documentsData['attachments'])) {
                $documentsData['attachments'] = [];
            }

            // Handle specific documents
            $docTypes = [
                'doc_national_id' => 'National ID',
                'doc_degree' => 'Degree / Certificate',
                'doc_cv' => 'CV / Resume'
            ];
            
            foreach ($docTypes as $field => $label) {
                if ($request->hasFile($field)) {
                    $path = $request->file($field)->store('employee_documents', 'public');
                    // Remove old if exists
                    $documentsData['attachments'] = array_filter($documentsData['attachments'], function($doc) use ($label) {
                        return $doc['name'] !== $label;
                    });
                    $documentsData['attachments'][] = ['name' => $label, 'path' => $path];
                }
            }

            // Handle legacy multiple
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $file) {
                    $path = $file->store('employee_documents', 'public');
                    $documentsData['attachments'][] = [
                        'name' => $file->getClientOriginalName(),
                        'path' => $path
                    ];
                }
            }
            $employeeData['documents'] = $documentsData;

            if (!empty($employeeData)) {
                $employee->update($employeeData);
            }

            if ($request->has('salary')) {
                $contract = $employee->activeContract ?? $employee->contracts()->latest('start_date')->first();
                if ($contract) {
                    $contract->update(['salary' => $request->salary]);
                } else {
                    $startDate = $request->joining_date ?? now();
                    $contract = \App\Models\Contract::create([
                        'employee_id' => $employee->id,
                        'type' => 'fixed_term',
                        'salary' => $request->salary,
                        'start_date' => $startDate,
                        'end_date' => \Carbon\Carbon::parse($startDate)->addMonth(),
                        'status' => 'pending',
                        'position' => $request->role ?? $employee->job_title,
                        'created_by' => $request->user() ? $request->user()->id : null,
                    ]);

                    \App\Models\AuditLog::create([
                        'user_id' => null,
                        'role' => 'System',
                        'action' => 'CONTRACT_GENERATED',
                        'ip_address' => request()->ip() ?? '127.0.0.1',
                        'model_type' => \App\Models\Contract::class,
                        'model_id' => $contract->id,
                        'context' => [
                            'employee' => $employee->user->name,
                            'status' => 'automated'
                        ]
                    ]);
                }
            }

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
                'employee'      => $employee->last_name . ' ' . $employee->first_name,
                'fields_updated'=> array_keys($employeeData),
            ]);

            return $this->successResponse(new EmployeeResource($employee), 'Employee updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to update employee: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, string|int $id)
    {
        try {
            $employee = Employee::findOrFail($id);

            DB::beginTransaction();
            
            $employeeName = $employee->last_name . ' ' . $employee->first_name;
            $employeeCode = $employee->employee_code;

            // Terminating an employee archives (soft deletes) them immediately —
            // never hard delete employee data. All models use SoftDeletes, so
            // rows stay in the database with deleted_at set and can be restored
            // via /employees/{id}/restore.
            $employee->archive();

            DB::commit();

            AuditLogger::log($request, 'EMPLOYEE_ARCHIVED', null, [
                'employee_code' => $employeeCode,
                'employee'      => $employeeName,
            ]);

            return $this->successResponse(null, 'Employee terminated and archived (recoverable via restore)');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to delete employee: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Restore an archived (soft-deleted) employee and all related records.
     */
    public function restore(Request $request, string|int $id)
    {
        try {
            $employee = Employee::onlyTrashed()->findOrFail($id);

            $archivedUser = User::onlyTrashed()->find($employee->user_id);
            if ($archivedUser && User::where('email', $archivedUser->email)->exists()) {
                return $this->errorResponse(
                    'This email already belongs to an active employee record. Keep this record archived or resolve the duplicate account first.',
                    409
                );
            }

            DB::beginTransaction();

            // Capture deleted_at BEFORE restore() clears it — needed to identify
            // payslips that were marked paid during the archived window.
            $archivedAt = $employee->deleted_at;

            \App\Models\Attendance::onlyTrashed()->where('employee_id', $employee->id)->restore();
            \App\Models\Leave::onlyTrashed()->where('employee_id', $employee->id)->restore();
            \App\Models\Overtime::onlyTrashed()->where('employee_id', $employee->id)->restore();
            \App\Models\Task::onlyTrashed()->where('assigned_to', $employee->id)->restore();
            \App\Models\Payslip::onlyTrashed()->where('employee_id', $employee->id)->restore();

            $user = $archivedUser;
            if ($user) {
                $user->restore();
                // Access stays revoked (no roles, no tokens) until an admin re-assigns a role.
            }

            $employee->restore();
            $employee->update(['status' => 'active']);

            // Unlock payslips that were locked during archive → back to draft
            \App\Models\Payslip::where('employee_id', $employee->id)
                ->where('status', 'locked')
                ->update(['status' => 'draft', 'locked_reason' => null]);

            // Flag any payslips that were marked 'paid' WHILE the employee was archived.
            // These need human review — money may have already moved.
            if ($archivedAt) {
                \App\Models\Payslip::where('employee_id', $employee->id)
                    ->where('status', 'paid')
                    ->where('updated_at', '>=', $archivedAt)
                    ->update([
                        'locked_reason' => 'Paid during archived period — verify with finance.',
                    ]);
            }

            $contracts = \App\Models\Contract::where('employee_id', $employee->id)
                ->where('status', 'expired')
                ->get();

            foreach ($contracts as $contract) {
                $contract->update(['status' => 'pending']);
                \App\Models\ContractStatusLog::create([
                    'contract_id' => $contract->id,
                    'employee_id' => $employee->id,
                    'status'      => 'pending',
                    'changed_at'  => now(),
                ]);
            }

            \App\Models\Offboarding::where('employee_id', $employee->id)
                ->whereIn('status', ['deleted', 'completed'])
                ->where('reason', 'Deleted')
                ->delete();

            DB::commit();

            AuditLogger::log($request, 'EMPLOYEE_RESTORED', null, [
                'employee_code' => $employee->employee_code,
                'employee'      => $employee->last_name . ' ' . $employee->first_name,
            ]);

            return $this->successResponse(new EmployeeResource($employee), 'Employee restored successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to restore employee: ' . $e->getMessage(), 500);
        }
    }
}
