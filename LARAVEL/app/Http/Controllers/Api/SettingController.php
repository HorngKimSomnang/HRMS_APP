<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SettingController extends Controller
{
    /**
     * Get all settings grouped by key.
     */
    public function index()
    {
        $settings = Setting::all();
        // Return key-value pairs for easy frontend consumption
        $formatted = $settings->pluck('value', 'key');
        
        // Also return full meta data if needed specifically
        return response()->json([
            'data' => $formatted,
            'meta' => $settings
        ]);
    }

    /**
     * Update settings.
     * Expects an array of key-value pairs.
     */
    public function update(Request $request)
    {
        $keyPermissions = [
            'company_name' => 'settings.edit_general',
            'company_currency' => 'settings.edit_general',
            'office_lat' => 'settings.edit_attendance',
            'office_lng' => 'settings.edit_attendance',
            'office_radius' => 'settings.edit_attendance',
            'payroll_overtime_rate' => 'settings.edit_payroll',
            'payroll_bonus_flat' => 'settings.edit_payroll',
            'payroll_attendance_allowance' => 'settings.edit_payroll',
            'payroll_allowances' => 'settings.edit_payroll',
            'payroll_deduction_leave' => 'settings.edit_payroll',
            'payroll_deduction_late' => 'settings.edit_payroll',
            'payroll_deduction_other' => 'settings.edit_payroll',
        ];

        $user = Auth::user();
        foreach ($request->input('settings', []) as $item) {
            $key = $item['key'] ?? '';
            $requiredPerm = $keyPermissions[$key] ?? 'settings.edit_general';
            if (!$user->hasPermissionTo($requiredPerm)) {
                return response()->json(['message' => "Unauthorized to modify setting: {$key}. Requires permission: {$requiredPerm}."], 403);
            }
        }

        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|exists:settings,key',
            'settings.*.value' => 'nullable',
        ]);

        // Capture previous values for audit context
        $changedKeys = array_column($data['settings'], 'key');
        $previousValues = Setting::whereIn('key', $changedKeys)->pluck('value', 'key')->toArray();

        foreach ($data['settings'] as $item) {
            Setting::where('key', $item['key'])->update(['value' => $item['value']]);
        }

        // Build a diff of what changed
        $changes = [];
        foreach ($data['settings'] as $item) {
            $changes[$item['key']] = [
                'from' => $previousValues[$item['key']] ?? null,
                'to'   => $item['value'],
            ];
        }

        AuditLogger::log($request, 'SYSTEM_SETTINGS_UPDATED', null, [
            'keys_updated' => $changedKeys,
            'changes'      => $changes,
        ]);

        return response()->json(['message' => 'Settings updated successfully']);
    }

    /**
     * Upload Company Logo.
     */
    public function uploadLogo(Request $request)
    {
        // Only users with settings.edit_general can change branding/system identity
        if (!Auth::user()->hasPermissionTo('settings.edit_general')) {
            return response()->json(['message' => 'Unauthorized. Requires settings.edit_general permission.'], 403);
        }

        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,svg|max:2048'
        ]);

        $path = $request->file('logo')->store('company', 'public');
        
        Setting::updateOrCreate(
            ['key' => 'company_logo'],
            ['value' => $path, 'type' => 'image', 'group' => 'general']
        );

        return response()->json([
            'message' => 'Company logo updated successfully',
            'logo_path' => $path
        ]);
    }
}
