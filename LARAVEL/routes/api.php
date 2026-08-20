<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ForgotPasswordController;
use App\Http\Controllers\Api\TaskController;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:login');

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendOtp'])->middleware('throttle:otp');
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->middleware('throttle:otp');
Route::get('/login', function(){ return response()->json(['message' => 'Unauthenticated'], 401); })->name('login');
Route::get('/my-ip', function() {
    $ip = gethostbyname(gethostname());
    return response()->json(['ip' => $ip]);
});



Route::get('/file/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    return response()->file($fullPath, [
        'Content-Disposition' => 'inline; filename="'.basename($fullPath).'"'
    ]);
})->where('path', '.*');

Route::get('/download/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    return response()->download($fullPath);
})->where('path', '.*');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/data-versions', \App\Http\Controllers\Api\LiveDataVersionController::class);
    // Authenticate WebSocket private channel subscriptions
    \Illuminate\Support\Facades\Broadcast::routes(['middleware' => ['auth:sanctum']]);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/switch-role', [AuthController::class, 'switchRole']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::put('/profile/update', [AuthController::class, 'updateProfile']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/switch-role', [AuthController::class, 'switchRole']);
    // Department list is available to all authenticated users for dropdown/reference purposes.
    // Write operations (create, update, delete) remain permission-gated.
    Route::get('/departments', [\App\Http\Controllers\Api\DepartmentController::class, 'index']);
    Route::get('/departments/{department}', [\App\Http\Controllers\Api\DepartmentController::class, 'show']);
    Route::middleware('permission:departments.edit')->group(function () {
        Route::post('/departments', [\App\Http\Controllers\Api\DepartmentController::class, 'store']);
        Route::put('/departments/{department}', [\App\Http\Controllers\Api\DepartmentController::class, 'update']);
        Route::patch('/departments/{department}', [\App\Http\Controllers\Api\DepartmentController::class, 'update']);
    });
    Route::middleware('permission:departments.delete')->group(function () {
        Route::delete('/departments/{department}', [\App\Http\Controllers\Api\DepartmentController::class, 'destroy']);
    });
    
    Route::get('/features', function () {
        return \Illuminate\Support\Facades\DB::table('features')->orderBy('id')->get();
    });

    // Announcements & Holidays (Public read, admin write handled in controller or leave open for now)
    Route::get('/announcements/latest', [\App\Http\Controllers\Api\AnnouncementController::class, 'latest']);
    Route::apiResource('announcements', \App\Http\Controllers\Api\AnnouncementController::class);
    
    // Attendance (Employee handles own)
    Route::post('/attendance/clock-in', [\App\Http\Controllers\Api\AttendanceController::class, 'clockIn']);
    Route::post('/attendance/clock-out', [\App\Http\Controllers\Api\AttendanceController::class, 'clockOut']);
    Route::post('/attendance/undo-clock-out', [\App\Http\Controllers\Api\AttendanceController::class, 'undoClockOut']);
    Route::post('/attendance/late-reason', [\App\Http\Controllers\Api\AttendanceController::class, 'submitLateReason']);
    Route::get('/attendance/today', [\App\Http\Controllers\Api\AttendanceController::class, 'today']);
    Route::get('/attendance/history', [\App\Http\Controllers\Api\AttendanceController::class, 'history']);
    
    // Leaves (Employee handles own — self-service routes ungated, management routes gated below)
    Route::get('/leaves/balances', [\App\Http\Controllers\Api\LeaveController::class, 'balances']);
    Route::get('/leaves', [\App\Http\Controllers\Api\LeaveController::class, 'index']);
    Route::get('/leaves/{leave}', [\App\Http\Controllers\Api\LeaveController::class, 'show']);
    Route::post('/leaves', [\App\Http\Controllers\Api\LeaveController::class, 'store']);
    Route::apiResource('leave-types', \App\Http\Controllers\Api\LeaveTypeController::class);

    // Overtime (Employee self-service ungated; management routes gated below)
    Route::get('/overtimes', [\App\Http\Controllers\Api\OvertimeController::class, 'index']);
    Route::get('/overtimes/{overtime}', [\App\Http\Controllers\Api\OvertimeController::class, 'show']);
    Route::post('/overtimes', [\App\Http\Controllers\Api\OvertimeController::class, 'store']);

    // Documents (Employee self-service ungated; management routes gated below)
    Route::get('/documents', [\App\Http\Controllers\Api\DocumentController::class, 'index']);
    Route::get('/documents/{document}', [\App\Http\Controllers\Api\DocumentController::class, 'show']);
    Route::middleware('permission:documents.upload')->post('/documents', [\App\Http\Controllers\Api\DocumentController::class, 'store']);

    // Tasks (Employee self-service ungated; management routes gated below)
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::post('/tasks/{task}', [TaskController::class, 'update']); // Fallback for file uploads
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);

    // Payslips (Employee views own — ungated read; management gated below)
    Route::get('/payslips', [\App\Http\Controllers\Api\PayslipController::class, 'index']);
    Route::get('/payslips/{payslip}', [\App\Http\Controllers\Api\PayslipController::class, 'show']);
    
    // Employee self-service: own contract
    Route::get('/my/contract', [\App\Http\Controllers\Api\LifecycleController::class, 'myContract']);



    // Dashboard & Notifications
    Route::get('/dashboard', [\App\Http\Controllers\Api\DashboardController::class, 'index']);
    Route::get('/users/list', function(Illuminate\Http\Request $request) {
        $user = $request->user();
        
        $managerId = null;
        if ($user->employee && $user->employee->manager_id) {
            $managerEmployee = \App\Models\Employee::find($user->employee->manager_id);
            if ($managerEmployee) {
                $managerId = $managerEmployee->user_id;
            }
        }
        
        return \App\Models\User::whereHas('roles', function($q) {
            $q->whereIn('name', ['Super Admin', 'HR']);
        })
        ->orWhere('id', $managerId)
        ->select('id', 'name')
        ->distinct()
        ->get();
    })->middleware('auth:sanctum');
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/send', [\App\Http\Controllers\Api\NotificationController::class, 'send']);
    Route::post('/notifications/mark-read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/{id}/mark-read', [\App\Http\Controllers\Api\NotificationController::class, 'markOneAsRead']);
    Route::delete('/notifications/clear-all', [\App\Http\Controllers\Api\NotificationController::class, 'destroyAll']);
    Route::delete('/notifications/{id}', [\App\Http\Controllers\Api\NotificationController::class, 'destroy']);

    Route::get('/employees', [\App\Http\Controllers\Api\EmployeeController::class, 'index']);
    Route::get('/employees/{id}', [\App\Http\Controllers\Api\EmployeeController::class, 'show']);
    Route::middleware('permission:employees.create')->post('/employees', [\App\Http\Controllers\Api\EmployeeController::class, 'store']);
    Route::middleware('permission:employees.delete')->delete('/employees/{employee}', [\App\Http\Controllers\Api\EmployeeController::class, 'destroy']);
    
    Route::middleware('permission:employees.restore')->post('/employees/{id}/restore', [\App\Http\Controllers\Api\EmployeeController::class, 'restore']);
    Route::middleware('permission:employees.resend_credentials')->post('/employees/{id}/resend-credentials', [\App\Http\Controllers\Api\EmployeeController::class, 'resendCredentials']);
    Route::middleware('permission:employees.edit')->group(function () {
        Route::post('/employees/{id}', [\App\Http\Controllers\Api\EmployeeController::class, 'update']); // for FormData
        Route::put('/employees/{id}', [\App\Http\Controllers\Api\EmployeeController::class, 'update']);
        Route::patch('/employees/{id}', [\App\Http\Controllers\Api\EmployeeController::class, 'update']);
    });

    Route::middleware('permission:contracts.view')->group(function () {
        Route::get('/contracts/pending-count', [\App\Http\Controllers\Api\LifecycleController::class, 'pendingCount']);
        Route::get('/lifecycle/overview', [\App\Http\Controllers\Api\LifecycleController::class, 'overview']);
        Route::get('/lifecycle/contracts', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsIndex']);
        Route::get('/lifecycle/events', [\App\Http\Controllers\Api\LifecycleController::class, 'eventsIndex']);
        Route::get('/lifecycle/offboardings', [\App\Http\Controllers\Api\LifecycleController::class, 'offboardingsIndex']);
    });

    Route::middleware('permission:contracts.create')->post('/lifecycle/contracts', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsStore']);
    Route::middleware('permission:contracts.edit')->put('/lifecycle/contracts/{contract}', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsUpdate']);
    Route::middleware('permission:contracts.delete')->delete('/lifecycle/contracts/{contract}', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsDestroy']);
    Route::middleware('permission:contracts.auto_activate')->post('/lifecycle/contracts/{contract}/confirm', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsConfirm']);

    Route::middleware('permission:employees.delete')->post('/lifecycle/offboardings', [\App\Http\Controllers\Api\LifecycleController::class, 'offboardingsStore']);
    Route::middleware('permission:employees.delete')->put('/lifecycle/offboardings/{offboarding}', [\App\Http\Controllers\Api\LifecycleController::class, 'offboardingsUpdate']);
    Route::middleware('permission:employees.delete')->delete('/lifecycle/offboardings/{offboarding}', [\App\Http\Controllers\Api\LifecycleController::class, 'offboardingsDestroy']);

    // Event routes don't have separate permissions in seeder yet, assuming it uses employee or contract permissions, or just view/create/delete
    // The previous code had them inside contracts.view
    Route::middleware('permission:employees.create|contracts.create')->post('/lifecycle/events', [\App\Http\Controllers\Api\LifecycleController::class, 'eventsStore']);
    Route::middleware('permission:employees.delete|contracts.delete')->delete('/lifecycle/events/{event}', [\App\Http\Controllers\Api\LifecycleController::class, 'eventsDestroy']);

    // Reports access control relies on controller logic and individual route permissions
    Route::get('/reports/attendance', [\App\Http\Controllers\Api\ReportController::class, 'attendanceReport'])->middleware('permission:reports.view|attendance.view');
    Route::get('/reports/leaves', [\App\Http\Controllers\Api\ReportController::class, 'leavesReport'])->middleware('permission:reports.view|leaves.view');
    Route::get('/reports/employees', [\App\Http\Controllers\Api\ReportController::class, 'employeesReport'])->middleware('permission:reports.view|employees.view');
    Route::get('/reports/payroll', [\App\Http\Controllers\Api\ReportController::class, 'payrollReport'])->middleware('permission:reports.view|payroll.view');
    Route::get('/reports/overtime', [\App\Http\Controllers\Api\ReportController::class, 'overtimeReport'])->middleware('permission:reports.view|overtime.view');


    Route::middleware('permission:assets.view')->get('/assets', [\App\Http\Controllers\Api\AssetController::class, 'index']);
    Route::middleware('permission:assets.view')->get('/assets/{asset}/history', [\App\Http\Controllers\Api\AssetController::class, 'history']);
    Route::middleware('permission:assets.create')->post('/assets', [\App\Http\Controllers\Api\AssetController::class, 'store']);
    Route::middleware('permission:assets.edit')->put('/assets/{asset}', [\App\Http\Controllers\Api\AssetController::class, 'update']);
    Route::middleware('permission:assets.delete')->delete('/assets/{asset}', [\App\Http\Controllers\Api\AssetController::class, 'destroy']);
    Route::middleware('permission:assets.assign')->post('/assets/{asset}/assign', [\App\Http\Controllers\Api\AssetController::class, 'assign']);
    Route::middleware('permission:assets.return')->post('/assets/{asset}/return', [\App\Http\Controllers\Api\AssetController::class, 'returnAsset']);

    // Leaves management (gated by permission)
    Route::middleware('permission:leaves.approve')->group(function () {
        Route::put('/leaves/{id}/status', [\App\Http\Controllers\Api\LeaveController::class, 'updateStatus']);
        Route::put('/leaves/{id}/restore-status', [\App\Http\Controllers\Api\LeaveController::class, 'restoreStatus']);
    });
    Route::middleware('permission:leaves.edit')->group(function () {
        Route::put('/leaves/{leave}', [\App\Http\Controllers\Api\LeaveController::class, 'update']);
        Route::patch('/leaves/{leave}', [\App\Http\Controllers\Api\LeaveController::class, 'update']);
    });
    Route::middleware('permission:leaves.delete')->group(function () {
        Route::delete('/leaves/{leave}', [\App\Http\Controllers\Api\LeaveController::class, 'destroy']);
    });

    // Overtime management (gated by permission)
    Route::middleware('permission:overtime.edit|overtime.approve')->group(function () {
        Route::put('/overtimes/{overtime}', [\App\Http\Controllers\Api\OvertimeController::class, 'update']);
        Route::patch('/overtimes/{overtime}', [\App\Http\Controllers\Api\OvertimeController::class, 'update']);
        Route::post('/overtimes/{overtime}/restore', [\App\Http\Controllers\Api\OvertimeController::class, 'restore']);
    });
    Route::middleware('permission:overtime.delete')->group(function () {
        Route::delete('/overtimes/{overtime}', [\App\Http\Controllers\Api\OvertimeController::class, 'destroy']);
    });

    // Documents management (gated by permission)
    Route::middleware('permission:documents.edit')->group(function () {
        Route::put('/documents/{document}', [\App\Http\Controllers\Api\DocumentController::class, 'update']);
        Route::patch('/documents/{document}', [\App\Http\Controllers\Api\DocumentController::class, 'update']);
    });
    Route::middleware('permission:documents.delete')->group(function () {
        Route::delete('/documents/{document}', [\App\Http\Controllers\Api\DocumentController::class, 'destroy']);
    });

    // Tasks management (gated by permission)
    Route::middleware('permission:tasks.delete')->group(function () {
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
    });

    // Payroll management (gated by permission)
    Route::middleware('permission:payroll.generate')->group(function () {
        Route::get('/payroll/preview', [\App\Http\Controllers\Api\PayslipController::class, 'preview']);
        Route::post('payslips/batch', [\App\Http\Controllers\Api\PayslipController::class, 'batchStore']);
        Route::post('/payslips', [\App\Http\Controllers\Api\PayslipController::class, 'store']);
    });
    Route::middleware('permission:payroll.mark_paid')->patch('/payslips/{payslip}', [\App\Http\Controllers\Api\PayslipController::class, 'update']);
    Route::middleware('permission:payroll.edit')->put('/payslips/{payslip}', [\App\Http\Controllers\Api\PayslipController::class, 'update']);
    Route::middleware('permission:payroll.delete')->delete('/payslips/{payslip}', [\App\Http\Controllers\Api\PayslipController::class, 'destroy']);

    // Attendance management (gated by permission)
    Route::middleware('permission:attendance.view')->group(function () {
        Route::get('/employees/{id}/attendance', [\App\Http\Controllers\Api\EmployeeController::class, 'attendance']);
    });
    Route::middleware('permission:attendance.edit')->group(function () {
        Route::put('/attendance/{id}/manual-update', [\App\Http\Controllers\Api\AttendanceController::class, 'manualUpdate']);
    });
    Route::middleware('permission:attendance.delete')->group(function () {
        Route::delete('/attendance/{id}', [\App\Http\Controllers\Api\AttendanceController::class, 'destroy']);
    });



    // Employee Direct Permissions (Controller handles its own authorization for Super Admin & Manager)
    Route::post('/employees/{employee}/permissions/bulk', [\App\Http\Controllers\Api\EmployeePermissionController::class, 'bulkUpdate']);
    Route::post('/employees/{employee}/permissions', [\App\Http\Controllers\Api\EmployeePermissionController::class, 'grant']);
    Route::delete('/employees/{employee}/permissions/{perm}', [\App\Http\Controllers\Api\EmployeePermissionController::class, 'revoke'])
        ->where('perm', '.*');
    Route::post('/employees/{employee}/managed-departments', [\App\Http\Controllers\Api\EmployeePermissionController::class, 'assignManagedDepartments']);

    // ==========================================
    // Super Admin Only Routes
    // ==========================================
    // Public/Authenticated Settings Read
    Route::get('/settings', [\App\Http\Controllers\Api\SettingController::class, 'index']);
    Route::get('/shifts', [\App\Http\Controllers\Api\ShiftController::class, 'index']);
    Route::get('/shifts/{shift}', [\App\Http\Controllers\Api\ShiftController::class, 'show']);

    // Exception: Backups use hardcoded role:Super Admin because managing database 
    // infrastructure is a system-level capability, not a modular feature permission.
    Route::get('/backups/status', [\App\Http\Controllers\Api\BackupController::class, 'status'])->middleware('role:Super Admin');
    Route::post('/backups', [\App\Http\Controllers\Api\BackupController::class, 'store'])->middleware('role:Super Admin', 'throttle:3,10');
    Route::post('/settings', [\App\Http\Controllers\Api\SettingController::class, 'update']);
    Route::post('/settings/logo', [\App\Http\Controllers\Api\SettingController::class, 'uploadLogo']);
    Route::apiResource('shifts', \App\Http\Controllers\Api\ShiftController::class)->except(['index', 'show'])->middleware('permission:shifts.create|shifts.edit|shifts.delete');
    
    Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index'])->middleware('permission:audit_logs.view');
    Route::post('/audit-logs/export', [\App\Http\Controllers\Api\AuditLogController::class, 'export'])->middleware('permission:audit_logs.view');

    // Role Management (Super Admin only -> now using roles.* permissions)
    Route::prefix('admin')->group(function () {
        Route::get('/users', [\App\Http\Controllers\Api\RoleController::class, 'indexUsers'])->middleware('permission:roles.view');
        Route::get('/users/{user}/roles', [\App\Http\Controllers\Api\RoleController::class, 'getUserRoles'])->middleware('permission:roles.view');
        Route::get('/roles', [\App\Http\Controllers\Api\RoleController::class, 'indexRoles'])->middleware('permission:roles.view');
        Route::get('/roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'show'])->middleware('permission:roles.view');
        Route::post('/roles', [\App\Http\Controllers\Api\RoleController::class, 'store'])->middleware('permission:roles.create');
        Route::put('/roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'update'])->middleware('permission:roles.edit');
        Route::delete('/roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'destroy'])->middleware('permission:roles.delete');
        Route::get('/features', [\App\Http\Controllers\Api\PermissionController::class, 'getFeatures'])->middleware('permission:roles.view');
        Route::apiResource('permissions', \App\Http\Controllers\Api\PermissionController::class)->only(['index', 'store', 'destroy'])->middleware('permission:permissions.manage');
        Route::post('/users/{user}/permissions', [\App\Http\Controllers\Api\RoleController::class, 'syncPermissions'])->middleware('permission:roles.edit');
    });
});
