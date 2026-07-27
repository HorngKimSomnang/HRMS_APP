<?php

namespace App\Support;

use App\Models\Setting;

class HrCatalog
{
    public static function defaultLeaveTypes(): array
    {
        return [
            ['id' => 1, 'name' => 'Annual Leave', 'days_allowed' => 18, 'is_paid' => true],
            ['id' => 2, 'name' => 'Sick Leave', 'days_allowed' => 7, 'is_paid' => true],
            ['id' => 3, 'name' => 'Unpaid Leave', 'days_allowed' => 0, 'is_paid' => false],
            ['id' => 4, 'name' => 'Maternity Leave', 'days_allowed' => 90, 'is_paid' => true],
            ['id' => 5, 'name' => 'Paternity Leave', 'days_allowed' => 5, 'is_paid' => true],
        ];
    }

    public static function defaultShifts(): array
    {
        return [
            [
                'id' => 1,
                'name' => 'Morning Shift',
                'start_time' => '09:00:00',
                'end_time' => '16:55:00',
                'grace_period_minutes' => 15,
            ],
        ];
    }

    public static function getLeaveTypes(): array
    {
        $raw = Setting::where('key', 'leave_types')->value('value');
        $types = self::decodeArray($raw);

        if (empty($types)) {
            $types = self::defaultLeaveTypes();
            self::saveLeaveTypes($types);
        }

        return array_values($types);
    }

    public static function saveLeaveTypes(array $types): void
    {
        Setting::updateOrCreate(
            ['key' => 'leave_types'],
            [
                'value' => json_encode(array_values($types)),
                'type' => 'json',
                'group' => 'hr',
            ]
        );
    }

    public static function findLeaveTypeById(int $id): ?array
    {
        foreach (self::getLeaveTypes() as $type) {
            if ((int) ($type['id'] ?? 0) === $id) {
                return $type;
            }
        }

        return null;
    }

    public static function getShifts(): array
    {
        $raw = Setting::where('key', 'shifts')->value('value');
        $shifts = self::decodeArray($raw);

        if (empty($shifts)) {
            $shifts = self::defaultShifts();
            self::saveShifts($shifts);
        }

        return array_values($shifts);
    }

    public static function saveShifts(array $shifts): void
    {
        Setting::updateOrCreate(
            ['key' => 'shifts'],
            [
                'value' => json_encode(array_values($shifts)),
                'type' => 'json',
                'group' => 'hr',
            ]
        );
    }

    public static function findShiftById(?int $id): ?array
    {
        if (!$id) {
            return null;
        }

        foreach (self::getShifts() as $shift) {
            if ((int) ($shift['id'] ?? 0) === $id) {
                return $shift;
            }
        }

        return null;
    }

    public static function nextId(array $items): int
    {
        $max = 0;
        foreach ($items as $item) {
            $max = max($max, (int) ($item['id'] ?? 0));
        }

        return $max + 1;
    }

    private static function decodeArray(?string $raw): array
    {
        if (!$raw) {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }
}
