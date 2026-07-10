<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

class PasswordPolicy
{
    /**
     * Shared complexity requirement for every password entry point in the app
     * (registration, admin-set, self-service reset, change-password) so the
     * bar doesn't silently drift between endpoints.
     */
    public static function rule(): Password
    {
        return Password::min(8)->mixedCase()->numbers();
    }
}
