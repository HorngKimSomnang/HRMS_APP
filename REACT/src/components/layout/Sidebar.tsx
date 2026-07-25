import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, CalendarCheck, Settings, LogOut,
    FileText, CheckSquare, FileBarChart, Wallet, Clock,
    Building2, ShieldCheck, UserCog, ChevronRight, ScrollText,
    Package, Database
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
                        ? "text-white bg-white/20 font-semibold shadow-sm"
                        : "text-blue-100/80 hover:text-white hover:bg-white/10"
                    : isActive
                        ? "text-white bg-white/20 font-semibold shadow-sm"
                        : "text-blue-100/80 hover:text-white hover:bg-white/10"
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </NavLink>
    );
}

function SectionLabel({ label }: { label: string }) {
    return <div className="mt-5 mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-blue-200/60">{label}</div>;
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
        <div className="flex h-full w-64 flex-col bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 text-blue-50 print:hidden">
            {/* Logo Area */}
            <div className="flex h-20 items-center px-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white font-bold overflow-hidden shadow-md ring-1 ring-white/20">
                        {logoUrl ? <img src={logoUrl} className="h-full w-full object-cover" alt="Logo" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white leading-tight">HEN CHEN</span>
                        <span className="text-[10px] text-blue-200/80 font-medium">INVESTMENT CO.,LTD</span>
                    </div>
                </div>
            </div>

            {/* Role Badge */}
            <div className="px-4 py-3 border-b border-white/10">
                <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold",
                    isSuperAdmin
                        ? "bg-white/15 text-white border border-white/25"
                        : "bg-white/10 text-white border border-white/20"
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
                            <NavItem to="/lifecycle" icon={UserCog} label={t('nav.lifecycle', 'Lifecycle')} />
                            <NavItem to="/assets" icon={Package} label={t('nav.assets', 'Assets')} />
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
                            <NavItem to="/entities" icon={Database} label={t('nav.entities', 'Custom Entities')} />
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
            <div className="p-4 border-t border-white/10 bg-black/10">
                <div className="flex items-center gap-3 mb-3 px-2">
                    <div className="h-8 w-8 rounded-full bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-white font-bold text-sm">
                        {user?.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                        <p className="text-xs text-blue-200/70 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-100/80 transition-all hover:bg-red-500/30 hover:text-white"
                >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                </button>
            </div>
        </div>
    );
}
