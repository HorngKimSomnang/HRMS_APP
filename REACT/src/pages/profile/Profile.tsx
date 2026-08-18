import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, ShieldCheck, BadgeCheck } from "lucide-react";
import api from "@/services/api";

export default function Profile() {
    const { user } = useAuth();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/user');
                // The /user endpoint returns { user: { ..., employee: { ..., department: {} }, department: {} } }
                const userData = res.data.user ?? res.data;
                if (userData?.employee) {
                    setEmployee(userData.employee);
                } else if (user?.email) {
                    const empRes = await api.get('/employees?email=' + user.email);
                    if (empRes.data.data && empRes.data.data.length > 0) {
                        setEmployee(empRes.data.data[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    if (loading) return (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground animate-pulse">
            Loading profile...
        </div>
    );

    // Primary department: user.department (from users.department_id) → employee.department fallback
    const department = (user as any)?.department?.name
        ?? employee?.department?.name
        ?? null;

    const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';

    return (
        <div className="space-y-6">
            {/* ── Hero Cover ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-xl">
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* Avatar */}
                    <div className="h-20 w-20 rounded-2xl bg-white/20 ring-4 ring-white/30 flex items-center justify-center text-white text-3xl font-bold shadow-lg shrink-0 backdrop-blur-sm">
                        {initials}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold font-poppins leading-tight">{user?.name}</h1>
                        <p className="text-blue-100 text-sm mt-0.5 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> {user?.email}
                        </p>
                        {department && (
                            <p className="text-blue-100/80 text-xs mt-1 flex items-center gap-1.5">
                                <Briefcase className="h-3 w-3" /> {department}
                            </p>
                        )}
                        {/* Role badges */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {user?.roles?.map((r: any) => (
                                <span key={r.name} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full font-medium ring-1 ring-white/30">
                                    <ShieldCheck className="h-3 w-3" /> {r.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-24 -mb-8 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            </div>

            {/* ── Employee Details ── */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/40 via-card to-card shadow-sm p-6">
                <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-blue-500" /> Employee Details
                </h3>
                {employee ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
                        <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Employee ID</span>
                            <span className="font-medium flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-blue-400" /> {employee.employee_code ?? '—'}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Email</span>
                            <span className="font-medium flex items-center gap-1.5 truncate">
                                <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                <span className="truncate">{user?.email ?? '—'}</span>
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Phone</span>
                            <span className="font-medium flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-blue-400" /> {employee.phone ?? '—'}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Department</span>
                            <span className="font-medium flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5 text-blue-400" /> {department ?? '—'}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Joined</span>
                            <span className="font-medium flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-blue-400" /> {employee.joining_date ?? '—'}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Address</span>
                            <span className="font-medium flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                <span className="truncate">{employee.address ?? '—'}</span>
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg text-sm">
                        <User className="h-4 w-4 shrink-0" />
                        No linked employee profile found. You are signed in as a System User.
                    </div>
                )}
            </div>
        </div>
    );
}
