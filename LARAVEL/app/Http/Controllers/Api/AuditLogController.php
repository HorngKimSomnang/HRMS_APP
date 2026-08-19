<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {

        $query = AuditLog::with('user')
            ->orderBy('created_at', 'desc');

        if ($request->filled('action')) {
            $query->where('action', 'like', '%' . $request->action . '%');
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('model_type')) {
            $query->where('model_type', 'like', '%' . $request->model_type . '%');
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $logs = $query->paginate(50);

        return response()->json($logs);
    }

    public function export(Request $request)
    {

        AuditLog::create([
            'user_id' => Auth::id(),
            'role' => Auth::user()->getActiveRole()?->name ?? 'Unknown',
            'action' => 'AUDIT_EXPORTED',
            'ip_address' => $request->ip(),
            'context' => [
                'user_agent' => $request->userAgent(),
                'status' => 'success'
            ]
        ]);

        return response()->json(['message' => 'Audit export logged.']);
    }
}
