import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, CalendarCheck, Settings, LogOut,
    FileText, CheckSquare, FileBarChart, Wallet, Clock,
    Building2, UserCog, ChevronRight, ChevronDown, ScrollText,
    Package, ShieldCheck, FileSignature
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

function CollapsibleSection({ label, children, defaultExpanded = true }: { label: string; children: React.ReactNode; defaultExpanded?: boolean }) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className="mb-2">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between mt-3 mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-blue-200/60 hover:text-white transition-colors cursor-pointer group"
            >
                <span>{label}</span>
                {expanded ? (
                    <ChevronDown className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-all" />
                ) : (
                    <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-all" />
                )}
            </button>
            <div className={`grid gap-0.5 overflow-hidden transition-all ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                {children}
            </div>
        </div>
    );
}

export function Sidebar() {
    const { logout, user, hasPermission } = useAuth();
    const { t } = useTranslation();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'Super Admin');

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

            <div className="flex-1 py-3 overflow-y-auto no-scrollbar">
                <nav className="flex flex-col px-3">

                    {/* ── MAIN ── */}
                    <CollapsibleSection label={t('nav.section_main')}>
                        <NavItem to="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
                    </CollapsibleSection>

                    {/* ══════════════════════════════════════ */}
                    {/* HR OPERATIONS                        */}
                    {/* ══════════════════════════════════════ */}

                    {/* ── USER MANAGEMENT ── */}
                    {(isSuperAdmin || hasPermission('employees.view') || hasPermission('roles.view')) && (
                        <CollapsibleSection label="User Management">
                            {(isSuperAdmin || hasPermission('employees.view')) && (
                                <NavItem to="/employees" icon={Users} label={t('nav.employees')} />
                            )}
                            {(isSuperAdmin || hasPermission('roles.view')) && (
                                <>
                                    <NavItem to="/roles" icon={ShieldCheck} label="Roles & Permissions" />

                                </>
                            )}
                        </CollapsibleSection>
                    )}

                    {/* ── ORGANIZATION ── */}
                    {(isSuperAdmin || hasPermission('departments.view') || hasPermission('contracts.view') || hasPermission('assets.view') || hasPermission('holidays.view')) && (
                        <CollapsibleSection label={t('nav.section_org')}>
                            {(isSuperAdmin || hasPermission('departments.view')) && (
                                <NavItem to="/departments" icon={Building2} label={t('nav.departments', 'Departments')} />
                            )}
                            {(isSuperAdmin || hasPermission('contracts.view')) && (
                                <NavItem to="/lifecycle?tab=contracts" icon={FileSignature} label={t('nav.contract', 'Contract')} />
                            )}
                            {(isSuperAdmin || hasPermission('assets.view')) && (
                                <NavItem to="/assets" icon={Package} label={t('nav.assets', 'Assets')} />
                            )}
                            {(isSuperAdmin || hasPermission('holidays.view')) && (
                                <NavItem to="/holidays" icon={CalendarCheck} label={t('nav.holidays')} />
                            )}
                        </CollapsibleSection>
                    )}

                    {/* ── OPERATIONS ── */}
                    {(isSuperAdmin || hasPermission('attendance.view') || hasPermission('leaves.view') || hasPermission('overtime.view') || hasPermission('documents.view') || hasPermission('tasks.view')) && (
                        <CollapsibleSection label={t('nav.section_ops')}>
                            {(isSuperAdmin || hasPermission('attendance.view')) && (
                                <NavItem to="/attendance" icon={CalendarCheck} label={t('nav.attendance')} />
                            )}
                            {(isSuperAdmin || hasPermission('leaves.view')) && (
                                <NavItem to="/leaves" icon={Clock} label={t('nav.leaves')} />
                            )}
                            {(isSuperAdmin || hasPermission('overtime.view')) && (
                                <NavItem to="/overtime" icon={Clock} label={t('nav.overtime')} />
                            )}
                            {(isSuperAdmin || hasPermission('documents.view')) && (
                                <NavItem to="/documents" icon={FileText} label={t('nav.documents')} />
                            )}
                            {(isSuperAdmin || hasPermission('tasks.view')) && (
                                <NavItem to="/tasks" icon={CheckSquare} label={t('nav.tasks')} />
                            )}
                        </CollapsibleSection>
                    )}

                    {/* ── FINANCE ── */}
                    {(isSuperAdmin || hasPermission('payroll.view')) && (
                        <CollapsibleSection label={t('nav.section_finance')}>
                            <NavItem to="/payroll" icon={Wallet} label={isSuperAdmin ? t('nav.payroll_auth') : t('nav.payroll_requests')} />
                        </CollapsibleSection>
                    )}

                    {/* ── REPORTS ── */}
                    {(isSuperAdmin || hasPermission('reports.view')) && (
                        <CollapsibleSection label={t('nav.section_reports')}>
                            <NavItem to="/reports" icon={FileBarChart} label={t('nav.reports')} />
                        </CollapsibleSection>
                    )}

                    {/* ══════════════════════════════════════ */}
                    {/* SUPER ADMIN — System Controls          */}
                    {/* ══════════════════════════════════════ */}
                    {isSuperAdmin && (
                        <CollapsibleSection label={t('nav.section_system')}>
                            <NavItem to="/admins" icon={Users} label={t('nav.admins')} highlight />
                            <NavItem to="/settings/shifts" icon={CalendarCheck} label={t('nav.shift_management')} highlight />
                            <NavItem to="/settings" icon={Settings} label={t('nav.settings')} highlight />
                            <NavItem to="/audit-logs" icon={ScrollText} label={t('nav.audit_logs')} highlight />
                        </CollapsibleSection>
                    )}

                </nav>
            </div>

            {/* User footer */}
            <div className="p-4 border-t border-white/10 bg-black/10">
                <NavLink
                    to="/profile"
                    className={({ isActive }) => cn(
                        "flex items-center gap-3 mb-3 px-2 py-2 rounded-lg transition-all cursor-pointer group",
                        isActive ? "bg-white/20" : "hover:bg-white/10"
                    )}
                >
                    <div className="h-8 w-8 rounded-full bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-white font-bold text-sm group-hover:ring-2 group-hover:ring-white/40 transition-all">
                        {user?.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                        <p className="text-xs text-blue-200/70 truncate">{user?.email}</p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
                </NavLink>
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
