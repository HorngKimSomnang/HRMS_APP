<?php

namespace App\Http\Requests;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // For updates, we need to handle unique constraints carefully
        // The ID is usually passed as a route parameter 'employee'
        // But since we have a user relationship, it's tricker.
        // For simplicity in this "Pro" refactor, we usually pass the ID or ignore it.
        
        // Note: In strict 'Pro' apps we would pass the ID to ignore. 
        // Here we will use 'sometimes' validation.
        
        return [
            'first_name' => 'sometimes|required|string',
            'last_name' => 'sometimes|required|string',
            'email' => 'sometimes|required|email', // Unique check is complex here due to user relation, handled in controller or custom rule if strict
            'employee_code' => 'sometimes|required', // Unique check likewise
            'job_title' => 'sometimes|string',
            'department' => 'nullable|string',
            'joining_date' => 'sometimes|required|date',
            'salary' => 'nullable|numeric',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'gender' => 'nullable|string|in:Male,Female,Other',
            'dob' => 'nullable|date',
            'profile_picture' => 'nullable|image|max:10240',
            'shift_id' => 'nullable|integer|min:1',
            // Admin resetting an employee's password — was previously read straight off
            // the request in the controller with zero validation of any kind.
            'password' => ['nullable', 'string', PasswordPolicy::rule()],
        ];
    }
}
