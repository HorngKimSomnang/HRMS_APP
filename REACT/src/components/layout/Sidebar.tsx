import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, CalendarCheck, Settings, LogOut,
    FileText, CheckSquare, FileBarChart, Wallet, Clock,
    Building2, ShieldCheck, UserCog, ChevronRight, ScrollText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';

function NavItem({ to, icon: Icon, label, highlight = false }: { to: string; icon: any; label: string; highlight?: boolean }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                highlight
                    ? isActive
                        ? "text-violet-700 bg-violet-50 font-semibold"
                        : "text-slate-600 hover:text-violet-700 hover:bg-violet-50"
                    : isActive
                        ? "text-primary bg-primary/10 font-semibold"
                        : "text-muted-foreground hover:text-primary hover:bg-muted/50"
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </NavLink>
    );
}

function SectionLabel({ label }: { label: string }) {
    return <div className="mt-5 mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</div>;
}

export function Sidebar() {
    const { logout, user } = useAuth();
    const { t } = useTranslation();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    const isSuperAdmin = user?.roles?.some(role => role.name === 'Super Admin');
    const isAdmin = user?.roles?.some(role => role.name === 'Admin');

    useEffect(() => {
        api.get('/settings').then(res => {
            if (res.data.data?.company_logo) {
                setLogoUrl(`${api.defaults.baseURL?.replace('/api', '')}/storage/${res.data.data.company_logo}`);
            }
        }).catch(() => {});
    }, []);

    return (
        <div className="flex h-full min-h-screen w-64 flex-col border-r bg-slate-50/40 text-slate-700">
            {/* Logo Area */}
            <div className="flex h-20 items-center px-6 border-b bg-gradient-to-r from-slate-50 to-blue-50/30">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold overflow-hidden shadow-md">
                        {logoUrl ? <img src={logoUrl} className="h-full w-full object-cover" alt="Logo" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary leading-tight">HEN CHEN</span>
                        <span className="text-[10px] text-slate-400 font-medium">INVESTMENT CO.,LTD</span>
                    </div>
                </div>
            </div>

            {/* Role Badge */}
            <div className="px-4 py-3 border-b bg-slate-50/50">
                <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold",
                    isSuperAdmin
                        ? "bg-violet-100 text-violet-700 border border-violet-200"
                        : "bg-blue-100 text-blue-700 border border-blue-200"
                )}>
                    {isSuperAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserCog className="h-3.5 w-3.5" />}
                    <div>
                        <div>{isSuperAdmin ? 'Super Admin' : 'Admin'}</div>
                        <div className="font-normal opacity-70 text-[10px]">{isSuperAdmin ? 'CEO · Full Access' : 'HR Manager · Operations'}</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 py-3 overflow-y-auto">
                <nav className="grid gap-0.5 px-3">

                    {/* ── MAIN ── */}
                    <SectionLabel label={t('nav.section_main')} />
                    <NavItem to="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
                    <NavItem to="/notices" icon={FileText} label={t('nav.notice_board')} />

                    {/* ══════════════════════════════════════ */}
                    {/* HR OPERATIONS (Admin & Super Admin)    */}
                    {/* ══════════════════════════════════════ */}
                    {(isAdmin || isSuperAdmin) && (
                        <>
                            <SectionLabel label={t('nav.section_org')} />
                            <NavItem to="/employees" icon={Users} label={t('nav.employees')} />
                            <NavItem to="/holidays" icon={CalendarCheck} label={t('nav.holidays')} />

                            <SectionLabel label={t('nav.section_ops')} />
                            <NavItem to="/attendance" icon={CalendarCheck} label={t('nav.attendance')} />
                            <NavItem to="/leaves" icon={Clock} label={t('nav.leaves')} />
                            <NavItem to="/overtime" icon={Clock} label={t('nav.overtime')} />
                            <NavItem to="/documents" icon={FileText} label={t('nav.documents')} />
                            <NavItem to="/tasks" icon={CheckSquare} label={t('nav.tasks')} />

                            <SectionLabel label={t('nav.section_finance')} />
                            <NavItem to="/payroll" icon={Wallet} label={isSuperAdmin ? t('nav.payroll_auth') : t('nav.payroll_requests')} />

                            <SectionLabel label={t('nav.section_reports')} />
                            <NavItem to="/reports" icon={FileBarChart} label={t('nav.reports')} />
                        </>
                    )}

                    {/* ══════════════════════════════════════ */}
                    {/* SUPER ADMIN — System Controls          */}
                    {/* ══════════════════════════════════════ */}
                    {isSuperAdmin && (
                        <>
                            <SectionLabel label={t('nav.section_system')} />
                            <NavItem to="/admins" icon={Users} label={t('nav.admins')} highlight />
                            <NavItem to="/settings/shifts" icon={CalendarCheck} label={t('nav.shift_management')} highlight />
                            <NavItem to="/settings" icon={Settings} label={t('nav.settings')} highlight />
                            <NavItem to="/audit-logs" icon={ScrollText} label={t('nav.audit_logs')} highlight />
                        </>
                    )}

                </nav>
            </div>

            {/* User footer */}
            <div className="p-4 border-t bg-slate-100/50">
                <div className="flex items-center gap-3 mb-3 px-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {user?.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
                >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                </button>
            </div>
        </div>
    );
}
