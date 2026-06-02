<x-mail::message>
# Welcome to {{ config('app.name', 'HRMS') }}

Dear **{{ strtoupper($user->name) }}**,

Your account has been created. Here are your login credentials:

<x-mail::panel>
**Email:** [{{ $user->email }}](mailto:{{ $user->email }})

**Password:** {{ $generatedPassword }}
</x-mail::panel>

Please login and change your password immediately.

<x-mail::button :url="env('APP_URL')">
Login Now
</x-mail::button>

Regards,<br>
{{ config('app.name', 'HRMS') }} Admin
</x-mail::message>
