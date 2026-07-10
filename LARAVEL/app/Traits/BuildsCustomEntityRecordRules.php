<?php

namespace App\Traits;

use App\Models\CustomEntity;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

trait BuildsCustomEntityRecordRules
{
    /**
     * Build validation rules for a record's `data` payload from the entity's
     * field definitions (required-ness, type checks, dropdown option checks).
     */
    protected function buildRules(CustomEntity $entity): array
    {
        $rules = ['data' => 'required|array'];

        foreach ($entity->fields as $field) {
            $key = "data.{$field->key}";
            $fieldRules = [$field->is_required ? 'required' : 'nullable'];

            switch ($field->type) {
                case 'text':
                case 'textarea':
                    $fieldRules[] = 'string';
                    $fieldRules[] = 'max:5000';
                    break;
                case 'number':
                    $fieldRules[] = 'numeric';
                    break;
                case 'date':
                    $fieldRules[] = 'date';
                    break;
                case 'boolean':
                    $fieldRules[] = 'boolean';
                    break;
                case 'dropdown':
                    $fieldRules[] = Rule::in($field->options ?? []);
                    break;
                case 'file':
                    // File content never rides in the JSON `data` payload — it's
                    // uploaded separately via uploadFile(). is_required on a file
                    // field is advisory (UI nudge), not enforced here.
                    $fieldRules = ['nullable'];
                    break;
            }

            $rules[$key] = $fieldRules;
        }

        return $rules;
    }

    /**
     * Laravel's `nullable` only skips further rules for a literal null, not
     * an empty string — an unselected dropdown or blank input would otherwise
     * fail validation even on a field that isn't required. Convert '' to null
     * for every non-required field before validating.
     */
    protected function normalizeEmptyValues(Request $request, CustomEntity $entity): void
    {
        $data = $request->input('data', []);

        foreach ($entity->fields as $field) {
            if (!$field->is_required && array_key_exists($field->key, $data) && $data[$field->key] === '') {
                $data[$field->key] = null;
            }
        }

        $request->merge(['data' => $data]);
    }
}
