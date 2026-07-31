import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { Users, Activity, DollarSign, Clock, CheckCircle, FileSignature, DoorOpen, Package, ChevronRight } from "lucide-react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import NoticeBoard from "@/pages/admin/NoticeBoard";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SuperAdminDashboard() {
    const { user } = useAuth();
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
    const [loading, setLoading] = useState(true);

    const fetchDashboard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/dashboard', { params: { month: selectedMonth, year: selectedYear } });
            if (res.data.stats) setStats(res.data.stats);
            if (res.data.period_label) setPeriodLabel(res.data.period_label);
            if (typeof res.data.is_current_month === 'boolean') setIsCurrentMonth(res.data.is_current_month);
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    useLiveRefresh(() => fetchDashboard(true), { resources: 'dashboard' });

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
            {/* Header Section */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-l-4 border-blue-600 pl-4 py-1">
                <div>
                    <h1 className="text-xl font-bold text-foreground">{getGreeting()}, {user?.name}! 👋</h1>
                    <p className="text-sm text-muted-foreground">System overview — activity, workforce and finance at a glance.</p>
                </div>
            </div>

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
                <Link to="/employees" className="group rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-card to-card p-4 px-5 shadow-sm transition-shadow hover:shadow-md hover:border-blue-200">
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                </Link>

                <Link
                    to={`/payroll?month=${selectedMonth}&year=${selectedYear}`}
                    className="group rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-card to-card p-4 px-5 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md hover:border-emerald-200"
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
                    <div className="mt-3 pt-3 border-t border-dashed relative z-10 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{stats.prior_period_label || 'Prior month'}</span>
                        <span className="text-sm font-semibold text-slate-600">
                            ${stats.prior_period_payroll.toFixed(2)}
                            {stats.prior_period_payroll_pending_count > 0 && (
                                <span className="text-amber-600 font-medium"> (+${stats.prior_period_payroll_pending_amount.toFixed(2)} unpaid)</span>
                            )}
                        </span>
                    </div>
                </Link>

                <Link to="/attendance" className="group rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-card to-card p-4 px-5 shadow-sm transition-shadow hover:shadow-md hover:border-amber-200">
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                </Link>

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
                                        <Link to={`/payroll?month=${selectedMonth}&year=${selectedYear}`} className="hover:text-primary hover:underline">
                                            • {stats.pending_payrolls} {stats.pending_payrolls === 1 ? 'Payslip' : 'Payslips'}
                                        </Link>
                                    )}
                                    {stats.pending_leaves > 0 && (
                                        <Link to="/leaves?status=pending" className="hover:text-primary hover:underline">
                                            • {stats.pending_leaves} {stats.pending_leaves === 1 ? 'Leave' : 'Leaves'}
                                        </Link>
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
            </div>

            {/* HR Health Strip */}
            <div className="grid gap-4 md:grid-cols-3">
                <Link to="/lifecycle?tab=contracts" className="group rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/70 via-card to-card p-4 px-5 shadow-sm flex items-center justify-between transition-shadow hover:shadow-md hover:border-orange-200">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Contracts Expiring (30d)</p>
                        <h3 className={`text-2xl font-bold mt-1 ${stats.expiring_contracts > 0 ? 'text-orange-600' : 'text-foreground'}`}>{stats.expiring_contracts}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                            <FileSignature className="h-5 w-5" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </Link>
                <Link to="/lifecycle?tab=offboarding" className="group rounded-xl border border-red-100 bg-gradient-to-br from-red-50/70 via-card to-card p-4 px-5 shadow-sm flex items-center justify-between transition-shadow hover:shadow-md hover:border-red-200">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Open Offboardings</p>
                        <h3 className={`text-2xl font-bold mt-1 ${stats.open_offboardings > 0 ? 'text-red-600' : 'text-foreground'}`}>{stats.open_offboardings}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-red-100 p-2 text-red-600">
                            <DoorOpen className="h-5 w-5" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </Link>
                <Link to="/assets" className="group rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-card to-card p-4 px-5 shadow-sm flex items-center justify-between transition-shadow hover:shadow-md hover:border-amber-200">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Assets In Use</p>
                        <h3 className="text-2xl font-bold text-foreground mt-1">{stats.assigned_assets}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                            <Package className="h-5 w-5" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </Link>
            </div>

            <NoticeBoard embedded />

        </div>
    );
}
