<x-mail::message>

@if($logoBase64)
<div style="text-align: center; margin-bottom: 16px;">
<img src="{{ $logoBase64 }}" alt="{{ config('app.name') }}" width="120" height="120" style="display:inline-block; width:120px; height:120px; object-fit:contain;">
</div>
@endif

# Welcome to {{ config('app.name', 'HRMS') }}

Dear **{{ strtoupper($user->name) }}**,

Your account has been created. Here are your login credentials:

<x-mail::panel>
**Email:** {{ $user->email }}

**Password:** {{ $generatedPassword }}
</x-mail::panel>

Please login and change your password immediately.

<x-mail::button :url="env('APP_URL')">
Login Now
</x-mail::button>

Regards,<br>
Heng Camary
</x-mail::message>
