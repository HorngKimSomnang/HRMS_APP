<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class LiveDataVersion
{
    private const KEY_PREFIX = 'hrms:live-data:';

    /**
     * Features that should refresh when a resource changes.
     *
     * @return list<string>
     */
    public static function affectedResources(string $resource): array
    {
        $resource = self::normalizeResource($resource);
        $affected = [$resource, 'dashboard', 'notifications', 'audit-logs'];

        if (in_array($resource, [
            'attendance',
            'leaves',
            'overtimes',
            'payslips',
            'employees',
            'entities',
            'lifecycle',
        ], true)) {
            $affected[] = 'reports';
        }

        if ($resource === 'employees') {
            array_push($affected, 'assets', 'tasks', 'lifecycle', 'payslips');
        }

        if ($resource === 'shifts') {
            $affected[] = 'employees';
        }

        if ($resource === 'announcements') {
            $affected[] = 'holidays';
        }

        if ($resource === 'leave-types') {
            $affected[] = 'leaves';
        }

        if ($resource === 'users' || $resource === 'profile') {
            $affected[] = 'admins';
        }

        return array_values(array_unique($affected));
    }

    public static function bump(string $resource): void
    {
        $version = (string) Str::uuid();

        Cache::forever(self::key('global'), $version);

        foreach (self::affectedResources($resource) as $affectedResource) {
            Cache::forever(self::key($affectedResource), $version);
        }
    }

    /**
     * @param  list<string>  $resources
     * @return array<string, string>
     */
    public static function snapshot(array $resources): array
    {
        $versions = [];

        foreach (array_values(array_unique($resources)) as $resource) {
            $normalized = self::normalizeResource($resource);
            if ($normalized !== '') {
                $versions[$normalized] = (string) Cache::get(self::key($normalized), '0');
            }
        }

        return $versions;
    }

    public static function globalVersion(): string
    {
        return (string) Cache::get(self::key('global'), '0');
    }

    public static function normalizeResource(string $resource): string
    {
        return strtolower(trim($resource, " \t\n\r\0\x0B/"));
    }

    private static function key(string $resource): string
    {
        return self::KEY_PREFIX.$resource;
    }
}
