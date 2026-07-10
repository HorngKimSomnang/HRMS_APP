<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomEntity;
use App\Models\CustomEntityRecord;
use App\Traits\BuildsCustomEntityRecordRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class CustomEntityRecordController extends Controller
{
    use BuildsCustomEntityRecordRules;

    public function index(Request $request, CustomEntity $entity)
    {
        if ($unauthorized = $this->authorizeAdminOrSuperAdmin()) {
            return $unauthorized;
        }

        $records = $entity->records()->with('creator:id,name')->orderBy('created_at', 'desc')->paginate(20);

        return $this->successResponse($records);
    }

    public function store(Request $request, CustomEntity $entity)
    {
        if ($unauthorized = $this->authorizeAdminOrSuperAdmin()) {
            return $unauthorized;
        }

        $this->normalizeEmptyValues($request, $entity);

        $validated = $request->validate($this->buildRules($entity));

        $record = CustomEntityRecord::create([
            'custom_entity_id' => $entity->id,
            'data' => $validated['data'] ?? [],
            'created_by' => Auth::id(),
        ]);

        return $this->successResponse($record, 'Record created successfully.', 201);
    }

    public function update(Request $request, CustomEntity $entity, CustomEntityRecord $record)
    {
        if ($unauthorized = $this->authorizeAdminOrSuperAdmin()) {
            return $unauthorized;
        }

        if ($record->custom_entity_id !== $entity->id) {
            return $this->errorResponse('Record not found.', 404);
        }

        $this->normalizeEmptyValues($request, $entity);

        $validated = $request->validate($this->buildRules($entity));

        $data = $validated['data'] ?? [];
        if (isset($record->data[CustomEntityRecord::ADMIN_REPLY_KEY])) {
            $data[CustomEntityRecord::ADMIN_REPLY_KEY] = $record->data[CustomEntityRecord::ADMIN_REPLY_KEY];
        }
        $record->update(['data' => $data]);

        return $this->successResponse($record->fresh(), 'Record updated successfully.');
    }

    public function reply(Request $request, CustomEntity $entity, CustomEntityRecord $record)
    {
        if ($unauthorized = $this->authorizeAdminOrSuperAdmin()) {
            return $unauthorized;
        }

        if ($record->custom_entity_id !== $entity->id) {
            return $this->errorResponse('Record not found.', 404);
        }

        $request->validate(['message' => 'required|string|max:2000']);

        $data = $record->data;
        $data[CustomEntityRecord::ADMIN_REPLY_KEY] = [
            'message' => $request->message,
            'replied_by' => Auth::user()->name,
            'replied_at' => now()->toISOString(),
        ];
        $record->update(['data' => $data]);

        if ($record->created_by) {
            $record->creator?->notify(new \App\Notifications\CustomEntityRecordReplied($record, $entity));
        }

        return $this->successResponse($record->fresh(), 'Reply sent.');
    }

    public function destroy(CustomEntity $entity, CustomEntityRecord $record)
    {
        if ($unauthorized = $this->authorizeAdminOrSuperAdmin()) {
            return $unauthorized;
        }

        if ($record->custom_entity_id !== $entity->id) {
            return $this->errorResponse('Record not found.', 404);
        }

        $record->delete();

        return $this->successResponse(null, 'Record deleted successfully.');
    }

    public function uploadFile(Request $request, CustomEntity $entity, CustomEntityRecord $record, string $fieldKey)
    {
        if ($unauthorized = $this->authorizeAdminOrSuperAdmin()) {
            return $unauthorized;
        }

        if ($record->custom_entity_id !== $entity->id) {
            return $this->errorResponse('Record not found.', 404);
        }

        $field = $entity->fields()->where('key', $fieldKey)->where('type', 'file')->first();
        if (!$field) {
            return $this->errorResponse('This field does not accept file uploads.', 404);
        }

        $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png,pdf,xlsx,xls,csv,doc,docx|max:10240',
        ]);

        $oldValue = $record->data[$fieldKey] ?? null;
        if (is_array($oldValue) && !empty($oldValue['path'])) {
            Storage::disk('public')->delete($oldValue['path']);
        }

        $path = $request->file('file')->store("custom_entities/{$entity->slug}", 'public');

        $data = $record->data;
        $data[$fieldKey] = [
            'name' => $request->file('file')->getClientOriginalName(),
            'path' => $path,
        ];
        $record->update(['data' => $data]);

        return $this->successResponse($record->fresh(), 'File uploaded successfully.');
    }

    /**
     * Defense-in-depth: record management is already gated to Admin+Super Admin
     * at the route level (routes/api.php), but unlike SettingController/
     * AuditLogController this controller had no fallback check of its own —
     * a misconfigured/duplicated route would otherwise bypass it entirely.
     */
    private function authorizeAdminOrSuperAdmin(): ?\Illuminate\Http\JsonResponse
    {
        if (!Auth::user()->hasRole(['Super Admin', 'Admin'])) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        return null;
    }
}
