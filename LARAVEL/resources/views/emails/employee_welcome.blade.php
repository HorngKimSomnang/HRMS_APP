<x-mail::message>

<div style="text-align: center; margin-bottom: 16px;">
<img src="{{ $message->embed(public_path('logo_small.png')) }}" alt="HEN CHEN" width="120" height="120" style="display:inline-block; width:120px; height:120px; object-fit:contain;">
<div style="margin-top:8px; color:#1e40af; font-size:18px; font-weight:700; letter-spacing:0.04em;">HEN CHEN</div>
</div>

# Your HEN CHEN Employee Account Is Ready

Dear **{{ strtoupper($user->name) }}**,

Your account has been created. Here are your login credentials:

<x-mail::panel>
**Email:** {{ $user->email }}

**Password:** {{ $generatedPassword }}
</x-mail::panel>

Please login and change your password immediately.

Regards,<br>
{{ $adminName }}
</x-mail::message>
