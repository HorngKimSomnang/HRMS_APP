<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ForgotPasswordController;
use App\Http\Controllers\Api\TaskController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendOtp']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);
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
    Route::get('/attendance/history', [\App\Http\Controllers\Api\AttendanceController::class, 'history']);
    
    // Leaves (Employee handles own)
    Route::get('/leaves/balances', [\App\Http\Controllers\Api\LeaveController::class, 'balances']);
    Route::apiResource('leaves', \App\Http\Controllers\Api\LeaveController::class);
    Route::apiResource('leave-types', \App\Http\Controllers\Api\LeaveTypeController::class);
    
    Route::apiResource('documents', \App\Http\Controllers\Api\DocumentController::class);
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('payslips', \App\Http\Controllers\Api\PayslipController::class);
    Route::post('payslips/{payslip}/sign', [\App\Http\Controllers\Api\PayslipController::class, 'sign']);
    Route::apiResource('payroll-requests', \App\Http\Controllers\Api\PayrollRequestController::class);
    Route::apiResource('overtimes', \App\Http\Controllers\Api\OvertimeController::class);
    
    // Dashboard & Notifications
    Route::get('/dashboard', [\App\Http\Controllers\Api\DashboardController::class, 'index']);
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/mark-read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::delete('/notifications/clear-all', [\App\Http\Controllers\Api\NotificationController::class, 'destroyAll']);
    Route::delete('/notifications/{id}', [\App\Http\Controllers\Api\NotificationController::class, 'destroy']);

    // ==========================================
    // Admin & Super Admin Only Routes
    // ==========================================
    Route::middleware('role:Super Admin|Admin')->group(function () {
        Route::apiResource('employees', \App\Http\Controllers\Api\EmployeeController::class);
        
        // Reports
        Route::get('/reports/attendance', [\App\Http\Controllers\Api\ReportController::class, 'attendanceReport']);
        Route::get('/reports/leaves', [\App\Http\Controllers\Api\ReportController::class, 'leavesReport']);
        Route::get('/reports/employees', [\App\Http\Controllers\Api\ReportController::class, 'employeesReport']);
        Route::get('/reports/payroll', [\App\Http\Controllers\Api\ReportController::class, 'payrollReport']);
        Route::get('/reports/overtime', [\App\Http\Controllers\Api\ReportController::class, 'overtimeReport']);
        Route::post('/reports/send-to-superadmin', [\App\Http\Controllers\Api\ReportController::class, 'sendToSuperAdmin']);

        Route::put('/leaves/{id}/status', [\App\Http\Controllers\Api\LeaveController::class, 'updateStatus']);
        Route::delete('/attendance/clear', [\App\Http\Controllers\Api\AttendanceController::class, 'clearLogs']);
        Route::put('/attendance/{id}/manual-clock-out', [\App\Http\Controllers\Api\AttendanceController::class, 'manualClockOut']);
        Route::delete('/attendance/{id}', [\App\Http\Controllers\Api\AttendanceController::class, 'destroy']);
    });

    // ==========================================
    // Super Admin Only Routes
    // ==========================================
    // Public/Authenticated Settings Read
    Route::get('/settings', [\App\Http\Controllers\Api\SettingController::class, 'index']);

    Route::middleware('role:Super Admin')->group(function () {
        Route::post('/settings', [\App\Http\Controllers\Api\SettingController::class, 'update']);
        Route::post('/settings/logo', [\App\Http\Controllers\Api\SettingController::class, 'uploadLogo']);
        Route::apiResource('shifts', \App\Http\Controllers\Api\ShiftController::class);
        Route::apiResource('users', \App\Http\Controllers\Api\UserController::class);
        Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
    });
});

