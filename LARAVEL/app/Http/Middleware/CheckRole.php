<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     * Supports pipe-separated roles: role:Super Admin|Employee
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Expand pipe-separated roles
        $allRoles = [];
        foreach ($roles as $role) {
            foreach (explode('|', $role) as $r) {
                $allRoles[] = trim($r);
            }
        }

        if ($user->hasRole($allRoles)) {
            return $next($request);
        }

        return response()->json(['message' => 'Forbidden. Insufficient role.'], 403);
    }
}
