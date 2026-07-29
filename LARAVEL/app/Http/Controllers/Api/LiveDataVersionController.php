<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LiveDataVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LiveDataVersionController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $resources = collect(explode(',', (string) $request->query('resources', '')))
            ->map(fn (string $resource) => LiveDataVersion::normalizeResource($resource))
            ->filter()
            ->unique()
            ->take(20)
            ->values()
            ->all();

        return response()
            ->json([
                'global' => LiveDataVersion::globalVersion(),
                'resources' => LiveDataVersion::snapshot($resources),
            ])
            ->header('Cache-Control', 'no-store, private');
    }
}
