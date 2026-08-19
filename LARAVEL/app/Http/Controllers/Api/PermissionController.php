<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Permission;
use Illuminate\Validation\ValidationException;

class PermissionController extends Controller
{
    public function index()
    {
        // Load roles to show "Used by" in the UI
        $permissions = Permission::with('roles:id,name')->orderBy('id', 'desc')->get();
        return response()->json($permissions);
    }

    public function getFeatures()
    {
        // Group features by section to match the shape the frontend needs for SIDEBAR_SECTIONS
        $features = \Illuminate\Support\Facades\DB::table('features')->get();
        $sections = [];
        
        foreach ($features as $feature) {
            $section = $feature->section;
            if (!isset($sections[$section])) {
                $sections[$section] = [
                    'name' => $section,
                    'features' => []
                ];
            }
            $sections[$section]['features'][] = $feature->key;
        }

        // Return just the array values to have a flat list of section objects
        return response()->json(array_values($sections));
    }

    public function store(Request $request)
    {
        $request->validate([
            'feature' => [
                'required',
                'string',
                'exists:features,key'
            ],
            'action' => [
                'required',
                'string',
                'regex:/^[a-z_]+$/'
            ]
        ], [
            'feature.exists' => 'The selected feature is invalid.',
            'action.regex' => 'The action must only contain lowercase letters and underscores.'
        ]);

        $exists = Permission::where('feature', $request->feature)
                            ->where('action', $request->action)
                            ->exists();
        if ($exists) {
            return response()->json(['message' => 'The permission name has already been taken.'], 422);
        }

        $permission = Permission::create([
            'feature' => $request->feature,
            'action' => $request->action
        ]);

        // Load roles for consistent response shape
        $permission->load('roles:id,name');

        return response()->json([
            'message' => 'Permission created successfully',
            'permission' => $permission
        ], 201);
    }

    public function destroy(Permission $permission)
    {
        // 409 Conflict if permission is still assigned to ANY role
        if ($permission->roles()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete permission because it is assigned to one or more roles. Please unassign it first.'
            ], 409);
        }

        $permission->delete();

        return response()->json([
            'message' => 'Permission deleted successfully'
        ]);
    }
}
