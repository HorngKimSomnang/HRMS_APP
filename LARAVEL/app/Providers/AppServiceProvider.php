<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Data safety: block destructive artisan commands (migrate:fresh,
        // migrate:refresh, migrate:reset, db:wipe) unless explicitly allowed
        // via ALLOW_DESTRUCTIVE_DB=true in .env. See DATA_SAFETY.md.
        DB::prohibitDestructiveCommands(! config('database.allow_destructive', false));

        // Implicitly grant "Super Admin" role all permissions
        // This works in the app by using gate-related functions like auth()->user->can() and @can()
        Gate::before(function ($user, $ability) {
            return $user->hasRole('Super Admin') ? true : null;
        });

        // General baseline for every authenticated/API request (per-user when
        // logged in via Sanctum, per-IP otherwise). Applied to the whole `api`
        // middleware group via bootstrap/app.php's throttleApi().
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Login/registration: keyed on email+IP (stops targeted credential
        // stuffing on one account) AND on IP alone (stops spraying many
        // emails from one source) — deliberately stricter than the general
        // API limiter since these are unauthenticated, publicly-reachable.
        RateLimiter::for('login', function (Request $request) {
            $key = Str::lower((string) $request->input('email')).'|'.$request->ip();
            return [
                Limit::perMinute(5)->by($key),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        // Password-reset OTP: the OTP itself is only a 6-digit code, so this
        // limiter is the actual defense against brute-forcing it, on both
        // the request-OTP and verify-OTP endpoints.
        RateLimiter::for('otp', function (Request $request) {
            $key = Str::lower((string) $request->input('email')).'|'.$request->ip();
            return [
                Limit::perMinute(3)->by($key),
                Limit::perMinute(15)->by($request->ip()),
            ];
        });
    }
}
