
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useTranslation } from 'react-i18next';

export default function Login() {
    const { t, i18n } = useTranslation();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'km' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/login', { email, password });

            const { access_token, user } = response.data;

            if (access_token && user) {
                login(access_token, user);
                // Force a small delay to allow state to settle if needed, though not usually required
                setTimeout(() => navigate('/dashboard'), 100);
            } else {
                setError("Login failed. Missing token.");
            }

        } catch (err: any) {
            setError(err.response?.data?.message || t('login.invalid_credentials'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-background">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 w-full"
            >
                <div className="mx-auto w-full max-w-sm space-y-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-full flex justify-end mb-2">
                             <button onClick={toggleLanguage} className="bg-secondary/50 px-2 py-1 rounded text-sm hover:bg-secondary">
                                {i18n.language === 'en' ? '🇰🇭 ខ្មែរ' : '🇬🇧 EN'}
                             </button>
                        </div>
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
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {t('login.password')}
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={() => navigate('/forgot-password')} 
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        {t('login.forgot_password')}
                                    </button>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11"
                                />
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

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        {t('login.no_account')}{' '}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">
                            {t('login.contact_admin')}
                        </a>
                    </p>
                </div>
            </motion.div>


        </div>
    );
}
