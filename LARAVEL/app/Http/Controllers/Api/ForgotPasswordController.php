<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\PasswordPolicy;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpMail;

class ForgotPasswordController extends Controller
{
    /**
     * Send OTP via Email to the user for password reset.
     */
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Generate a 6-digit OTP
        $otp = sprintf("%06d", mt_rand(100000, 999999));

        // Save to password_reset_tokens table
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => Hash::make($otp),
                'created_at' => now()
            ]
        );

        if (config('app.env') === 'local') {
            Log::info("LOCAL DEV - OTP for {$request->email}: {$otp}");
        }

        // Send OTP via Email
        try {
            Mail::to($request->email)->send(new OtpMail($otp));
            $deliveryMethod = 'email';
        } catch (\Exception $e) {
            Log::error("Failed to send OTP email to {$request->email}: " . $e->getMessage());
            // Fallback for dev environment without Mail setup: log the OTP to the
            // server log file (never the HTTP response — an API response is
            // readable by anyone who can hit this endpoint, a log file isn't).
            Log::info("OTP for {$request->email} (mail delivery failed): {$otp}");
            $deliveryMethod = 'log';
        }

        // Mask the email for the response (e.g., s***@gmail.com)
        $maskedEmail = $this->maskEmail($request->email);

        return response()->json([
            'message' => "OTP sent to {$maskedEmail}",
            'masked_email' => $maskedEmail,
            'delivery_method' => $deliveryMethod,
        ]);
    }

    /**
     * Reset password using OTP
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6',
            'password' => ['required', 'string', 'confirmed', PasswordPolicy::rule()],
        ]);

        $resetRecord = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$resetRecord || !Hash::check($request->otp, $resetRecord->token)) {
            return response()->json(['message' => 'Invalid or expired OTP.'], 400);
        }

        // Check expiration (15 minutes)
        if (now()->diffInMinutes($resetRecord->created_at) > 15) {
            return response()->json(['message' => 'OTP has expired.'], 400);
        }

        $user = User::where('email', $request->email)->first();
        $user->password = Hash::make($request->password);
        $user->save();

        // Delete the token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        AuditLogger::logAuth($request, 'PASSWORD_RESET', $user);

        return response()->json(['message' => 'Password reset successfully. You can now login.']);
    }

    /**
     * Mask email address for privacy (e.g., s****@gmail.com)
     */
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) return $email;

        $name = $parts[0];
        $domain = $parts[1];

        $len = strlen($name);
        if ($len <= 2) {
            $maskedName = substr($name, 0, 1) . '***';
        } else {
            $maskedName = substr($name, 0, 1) . str_repeat('*', $len - 2) . substr($name, -1);
        }

        return $maskedName . '@' . $domain;
    }
}
