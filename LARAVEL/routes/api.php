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
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::put('/profile/update', [AuthController::class, 'updateProfile']);
    Route::get('/user', [AuthController::class, 'me']);
    
    

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
    
    // Leaves (Employee handles own)
    Route::get('/leaves/balances', [\App\Http\Controllers\Api\LeaveController::class, 'balances']);
    Route::apiResource('leaves', \App\Http\Controllers\Api\LeaveController::class);
    Route::apiResource('leave-types', \App\Http\Controllers\Api\LeaveTypeController::class);
    
    Route::apiResource('documents', \App\Http\Controllers\Api\DocumentController::class);
    Route::apiResource('tasks', TaskController::class);
    Route::post('payslips/batch', [\App\Http\Controllers\Api\PayslipController::class, 'batchStore']);
    Route::apiResource('payslips', \App\Http\Controllers\Api\PayslipController::class);
    Route::apiResource('overtimes', \App\Http\Controllers\Api\OvertimeController::class);
    
    // Employee self-service: own contract
    Route::get('/my/contract', [\App\Http\Controllers\Api\LifecycleController::class, 'myContract']);

    // Employee self-service: submittable custom entities
    Route::get('/my/entities', [\App\Http\Controllers\Api\EmployeeCustomEntityController::class, 'index']);
    Route::get('/my/entities/{entity:slug}', [\App\Http\Controllers\Api\EmployeeCustomEntityController::class, 'show']);
    Route::get('/my/entities/{entity:slug}/records', [\App\Http\Controllers\Api\EmployeeCustomEntityController::class, 'records']);
    Route::post('/my/entities/{entity:slug}/records', [\App\Http\Controllers\Api\EmployeeCustomEntityController::class, 'store']);
    Route::put('/my/entities/{entity:slug}/records/{record}', [\App\Http\Controllers\Api\EmployeeCustomEntityController::class, 'update']);
    Route::post('/my/entities/{entity:slug}/records/{record}/files/{fieldKey}', [\App\Http\Controllers\Api\EmployeeCustomEntityController::class, 'uploadFile']);

    // Dashboard & Notifications
    Route::get('/dashboard', [\App\Http\Controllers\Api\DashboardController::class, 'index']);
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/mark-read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/{id}/mark-read', [\App\Http\Controllers\Api\NotificationController::class, 'markOneAsRead']);
    Route::delete('/notifications/clear-all', [\App\Http\Controllers\Api\NotificationController::class, 'destroyAll']);
    Route::delete('/notifications/{id}', [\App\Http\Controllers\Api\NotificationController::class, 'destroy']);

    // ==========================================
    // Admin & Super Admin Only Routes
    // ==========================================
    Route::middleware('role:Super Admin|Admin')->group(function () {
        Route::apiResource('employees', \App\Http\Controllers\Api\EmployeeController::class);
        Route::post('/employees/{id}/resend-credentials', [\App\Http\Controllers\Api\EmployeeController::class, 'resendCredentials']);
        Route::post('/employees/{id}/restore', [\App\Http\Controllers\Api\EmployeeController::class, 'restore']);
        
        // Reports
        Route::get('/employees/{id}/attendance', [\App\Http\Controllers\Api\EmployeeController::class, 'attendance']);
        Route::delete('/employees/{id}/documents/{name}', [\App\Http\Controllers\Api\EmployeeController::class, 'deleteDocument']);
        Route::get('/reports/attendance', [\App\Http\Controllers\Api\ReportController::class, 'attendanceReport']);
        Route::get('/reports/leaves', [\App\Http\Controllers\Api\ReportController::class, 'leavesReport']);
        Route::get('/reports/employees', [\App\Http\Controllers\Api\ReportController::class, 'employeesReport']);
        Route::get('/reports/payroll', [\App\Http\Controllers\Api\ReportController::class, 'payrollReport']);
        Route::get('/reports/overtime', [\App\Http\Controllers\Api\ReportController::class, 'overtimeReport']);
        Route::get('/reports/custom-entities', [\App\Http\Controllers\Api\ReportController::class, 'customEntityReport']);

        // Employee Lifecycle (contracts, events, offboarding)
        Route::get('/lifecycle/overview', [\App\Http\Controllers\Api\LifecycleController::class, 'overview']);
        Route::get('/lifecycle/contracts', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsIndex']);
        Route::post('/lifecycle/contracts', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsStore']);
        Route::put('/lifecycle/contracts/{contract}', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsUpdate']);
        Route::delete('/lifecycle/contracts/{contract}', [\App\Http\Controllers\Api\LifecycleController::class, 'contractsDestroy']);
        Route::get('/lifecycle/events', [\App\Http\Controllers\Api\LifecycleController::class, 'eventsIndex']);
        Route::post('/lifecycle/events', [\App\Http\Controllers\Api\LifecycleController::class, 'eventsStore']);
        Route::delete('/lifecycle/events/{event}', [\App\Http\Controllers\Api\LifecycleController::class, 'eventsDestroy']);
        Route::get('/lifecycle/offboardings', [\App\Http\Controllers\Api\LifecycleController::class, 'offboardingsIndex']);
        Route::post('/lifecycle/offboardings', [\App\Http\Controllers\Api\LifecycleController::class, 'offboardingsStore']);
        Route::put('/lifecycle/offboardings/{offboarding}', [\App\Http\Controllers\Api\LifecycleController::class, 'offboardingsUpdate']);
        Route::delete('/lifecycle/offboardings/{offboarding}', [\App\Http\Controllers\Api\LifecycleController::class, 'offboardingsDestroy']);

        // Asset Management (company property: laptops, phones, vehicles...)
        Route::get('/assets', [\App\Http\Controllers\Api\AssetController::class, 'index']);
        Route::post('/assets', [\App\Http\Controllers\Api\AssetController::class, 'store']);
        Route::put('/assets/{asset}', [\App\Http\Controllers\Api\AssetController::class, 'update']);
        Route::delete('/assets/{asset}', [\App\Http\Controllers\Api\AssetController::class, 'destroy']);
        Route::post('/assets/{asset}/assign', [\App\Http\Controllers\Api\AssetController::class, 'assign']);
        Route::post('/assets/{asset}/return', [\App\Http\Controllers\Api\AssetController::class, 'returnAsset']);
        Route::get('/assets/{asset}/history', [\App\Http\Controllers\Api\AssetController::class, 'history']);

        Route::put('/leaves/{id}/status', [\App\Http\Controllers\Api\LeaveController::class, 'updateStatus']);
        Route::put('/leaves/{id}/restore-status', [\App\Http\Controllers\Api\LeaveController::class, 'restoreStatus']);
        Route::delete('/attendance/clear', [\App\Http\Controllers\Api\AttendanceController::class, 'clearLogs']);
        Route::put('/attendance/{id}/manual-clock-out', [\App\Http\Controllers\Api\AttendanceController::class, 'manualClockOut']);
        Route::delete('/attendance/{id}', [\App\Http\Controllers\Api\AttendanceController::class, 'destroy']);

        // Custom Entities: browsing entities and managing records is day-to-day
        // data-entry work (e.g. Admin uploading a Sales record) — open to Admin too.
        // Defining/editing the entity schema itself stays Super Admin only (below).
        Route::get('/entities', [\App\Http\Controllers\Api\CustomEntityController::class, 'index']);
        Route::get('/entities/{entity:slug}', [\App\Http\Controllers\Api\CustomEntityController::class, 'show']);

        Route::get('/entities/{entity:slug}/records', [\App\Http\Controllers\Api\CustomEntityRecordController::class, 'index']);
        Route::post('/entities/{entity:slug}/records', [\App\Http\Controllers\Api\CustomEntityRecordController::class, 'store']);
        Route::put('/entities/{entity:slug}/records/{record}', [\App\Http\Controllers\Api\CustomEntityRecordController::class, 'update']);
        Route::delete('/entities/{entity:slug}/records/{record}', [\App\Http\Controllers\Api\CustomEntityRecordController::class, 'destroy']);
        Route::post('/entities/{entity:slug}/records/{record}/files/{fieldKey}', [\App\Http\Controllers\Api\CustomEntityRecordController::class, 'uploadFile']);
        Route::put('/entities/{entity:slug}/records/{record}/reply', [\App\Http\Controllers\Api\CustomEntityRecordController::class, 'reply']);
    });

    // ==========================================
    // Super Admin Only Routes
    // ==========================================
    // Public/Authenticated Settings Read
    Route::get('/settings', [\App\Http\Controllers\Api\SettingController::class, 'index']);

    Route::middleware('role:Super Admin')->group(function () {
        Route::get('/backups/status', [\App\Http\Controllers\Api\BackupController::class, 'status']);
        Route::post('/backups', [\App\Http\Controllers\Api\BackupController::class, 'store'])->middleware('throttle:3,10');
        Route::post('/settings', [\App\Http\Controllers\Api\SettingController::class, 'update']);
        Route::post('/settings/logo', [\App\Http\Controllers\Api\SettingController::class, 'uploadLogo']);
        Route::apiResource('shifts', \App\Http\Controllers\Api\ShiftController::class);
        Route::apiResource('users', \App\Http\Controllers\Api\UserController::class);
        Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);

        // Custom Entities: defining/editing the schema itself (Super Admin only).
        // Browsing entities + managing records lives in the Admin|Super Admin group above.
        Route::post('/entities', [\App\Http\Controllers\Api\CustomEntityController::class, 'store']);
        Route::put('/entities/{entity:slug}', [\App\Http\Controllers\Api\CustomEntityController::class, 'update']);
        Route::delete('/entities/{entity:slug}', [\App\Http\Controllers\Api\CustomEntityController::class, 'destroy']);
    });
});
