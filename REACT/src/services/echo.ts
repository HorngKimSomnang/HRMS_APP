import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally (required by laravel-echo)
(window as any).Pusher = Pusher;

let echoInstance: Echo<any> | null = null;

export function getEcho(): Echo<any> {
    if (!echoInstance) {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
            wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
            wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
            enabledTransports: ['ws', 'wss'],
            // Authenticate private channels via our Sanctum-protected API
            authEndpoint: `${import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8000'}/api/broadcasting/auth`,
            auth: {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
                },
            },
        });
    }
    return echoInstance;
}

/**
 * Update the auth token used for private channel authentication.
 * Call this on login/logout.
 */
export function updateEchoToken(token: string | null): void {
    const echo = echoInstance;
    if (!echo) return;
    if (token) {
        (echo.connector as any).options.auth.headers.Authorization = `Bearer ${token}`;
    }
}

/**
 * Disconnect and destroy the Echo instance (call on logout).
 */
export function disconnectEcho(): void {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
}
