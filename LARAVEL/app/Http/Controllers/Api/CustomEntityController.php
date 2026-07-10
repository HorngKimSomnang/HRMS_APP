<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomEntity;
use App\Models\CustomEntityField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CustomEntityController extends Controller
{
    private const FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'dropdown', 'textarea', 'file'];

    public function index()
    {
        $entities = CustomEntity::withCount(['fields', 'records'])->orderBy('name')->get();

        return $this->successResponse($entities);
    }

    public function store(Request $request)
    {
        if ($unauthorized = $this->authorizeSuperAdmin()) {
            return $unauthorized;
        }

        $validated = $this->validateEntity($request);
        if ($validated instanceof \Illuminate\Http\JsonResponse) {
            return $validated;
        }

        $slug = $this->generateUniqueSlug($validated['name']);

        $entity = DB::transaction(function () use ($validated, $slug) {
            $entity = CustomEntity::create([
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $this->syncFields($entity, $validated['fields']);
            $this->syncSubmissionFlag($entity, (bool) ($validated['allow_employee_submissions'] ?? false));

            return $entity;
        });

        return $this->successResponse($entity->load('fields'), 'Entity created successfully.', 201);
    }

    public function show(CustomEntity $entity)
    {
        $entity->loadCount('records');

        return $this->successResponse($entity->load('fields'));
    }

    public function update(Request $request, CustomEntity $entity)
    {
        if ($unauthorized = $this->authorizeSuperAdmin()) {
            return $unauthorized;
        }

        $validated = $this->validateEntity($request);
        if ($validated instanceof \Illuminate\Http\JsonResponse) {
            return $validated;
        }

        DB::transaction(function () use ($entity, $validated) {
            $entity->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
            ]);

            $this->syncFields($entity, $validated['fields']);
            $this->syncSubmissionFlag($entity, (bool) ($validated['allow_employee_submissions'] ?? false));
        });

        return $this->successResponse($entity->fresh()->load('fields'), 'Entity updated successfully.');
    }

    public function destroy(CustomEntity $entity)
    {
        if ($unauthorized = $this->authorizeSuperAdmin()) {
            return $unauthorized;
        }

        $entity->delete();

        return $this->successResponse(null, 'Entity deleted successfully.');
    }

    /**
     * Defense-in-depth: schema definition (store/update/destroy) is already
     * gated to Super Admin at the route level (routes/api.php), but unlike
     * SettingController/AuditLogController this controller had no fallback
     * check of its own — a misconfigured/duplicated route would otherwise
     * bypass the restriction entirely.
     */
    private function authorizeSuperAdmin(): ?\Illuminate\Http\JsonResponse
    {
        if (!Auth::user()->hasRole('Super Admin')) {
            return $this->errorResponse('Unauthorized. Only Super Admin can define or edit entity schemas.', 403);
        }

        return null;
    }

    /**
     * Validate the entity + fields payload shared by store() and update().
     * Returns the validated array, or a JsonResponse if validation fails
     * (dropdown-options-required can't be reliably expressed via Laravel's
     * wildcard required_if, so it's checked manually below).
     */
    private function validateEntity(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'allow_employee_submissions' => 'sometimes|boolean',
            'fields' => 'required|array|min:1',
            'fields.*.id' => 'nullable|integer',
            'fields.*.label' => 'required|string|max:255',
            'fields.*.type' => ['required', Rule::in(self::FIELD_TYPES)],
            'fields.*.is_required' => 'sometimes|boolean',
            'fields.*.options' => 'nullable|array',
            'fields.*.options.*' => 'string|max:255',
        ]);

        foreach ($validated['fields'] as $field) {
            if ($field['type'] === 'dropdown' && empty($field['options'])) {
                return $this->errorResponse("Field '{$field['label']}' requires at least one option.", 422);
            }
        }

        return $validated;
    }

    private function generateUniqueSlug(string $name): string
    {
        $slug = Str::slug($name);
        if ($slug === '') {
            $slug = 'entity-' . Str::random(6);
        }

        $base = $slug;
        while (CustomEntity::where('slug', $slug)->exists()) {
            $slug = $base . '-' . Str::random(4);
        }

        return $slug;
    }

    /**
     * Create/update/remove a CustomEntity's fields to match the submitted list.
     * Field `key` is only ever set on creation — it must stay stable so it
     * keeps matching the keys already stored inside custom_entity_records.data.
     */
    private function syncFields(CustomEntity $entity, array $fields): void
    {
        $submittedIds = collect($fields)->pluck('id')->filter()->all();

        // The reserved submission-flag field (see CustomEntity::SUBMISSION_FLAG_KEY) is never
        // part of the submitted field list from the builder UI — exclude it here so a normal
        // field edit doesn't silently delete the "allow employee submissions" flag.
        CustomEntityField::where('custom_entity_id', $entity->id)
            ->whereNotIn('id', $submittedIds)
            ->where('key', '!=', CustomEntity::SUBMISSION_FLAG_KEY)
            ->delete();

        $existingKeys = $entity->fields()->pluck('key')->all();

        foreach ($fields as $index => $field) {
            $isRequired = (bool) ($field['is_required'] ?? false);
            $options = $field['type'] === 'dropdown' ? array_values($field['options']) : null;

            if (!empty($field['id'])) {
                $existingField = CustomEntityField::where('id', $field['id'])
                    ->where('custom_entity_id', $entity->id)
                    ->first();

                if ($existingField) {
                    $existingField->update([
                        'label' => $field['label'],
                        'type' => $field['type'],
                        'options' => $options,
                        'is_required' => $isRequired,
                        'sort_order' => $index,
                    ]);
                    continue;
                }
            }

            $key = $this->generateUniqueKey($field['label'], $existingKeys);
            $existingKeys[] = $key;

            CustomEntityField::create([
                'custom_entity_id' => $entity->id,
                'key' => $key,
                'label' => $field['label'],
                'type' => $field['type'],
                'options' => $options,
                'is_required' => $isRequired,
                'sort_order' => $index,
            ]);
        }
    }

    /**
     * The "employees can submit their own records" flag has no dedicated column —
     * it's represented by the presence/absence of a hidden CustomEntityField row
     * with the reserved key CustomEntity::SUBMISSION_FLAG_KEY.
     */
    private function syncSubmissionFlag(CustomEntity $entity, bool $allow): void
    {
        if ($allow) {
            CustomEntityField::firstOrCreate(
                ['custom_entity_id' => $entity->id, 'key' => CustomEntity::SUBMISSION_FLAG_KEY],
                ['label' => 'System: Allow Employee Submissions', 'type' => 'boolean', 'is_required' => false, 'sort_order' => -1]
            );
        } else {
            CustomEntityField::where('custom_entity_id', $entity->id)
                ->where('key', CustomEntity::SUBMISSION_FLAG_KEY)
                ->delete();
        }
    }

    private function generateUniqueKey(string $label, array $existingKeys): string
    {
        $key = Str::slug($label, '_');
        if ($key === '') {
            $key = 'field_' . Str::random(6);
        }

        $base = $key;
        $suffix = 2;
        while (in_array($key, $existingKeys, true)) {
            $key = $base . '_' . $suffix;
            $suffix++;
        }

        return $key;
    }
}
