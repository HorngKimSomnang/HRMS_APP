/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/api';

interface User {
    id: number;
    name: string;
    email: string;
    roles?: { id: number, name: string, is_super_admin?: boolean }[];
    active_role?: { id: number, name: string, is_super_admin?: boolean } | null;
    permissions?: any[];
    direct_permissions?: any[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User, requiresRoleSelection?: boolean) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    switchRoleContext: (permissions: any[], activeRole: any) => void;
    hasPermission: (permission: string) => boolean;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // ── STEP 1: Instantly restore from cache (no server round-trip needed) ──
    const [user, setUser] = useState<User | null>(() => {
        const cached = localStorage.getItem('user');
        if (cached) {
            try { return JSON.parse(cached); } catch { /* ignore */ }
        }
        return null;
    });
    
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    
    // Start as NOT loading if we already have a cached session
    const [loading, setLoading] = useState(!localStorage.getItem('token'));

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            setLoading(false);
            return;
        }

        // ── STEP 2: Silently re-validate token in background ──
        // We're already showing the app from the cache. This just refreshes user data.
        const verifyToken = async () => {
            try {
                const response = await api.get('/user');
                // Correctly extract the user object from the response (it is nested under data.user)
                const fetchedUser = response.data.user || response.data;

                // Refresh user data with latest from server
                const fullUser = {
                    ...fetchedUser,
                    permissions: response.data.permissions || fetchedUser.permissions || [],
                    direct_permissions: response.data.direct_permissions || fetchedUser.direct_permissions || []
                };
                setUser(fullUser);
                localStorage.setItem('user', JSON.stringify(fullUser));
            } catch (error: any) {
                // Only log out on a definitive 401 (invalid/revoked token).
                // Ignore network errors, server restarts, 500s, etc.
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                }
                // For all other errors: keep the cached session alive.
            } finally {
                setLoading(false);
            }
        };

        // Small delay to let the server finish starting up before we verify
        const timer = setTimeout(verifyToken, 1500);
        return () => clearTimeout(timer);
    }, []);

    const login = (newToken: string, newUser: User, requiresRoleSelection: boolean = false) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        // We no longer call window.location.href here, as PublicRoute and PrivateRoute handle the SPA redirects seamlessly!
    };

    const logout = async () => {
        if (token) {
            try {
                await api.post('/logout');
            } catch (e) {
                console.error("Logout API failed", e);
            }
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // The PrivateRoute will seamlessly redirect to /login
    };

    const switchRoleContext = (permissions: any[], activeRole: any) => {
        if (!user) return;
        const updatedUser = { ...user, permissions, active_role: activeRole };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        
        // If they don't have an active role, they fail closed
        if (!user.active_role) return false;

        // Check super admin on the ACTIVE role, not any owned role
        if (user.active_role.is_super_admin || user.active_role.name === 'Super Admin') return true;

        const perms = (user as any).permissions || (user as any).direct_permissions || [];
        return perms.some((p: any) => {
            const pName = typeof p === 'string' ? p : p.name;
            return pName === permission;
        });
    };

    const updateUser = (newUser: User) => {
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateUser, switchRoleContext, hasPermission, isAuthenticated: !!token && !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
