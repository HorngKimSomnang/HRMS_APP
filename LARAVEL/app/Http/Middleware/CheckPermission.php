<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     * Supports pipe-separated permissions: permission:leaves.edit|attendance.edit
     * User passes if they have ANY of the listed permissions (or are Super Admin).
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }


        // Support pipe-separated permissions passed as a single string (e.g. "leaves.edit|attendance.edit")
        $allRequired = [];
        foreach ($permissions as $perm) {
            foreach (explode('|', $perm) as $p) {
                $allRequired[] = trim($p);
            }
        }

        foreach ($allRequired as $permission) {
            if ($user->hasPermissionTo($permission)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Forbidden. You do not have the required permission.'], 403);
    }
}
