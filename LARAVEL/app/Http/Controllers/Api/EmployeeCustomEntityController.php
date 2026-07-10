<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomEntity;
use App\Models\CustomEntityRecord;
use App\Traits\BuildsCustomEntityRecordRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

/**
 * Employee self-service access to custom entities the Super Admin has flagged
 * as employee-submittable (CustomEntity::SUBMISSION_FLAG_KEY). Employees can
 * view and create their own records and edit them, but never delete them —
 * these are meant to be a durable record (e.g. performance reports), and the
 * Super Admin retains full delete power via the existing admin-only
 * CustomEntityRecordController, which this controller does not touch.
 */
class EmployeeCustomEntityController extends Controller
{
    use BuildsCustomEntityRecordRules;

    public function index()
    {
        $entities = CustomEntity::whereHas('allFieldsIncludingSystem', function ($query) {
            $query->where('key', CustomEntity::SUBMISSION_FLAG_KEY);
        })->orderBy('name')->get(['id', 'name', 'slug', 'description']);

        return $this->successResponse($entities);
    }

    public function show(CustomEntity $entity)
    {
        if (!$entity->allow_employee_submissions) {
            return $this->errorResponse('Entity not found.', 404);
        }

        return $this->successResponse($entity->load('fields'));
    }

    public function records(CustomEntity $entity)
    {
        if (!$entity->allow_employee_submissions) {
            return $this->errorResponse('Entity not found.', 404);
        }

        $records = $entity->records()
            ->where('created_by', Auth::id())
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return $this->successResponse($records);
    }

    public function store(Request $request, CustomEntity $entity)
    {
        if (!$entity->allow_employee_submissions) {
            return $this->errorResponse('Entity not found.', 404);
        }

        $this->normalizeEmptyValues($request, $entity);

        $validated = $request->validate($this->buildRules($entity));

        $record = CustomEntityRecord::create([
            'custom_entity_id' => $entity->id,
            'data' => $validated['data'] ?? [],
            'created_by' => Auth::id(),
        ]);

        $admins = \App\Models\User::role(['Admin', 'Super Admin'])->get();
        \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\CustomEntityRecordSubmitted($record, $entity));
        $record->unsetRelation('creator');

        return $this->successResponse($record, 'Record submitted successfully.', 201);
    }

    public function update(Request $request, CustomEntity $entity, CustomEntityRecord $record)
    {
        if ($record->custom_entity_id !== $entity->id) {
            return $this->errorResponse('Record not found.', 404);
        }

        if ($record->created_by !== Auth::id()) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        if (!$entity->allow_employee_submissions) {
            return $this->errorResponse('This form is no longer accepting submissions.', 403);
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

    public function uploadFile(Request $request, CustomEntity $entity, CustomEntityRecord $record, string $fieldKey)
    {
        if ($record->custom_entity_id !== $entity->id) {
            return $this->errorResponse('Record not found.', 404);
        }

        if ($record->created_by !== Auth::id()) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        if (!$entity->allow_employee_submissions) {
            return $this->errorResponse('This form is no longer accepting submissions.', 403);
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
}
