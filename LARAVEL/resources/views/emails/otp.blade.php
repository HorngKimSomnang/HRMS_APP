<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HRMS Password Reset</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="{{ $message->embed(public_path('logo_small.png')) }}" alt="HEN CHEN Logo" style="max-height: 100px; width: auto; max-width: 100%;">
        </div>

        <h2 style="color: #0f172a; text-align: center; margin-top: 0; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
        
        <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
            We received a request to reset your HRMS account password. Please use the verification code below to securely reset your password.
        </p>
        
        <div style="text-align: center; margin: 40px 0; padding: 30px; background-color: #f1f5f9; border-radius: 12px; border: 1px dashed #cbd5e1;">
            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Your One-Time Password</p>
            <span style="display: inline-block; font-size: 36px; font-weight: 800; color: #1e293b; letter-spacing: 8px;">
                {{ $otp }}
            </span>
        </div>
        
        <p style="color: #64748b; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 10px;">
            This code is valid for <strong>15 minutes</strong>.<br>Please do not share this code with anyone.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center; margin: 0;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
        
        <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin-top: 30px;">
            &copy; {{ date('Y') }} HEN CHEN HRMS. All rights reserved.
        </p>
    </div>
</body>
</html>
