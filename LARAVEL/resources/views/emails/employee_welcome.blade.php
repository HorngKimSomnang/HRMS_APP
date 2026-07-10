<x-mail::message>

{{-- Logo hosted on public CDN - works in Gmail --}}
<div style="text-align: center; margin-bottom: 16px;">
<img src="https://i.imgur.com/lwgNc2y.png" alt="{{ config('app.name') }}" width="120" height="120" style="display:inline-block; width:120px; height:120px; object-fit:contain;">
</div>

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
