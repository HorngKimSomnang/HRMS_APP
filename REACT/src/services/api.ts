import axios from 'axios';
import { announceDataChange } from './liveData';
import {
    createCachedAdapter,
    invalidateApiCache,
    invalidateApiCacheForUrl,
} from './apiCache';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

api.defaults.adapter = createCachedAdapter(axios.getAdapter(axios.defaults.adapter));

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 / 403
api.interceptors.response.use(
    (response) => {
        const method = response.config.method?.toLowerCase();
        if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
            invalidateApiCacheForUrl(response.config.url);
            announceDataChange({
                method,
                url: response.config.url,
            });
        }

        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            invalidateApiCache();
            if (window.location.pathname !== '/login') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        } else if (error.response?.status === 403) {
            const code = error.response?.data?.code;

            if (code === 'NO_ACTIVE_ROLE') {
                // Role was revoked mid-session. Fire a custom event so AuthContext
                // can react (re-fetch user, redirect to /select-role or logout)
                // without needing hooks inside this service module.
                window.dispatchEvent(new CustomEvent('auth:no-active-role'));
            } else {
                import('sonner').then(({ toast }) => {
                    toast.error('Your permissions changed. Please refresh the page.', {
                        duration: 5000,
                    });
                });
            }
        }
        return Promise.reject(error);
    }
);

export default api;
