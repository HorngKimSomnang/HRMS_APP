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
        // Only Super Admin can change system-wide settings
        if (!Auth::user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized. Only Super Admin can modify system settings.'], 403);
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
        // Only Super Admin can change branding/system identity
        if (!Auth::user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized. Only Super Admin can update the company logo.'], 403);
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
