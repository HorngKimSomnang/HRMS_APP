<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>HRMS Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="{{ $message->embed(public_path('logo.png')) }}" alt="HEN CHEN Logo" style="max-width: 120px; height: auto;">
        </div>
        <h2 style="color: #333333; text-align: center; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            Hello,
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password for your HRMS account. Your One-Time Password (OTP) is:
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #000000; letter-spacing: 5px; padding: 10px 20px; background-color: #f0f0f0; border-radius: 4px;">
                {{ $otp }}
            </span>
        </div>
        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            This code is valid for <strong>15 minutes</strong>. Please do not share this code with anyone.
        </p>
        <p style="color: #555555; font-size: 14px; line-height: 1.5; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 20px;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
        <p style="color: #999999; font-size: 12px; text-align: center; margin-top: 20px;">
            &copy; {{ date('Y') }} HEN CHEN HRMS. All rights reserved.
        </p>
    </div>
</body>
</html>
