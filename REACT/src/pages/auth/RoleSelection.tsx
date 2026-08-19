import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';

export default function RoleSelection() {
    const { user, switchRoleContext } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<number | null>(null);

    // If the user doesn't have roles, or is not logged in, redirect to login
    useEffect(() => {
        if (!user || !user.roles || user.roles.length === 0) {
            navigate('/login');
        }
    }, [user, navigate]);

    if (!user || !user.roles || user.roles.length === 0) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-red-50 text-red-600 flex-col gap-4">
                <Shield className="h-12 w-12" />
                <h2 className="text-xl font-bold">No Roles Found</h2>
                <p>Redirecting to login...</p>
                <pre className="text-xs bg-white p-4 rounded border mt-4 text-left max-w-lg overflow-auto">
                    {JSON.stringify(user, null, 2)}
                </pre>
            </div>
        );
    }

    const handleSelectRole = async (roleId: number) => {
        setLoading(roleId);
        try {
            const response = await api.post('/switch-role', { role_id: roleId });
            
            // The backend returns permissions and the active role
            const { permissions, active_role } = response.data;
            
            // Update auth context
            switchRoleContext(permissions, active_role);
            
            toast.success('Role selected successfully');
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Failed to select role', error);
            toast.error(error.response?.data?.message || 'Failed to select role. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-100 py-12">
            {/* Ambient background glows */}
            <div className="pointer-events-none absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-300/30 blur-3xl" />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="relative flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 w-full max-w-2xl"
            >
                <div className="mx-auto w-full space-y-8 bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/60 p-10 sm:p-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4 h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                            Select Your Role
                        </h2>
                        <p className="mt-3 text-base text-slate-600">
                            Hi {user.name}, you have multiple roles assigned to you. <br />
                            Please select the role you want to use for this session.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                        {user.roles.map((role: any) => (
                            <Button
                                key={role.id}
                                variant="outline"
                                className="h-auto p-6 flex flex-col items-center justify-center gap-3 border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 shadow-sm"
                                disabled={loading !== null}
                                onClick={() => handleSelectRole(role.id)}
                            >
                                {role.is_super_admin ? (
                                    <Shield className="h-8 w-8 text-indigo-600 mb-1" />
                                ) : (
                                    <User className="h-8 w-8 text-blue-500 mb-1" />
                                )}
                                <div className="text-center">
                                    <div className="font-semibold text-lg text-slate-800">{role.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {role.is_super_admin ? 'Full System Access' : 'Standard Access'}
                                    </div>
                                </div>
                                {loading === role.id && (
                                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-md">
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </Button>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
