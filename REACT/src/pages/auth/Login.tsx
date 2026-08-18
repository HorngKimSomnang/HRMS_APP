
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function Login() {
    const { t } = useTranslation();
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialError = queryParams.get('reason') === 'session_expired' ? 'Your access has been updated. Please log in again.' : '';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(initialError);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/login', { email, password });

            const { access_token, user, permissions, direct_permissions } = response.data;

            if (access_token && user) {
                const hasSuperAdmin = user.roles?.some((r: any) => r.name === 'Super Admin');
                
                // Permissions can come from the root response or the user object depending on the endpoint
                const userPerms = permissions || user.permissions || [];
                const userDirectPerms = direct_permissions || user.direct_permissions || [];
                
                const hasPermissions = userPerms.length > 0 || userDirectPerms.length > 0;
                const hasMultipleRoles = user.roles && user.roles.length > 1;
                if (!hasSuperAdmin && !hasPermissions && !hasMultipleRoles) {
                    setError('Unauthorized. This portal is only accessible to system managers and administrators.');
                    setLoading(false);
                    return;
                }

                login(access_token, {
                    ...user,
                    permissions: userPerms,
                    direct_permissions: userDirectPerms
                });
                
                toast.success('Logged in successfully');
                navigate('/dashboard');
            }
        } catch (error: any) {
            console.error('Login error', error);
            setError(error.response?.data?.message || 'Invalid email or password');
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-100 py-12">
            {/* Ambient background glows */}
            <div className="pointer-events-none absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 w-full"
            >
                <div className="mx-auto w-full max-w-lg space-y-8 bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/60 p-12 sm:p-14">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6">
                            <img src="/logo.png" alt="HEN CHEN Logo" className="h-20 w-20 object-contain mx-auto drop-shadow-md" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">
                            {t('login.welcome')}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t('login.subtitle')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {t('login.email')}
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {t('login.password')}
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <div className="flex justify-start pt-1">
                                    <button 
                                        type="button" 
                                        onClick={() => navigate('/forgot-password')} 
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        {t('login.forgot_password')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-sm text-red-500 bg-red-50 p-3 rounded-md border border-red-200"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button type="submit" className="w-full h-11 text-base shadow-sm" disabled={loading}>
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ...
                                </div>
                            ) : t('login.sign_in')}
                        </Button>
                    </form>
                </div>
            </motion.div>


        </div>
    );
}
