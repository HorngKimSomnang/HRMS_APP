<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * AuditLogger — Enterprise-grade centralized audit trail service.
 *
 * Usage:
 *   AuditLogger::log($request, 'LEAVE_STATUS_CHANGED', $leave, ['status' => 'approved']);
 *   AuditLogger::logAuth($request, 'LOGIN_SUCCESS', $user);
 */
class AuditLogger
{
    /**
     * Log a privileged action performed by the currently authenticated user.
     *
     * @param  Request      $request   The incoming HTTP request (for IP & User-Agent)
     * @param  string       $action    Uppercase snake_case event name (e.g. PAYSLIP_GENERATED)
     * @param  mixed|null   $model     Eloquent model instance the action was performed on (or null)
     * @param  array        $context   Additional key-value metadata to store as JSON
     * @param  string|null  $roleOverride  Force a role label (default: resolved from Auth user)
     */
    public static function log(
        Request $request,
        string $action,
        mixed $model = null,
        array $context = [],
        ?string $roleOverride = null
    ): void {
        $user = Auth::user();
        if (!$user) {
            return; // Safety guard — never log unauthenticated actions here
        }

        $role = $roleOverride ?? self::resolveRole($user);

        AuditLog::create([
            'user_id'    => $user->id,
            'role'       => $role,
            'action'     => $action,
            'model_type' => $model ? get_class($model) : null,
            'model_id'   => $model?->getKey(),
            'context'    => array_filter(
                array_merge($context, self::requestMeta($request)),
                fn ($v) => $v !== null && $v !== ''
            ),
            'ip_address' => $request->ip(),
        ]);
    }

    /**
     * Log an authentication event (login, logout, failed login).
     * Accepts a user explicitly because Auth::user() may not be set on failed logins.
     *
     * @param  Request     $request
     * @param  string      $action   e.g. LOGIN_SUCCESS | LOGIN_FAILED | LOGOUT | PASSWORD_CHANGED
     * @param  mixed|null  $user     The User model (or null for failed logins)
     * @param  array       $context  Extra context (e.g. ['email' => $request->email])
     */
    public static function logAuth(
        Request $request,
        string $action,
        mixed $user = null,
        array $context = []
    ): void {
        AuditLog::create([
            'user_id'    => $user?->id,
            'role'       => $user ? self::resolveRole($user) : 'Unknown',
            'action'     => $action,
            'model_type' => $user ? get_class($user) : null,
            'model_id'   => $user?->getKey(),
            'context'    => array_filter(
                array_merge($context, self::requestMeta($request)),
                fn ($v) => $v !== null && $v !== ''
            ),
            'ip_address' => $request->ip(),
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static function resolveRole(mixed $user): string
    {
        if ($user->hasRole('Super Admin')) return 'Super Admin';
        if ($user->hasRole('Admin'))       return 'Admin';
        return 'Employee';
    }

    /**
     * Append browser/device metadata into context JSON using existing column.
     * Truncates User-Agent to 200 chars to keep it readable.
     */
    private static function requestMeta(Request $request): array
    {
        $ua = $request->userAgent();
        return [
            'user_agent' => $ua ? mb_substr($ua, 0, 200) : null,
        ];
    }
}
