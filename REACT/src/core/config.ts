/**
 * Central configuration for the React application.
 */
const CONFIG = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
    SERVER_URL: import.meta.env.VITE_SERVER_URL || 'http://localhost:8000',
};

/**
 * Returns the full URL for a storage path.
 * Usage: getStorageUrl(task.attachment_path)
 */
export const getStorageUrl = (path: string | null) => {
    if (!path) return '';
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    // Route through the new API endpoint to bypass PHP 403 bugs on Windows for MP4s
    return `${CONFIG.API_BASE_URL}/file/${cleanPath}`;
};

/**
 * Returns the full URL to force download a storage path.
 */
export const getDownloadUrl = (path: string | null) => {
    if (!path) return '';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${CONFIG.API_BASE_URL}/download/${cleanPath}`;
};
