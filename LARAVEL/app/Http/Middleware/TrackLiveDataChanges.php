<?php

namespace App\Http\Middleware;

use App\Services\LiveDataVersion;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class TrackLiveDataChanges
{
    /** @var list<string> */
    private const IGNORED_RESOURCES = [
        '',
        'login',
        'logout',
        'register',
        'forgot-password',
        'reset-password',
        'change-password',
        'data-versions',
        'backups',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (
            in_array(strtoupper($request->method()), ['POST', 'PUT', 'PATCH', 'DELETE'], true)
            && $response->getStatusCode() < 400
        ) {
            $resource = $this->resourceFromRequest($request);

            if (! in_array($resource, self::IGNORED_RESOURCES, true)) {
                try {
                    LiveDataVersion::bump($resource);
                } catch (Throwable $exception) {
                    // A cache problem must never turn a successful HR action into an error.
                    Log::warning('Unable to update live-data version.', [
                        'resource' => $resource,
                        'message' => $exception->getMessage(),
                    ]);
                }
            }
        }

        return $response;
    }

    private function resourceFromRequest(Request $request): string
    {
        $resource = LiveDataVersion::normalizeResource((string) $request->segment(2));

        return match ($resource) {
            'my' => 'entities',
            'profile' => 'profile',
            default => $resource,
        };
    }
}
