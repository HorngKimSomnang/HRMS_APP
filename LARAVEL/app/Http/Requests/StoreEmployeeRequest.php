<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorized by middleware usually
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            // Archived accounts still represent the same person. Reusing their
            // email would create a duplicate HR identity that cannot be safely
            // restored later, so uniqueness includes soft-deleted users.
            'email' => ['required', 'email', Rule::unique('users', 'email')],
            'job_title' => 'required|string',
            'department' => 'nullable|string',
            'joining_date' => 'required|date',
            'salary' => 'nullable|numeric',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'gender' => 'nullable|string|in:Male,Female,Other',
            'dob' => 'nullable|date',
            'profile_picture' => 'nullable|image|max:2048',
            'shift_id' => 'nullable|integer|min:1',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An employee with this email already exists, including archived records. Restore the archived employee instead of creating a duplicate.',
        ];
    }
}
