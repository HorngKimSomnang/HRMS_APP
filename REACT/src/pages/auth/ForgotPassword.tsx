import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LucideArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await api.post('/forgot-password', { email });
            setSuccess(response.data.message);
            setMaskedEmail(response.data.masked_email || '');
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send reset link.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (password !== passwordConfirmation) {
            setError('Passwords do not match.');
            return;
        }
        
        setLoading(true);

        try {
            const response = await api.post('/reset-password', { 
                email, 
                otp, 
                password,
                password_confirmation: passwordConfirmation 
            });
            setSuccess(response.data.message);
            setStep(3);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-100">
            {/* Soft decorative glow — purely visual, no layout impact */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 w-full"
            >
                <div className="mx-auto w-full max-w-lg space-y-8 bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/60 p-12 sm:p-14">
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
                    >
                        <LucideArrowLeft className="w-4 h-4 mr-2" /> {t('forgot_password.back_to_login')}
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6">
                            <img src="/logo.png" alt="HEN CHEN Logo" className="h-20 w-20 object-contain mx-auto drop-shadow-md" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">
                            {step === 1 && t('forgot_password.title')}
                            {step === 2 && t('forgot_password.verify_otp')}
                            {step === 3 && t('forgot_password.reset_password')}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {step === 1 && "Enter your email address to receive a 6-digit reset code via email."}
                            {step === 2 && `We sent a 6-digit code via email to ${maskedEmail || 'your email'}.`}
                            {step === 3 && "You can now log in with your new password."}
                        </p>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-red-500 bg-red-50 p-3 rounded-md border border-red-200">
                                {error}
                            </motion.div>
                        )}
                        {success && step !== 3 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" placeholder={t('forgot_password.email_placeholder')} />
                            </div>
                            <Button type="submit" className="w-full h-11" disabled={loading}>
                                {loading ? "Sending..." : t('forgot_password.send_otp')}
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyAndReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">6-Digit Code</label>
                                <Input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} className="h-11 tracking-widest text-center text-lg" placeholder={t('forgot_password.otp_placeholder')} maxLength={6} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('forgot_password.new_password')}</label>
                                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('forgot_password.confirm_password')}</label>
                                <Input type="password" required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} className="h-11" />
                            </div>
                            <Button type="submit" className="w-full h-11" disabled={loading}>
                                {loading ? "Resetting..." : t('forgot_password.reset_password')}
                            </Button>
                        </form>
                    )}

                    {step === 3 && (
                        <Button onClick={() => navigate('/login')} className="w-full h-11">
                            Go to Login
                        </Button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
