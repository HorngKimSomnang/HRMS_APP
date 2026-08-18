import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import api from "@/services/api";
import { Users, Activity, DollarSign, Clock, CheckCircle, DoorOpen, Package, ChevronRight, AlertTriangle } from "lucide-react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import NoticeBoard from "@/pages/admin/NoticeBoard";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const DashboardCard = ({ canLink, to, baseClass, hoverClass, children }: any) => {
    if (canLink) {
        return <Link to={to} className={`${baseClass} ${hoverClass}`}>{children}</Link>;
    }
    return <div className={baseClass}>{children}</div>;
};

export default function DashboardMain() {
    const { user, hasPermission } = useAuth();
    const isSuperAdmin = user?.roles?.some((r: any) => r.is_super_admin) ?? false;
    const hasDashboardPermission = isSuperAdmin || (user?.permissions || []).some((p: any) => {
        const name = typeof p === 'string' ? p : p?.name;
        return name && name.startsWith('dashboard.');
    }) || ((user as any)?.direct_permissions || []).some((p: any) => {
        const name = typeof p === 'string' ? p : p?.name;
        return name && name.startsWith('dashboard.');
    });

    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [isCurrentMonth, setIsCurrentMonth] = useState(true);
    const [periodLabel, setPeriodLabel] = useState('');
    const [stats, setStats] = useState({
        total_employees: 0,
        period_payroll: 0,
        period_payroll_pending_count: 0,
        period_payroll_pending_amount: 0,
        prior_period_label: '',
        prior_period_payroll: 0,
        prior_period_payroll_pending_count: 0,
        prior_period_payroll_pending_amount: 0,
        workforce_capacity: 0,
        pending_approvals: 0,
        pending_payrolls: 0,
        pending_leaves: 0,
        total_users: 0,
        total_admins: 0,
        expiring_contracts: 0,
        open_offboardings: 0,
        assigned_assets: 0
    });
    const [expiringList, setExpiringList] = useState<any[]>([]);
    const [offboardingList, setOffboardingList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const daysUntil = (dateStr: string) => {
        const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0);
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };
    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

    const fetchDashboard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/dashboard', { params: { month: selectedMonth, year: selectedYear } });
            if (res.data.stats) setStats(res.data.stats);
            if (res.data.period_label) setPeriodLabel(res.data.period_label);
            if (typeof res.data.is_current_month === 'boolean') setIsCurrentMonth(res.data.is_current_month);
            if (res.data.expiring_contracts_list) setExpiringList(res.data.expiring_contracts_list);
            if (res.data.open_offboardings_list) setOffboardingList(res.data.open_offboardings_list);
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    useLiveRefresh(() => fetchDashboard(true), { resources: 'dashboard', pollInterval: 10_000 });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center text-muted-foreground">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-8 text-white shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">{`${getGreeting()}, ${user?.name}! 👋`}</h1>
                    <p className="text-indigo-100 mt-2 text-sm font-medium">
                        {hasDashboardPermission 
                            ? "System overview — activity, workforce and finance at a glance." 
                            : (hasPermission('notice_board.view') ? "System notice board and announcements." : "")}
                    </p>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            </div>

            {hasDashboardPermission && (
                <>
                    {/* Month Picker */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                {MONTHS.map((m, i) => <option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={e => setSelectedYear(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select>
                            {!isCurrentMonth && (
                                <button
                                    onClick={() => {
                                        setSelectedMonth(String(new Date().getMonth() + 1).padStart(2, '0'));
                                        setSelectedYear(String(new Date().getFullYear()));
                                    }}
                                    className="text-xs font-medium text-blue-600 hover:underline"
                                >
                                    Back to this month
                                </button>
                            )}
                        </div>
                        {periodLabel && <span className="text-xs text-muted-foreground">Showing figures for <span className="font-semibold text-slate-600">{periodLabel}</span></span>}
                    </div>

                    {/* Top Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-4">
                        {hasPermission('dashboard.view_total_employees') && (
                            <DashboardCard 
                                canLink={hasPermission('employees.view')} 
                                to="/employees" 
                                baseClass="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-card to-card p-4 px-5 shadow-sm"
                                hoverClass="group transition-shadow hover:shadow-md hover:border-blue-200 cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                                        <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total_employees}</h3>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                        <Users className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground">{isCurrentMonth ? 'Employed as of today' : `Employed as of ${periodLabel}`}</span>
                                    {hasPermission('employees.view') && <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
                                </div>
                            </DashboardCard>
                        )}

                        {hasPermission('dashboard.view_payroll') && (
                            <DashboardCard
                                canLink={hasPermission('payroll.view')}
                                to={`/payroll?month=${selectedMonth}&year=${selectedYear}`}
                                baseClass="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-card to-card p-4 px-5 shadow-sm relative overflow-hidden"
                                hoverClass="group transition-shadow hover:shadow-md hover:border-emerald-200 cursor-pointer"
                            >
                                <div className="absolute -top-3 -right-3 p-4 opacity-5 pointer-events-none">
                                    <DollarSign className="h-20 w-20" />
                                </div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{isCurrentMonth ? "This Month's Payroll" : `${periodLabel} Payroll`}</p>
                                        <h3 className="text-2xl font-bold text-emerald-600 mt-1">${stats.period_payroll?.toFixed(2) || '0.00'}</h3>
                                    </div>
                                    <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                </div>
                                {stats.period_payroll_pending_count > 0 && (
                                    <div className="mt-3 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded relative z-10">
                                        +{stats.period_payroll_pending_count} not yet paid (${stats.period_payroll_pending_amount.toFixed(2)})
                                    </div>
                                )}
                            </DashboardCard>
                        )}

                        {hasPermission('dashboard.view_workforce_capacity') && (
                            <DashboardCard 
                                canLink={hasPermission('attendance.view')}
                                to="/attendance" 
                                baseClass="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-card to-card p-4 px-5 shadow-sm"
                                hoverClass="group transition-shadow hover:shadow-md hover:border-amber-200 cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Workforce Capacity</p>
                                        <h3 className="text-2xl font-bold text-foreground mt-1">{stats.workforce_capacity || 0}%</h3>
                                    </div>
                                    <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.workforce_capacity || 0}%` }}></div>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground">{isCurrentMonth ? "Today's attendance" : `Average daily attendance in ${periodLabel}`}</span>
                                    {hasPermission('attendance.view') && <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}
                                </div>
                            </DashboardCard>
                        )}

                        {hasPermission('dashboard.view_pending_approvals') && (
                            <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/70 via-card to-card p-4 px-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                                    <h3 className="text-2xl font-bold text-foreground mt-1">{stats.pending_approvals}</h3>
                                </div>
                                <div className="rounded-full bg-purple-100 p-2 text-purple-600">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-3 text-xs flex flex-col gap-1">
                                {stats.pending_approvals > 0 ? (
                                    <>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                            Action Required:
                                        </div>
                                        <div className="pl-3 text-slate-500 flex flex-col items-start gap-0.5">
                                            {stats.pending_payrolls > 0 && (
                                                hasPermission('payroll.view') ? (
                                                    <Link to={`/payroll?month=${selectedMonth}&year=${selectedYear}`} className="hover:text-primary hover:underline">
                                                        • {stats.pending_payrolls} {stats.pending_payrolls === 1 ? 'Payslip' : 'Payslips'}
                                                    </Link>
                                                ) : (
                                                    <span className="text-slate-500">
                                                        • {stats.pending_payrolls} {stats.pending_payrolls === 1 ? 'Payslip' : 'Payslips'}
                                                    </span>
                                                )
                                            )}
                                            {stats.pending_leaves > 0 && (
                                                hasPermission('leaves.view') ? (
                                                    <Link to="/leaves?status=pending" className="hover:text-primary hover:underline">
                                                        • {stats.pending_leaves} {stats.pending_leaves === 1 ? 'Leave' : 'Leaves'}
                                                    </Link>
                                                ) : (
                                                    <span className="text-slate-500">
                                                        • {stats.pending_leaves} {stats.pending_leaves === 1 ? 'Leave' : 'Leaves'}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <CheckCircle className="h-3 w-3 text-green-500"/> All caught up
                                    </div>
                                )}
                            </div>
                        </div>
                        )}
                    </div>

                    {/* HR Health Strip */}
                    <div className="grid gap-4 md:grid-cols-3">
                        {hasPermission('dashboard.view_expiring_contracts') && (
                            <Link to="/lifecycle?tab=contracts" className="group rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/70 via-card to-card p-5 shadow-sm transition-shadow hover:shadow-md hover:border-orange-200 block">
                                <h3 className="text-[15px] font-semibold mb-3 flex items-center gap-2 text-slate-800">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    Contracts expiring soon ({stats.expiring_contracts})
                                </h3>
                                {expiringList.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-2">Nothing expiring in the next 30 days.</p>
                                ) : expiringList.slice(0, 1).map((c: any) => (
                                    <div key={c.id} className="py-2 border-b last:border-0 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{c.employee ? `${c.employee.last_name} ${c.employee.first_name}` : '—'}</p>
                                            <p className="text-[11px] text-muted-foreground capitalize">{c.type?.replace('_',' ')} · {fmt(c.end_date)}</p>
                                        </div>
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${daysUntil(c.end_date) <= 7 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {daysUntil(c.end_date)} days
                                        </span>
                                    </div>
                                ))}
                                {expiringList.length > 1 && <p className="text-xs text-muted-foreground mt-2">+{expiringList.length - 1} more · <span className="text-orange-600 group-hover:underline">View all</span></p>}
                            </Link>
                        )}
                        {hasPermission('dashboard.view_open_offboardings') && (
                            <Link to="/lifecycle?tab=offboarding" className="group rounded-xl border border-red-100 bg-gradient-to-br from-red-50/70 via-card to-card p-5 shadow-sm transition-shadow hover:shadow-md hover:border-red-200 block">
                                <h3 className="text-[15px] font-semibold mb-3 flex items-center gap-2 text-slate-800">
                                    <DoorOpen className="h-4 w-4 text-red-500" />
                                    Active offboardings ({stats.open_offboardings})
                                </h3>
                                {offboardingList.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-2">Nothing here.</p>
                                ) : offboardingList.slice(0, 1).map((o: any) => (
                                    <div key={o.id} className="py-2 border-b last:border-0 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{o.employee ? `${o.employee.last_name} ${o.employee.first_name}` : '—'}</p>
                                            <p className="text-[11px] text-muted-foreground">Last day: {fmt(o.last_working_day)}</p>
                                        </div>
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${o.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : (o.status === 'deleted' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}`}>
                                            {o.status?.replace('_',' ')}
                                        </span>
                                    </div>
                                ))}
                                {offboardingList.length > 1 && <p className="text-xs text-muted-foreground mt-2">+{offboardingList.length - 1} more · <span className="text-red-600 group-hover:underline">View all</span></p>}
                            </Link>
                        )}
                        {hasPermission('dashboard.view_assets_in_use') && (
                            <Link to="/assets" className="group rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/50 via-card to-card p-5 shadow-sm transition-shadow hover:shadow-md hover:border-amber-200 block">
                                <h3 className="text-[15px] font-semibold mb-3 flex items-center gap-2 text-slate-800">
                                    <Package className="h-4 w-4 text-amber-500" />
                                    Assets In Use ({stats.assigned_assets})
                                </h3>
                                {stats.assigned_assets === 0 ? (
                                    <p className="text-sm text-muted-foreground py-2">Nothing here.</p>
                                ) : (
                                    <div className="py-2 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">Currently deployed</p>
                                            <p className="text-[11px] text-muted-foreground">Assigned to employees</p>
                                        </div>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                            {stats.assigned_assets} items
                                        </span>
                                    </div>
                                )}
                            </Link>
                        )}
                    </div>
                </>
            )}

            {hasPermission('notice_board.view') && (
                <NoticeBoard embedded   />
            )}

        </div>
    );
}
