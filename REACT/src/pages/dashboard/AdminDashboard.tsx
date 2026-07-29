import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { Users, Clock, CheckCircle, Wallet, Megaphone, Printer, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type Range = 'today' | 'week' | 'month';

interface PayrollSummary {
    month: string;
    total_paid: number;
    paid_count: number;
    pending_count: number;
}

interface Announcement {
    id: number;
    title: string;
    type: string;
    created_at: string;
}

const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
);

const StatCardSkeleton = () => (
    <div className="rounded-xl border bg-card p-4 px-5 shadow-sm">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-12" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-4 w-16" />
    </div>
);

const chartSkeletonHeights = ['h-1/4', 'h-2/3', 'h-1/3', 'h-3/4', 'h-1/2', 'h-full', 'h-2/5'];
const ChartSkeleton = () => (
    <div className="flex-1 w-full min-h-[280px] flex items-end gap-3 px-4 pb-4">
        {chartSkeletonHeights.map((h, i) => (
            <div key={i} className="flex-1 flex items-end h-48">
                <Skeleton className={`w-full ${h}`} />
            </div>
        ))}
    </div>
);

const EmptyChart = ({ message }: { message: string }) => (
    <div className="flex-1 w-full min-h-[280px] flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">{message}</p>
    </div>
);

const typeBadgeColors: Record<string, string> = {
    Urgent: "bg-red-100 text-red-600",
    Holiday: "bg-green-100 text-green-600",
    Info: "bg-blue-100 text-blue-600",
    General: "bg-slate-100 text-slate-600",
};

export default function AdminDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [stats, setStats] = useState({
        total_employees: 0,
        present_today: 0,
        pending_leaves: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [punctualityData, setPunctualityData] = useState<any[]>([]);
    const [leaveTrends, setLeaveTrends] = useState<any[]>([]);
    const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [range, setRange] = useState<Range>('week');
    const [loading, setLoading] = useState(true);

    const fetchDashboard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/dashboard', { params: { range } });
            if (res.data.stats) setStats(res.data.stats);
            setChartData(res.data.attendance_chart ?? []);
            setPunctualityData(res.data.punctuality_chart ?? []);
            setLeaveTrends(res.data.leave_trends ?? []);
            setPayroll(res.data.payroll_summary ?? null);
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [range]);

    const fetchAnnouncements = useCallback(async () => {
        try {
            const res = await api.get('/announcements/latest');
            setAnnouncements(res.data.data ?? []);
        } catch (error) {
            console.error("Failed to load announcements", error);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        fetchAnnouncements();
    }, [fetchDashboard, fetchAnnouncements]);

    useLiveRefresh(async () => {
        await Promise.all([fetchDashboard(true), fetchAnnouncements()]);
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.greeting_morning');
        if (hour < 18) return t('dashboard.greeting_afternoon');
        return t('dashboard.greeting_evening');
    };

    const rangeLabels: Record<Range, string> = {
        today: t('dashboard.range_today'),
        week: t('dashboard.range_week'),
        month: t('dashboard.range_month'),
    };

    const hasAttendanceData = chartData.some(d => (d.present ?? 0) > 0 || (d.absent ?? 0) > 0);
    const hasPunctualityData = punctualityData.some(d => (d.value ?? 0) > 0);
    const currencyFormat = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

    return (
        <div className="space-y-5">
            {/* Print-only header */}
            <div className="hidden print:block border-b pb-3">
                <h1 className="text-xl font-bold">HR Dashboard Report</h1>
                <p className="text-sm text-slate-500">
                    {t('dashboard.generated_on')} {new Date().toLocaleString()} — {rangeLabels[range]}
                </p>
            </div>

            {/* Banner Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-slate-700 p-5 px-6 text-white shadow-lg print:hidden">
                <div className="relative z-10">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm uppercase">
                            {user?.roles?.[0]?.name || 'Admin Panel'}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold">{getGreeting()}, {user?.name}! 👋</h1>
                    <p className="mt-1 text-sm text-blue-100 max-w-xl">
                        {t('dashboard.welcome_text')}
                    </p>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.9,32.2C59.6,42.9,48.3,51.4,36.4,58.5C24.5,65.6,11.9,71.3,-1.2,73.4C-14.3,75.5,-29.6,74,-42.6,67.3C-55.6,60.6,-66.3,48.7,-74.8,35.3C-83.3,21.9,-89.6,7,-87.8,-7.1C-86,-21.2,-76.1,-34.5,-64.8,-45.5C-53.5,-56.5,-40.8,-65.2,-27.5,-73.1C-14.2,-81,-0.3,-88.1,13.8,-88C28,-87.9,40,-80.6,44.7,-76.4Z" transform="translate(100 100)" />
                    </svg>
                </div>
            </div>

            {/* Toolbar: range filter + export */}
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
                    {(['today', 'week', 'month'] as Range[]).map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                range === r
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:bg-slate-100'
                            }`}
                        >
                            {rangeLabels[r]}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <Printer className="h-4 w-4" />
                    {t('dashboard.export_pdf')}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-5 w-full">
                {/* Attendance Stats Cards */}
                <div className="flex-1 min-w-0 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {loading ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : (
                        <>
                            <Link to="/attendance" className="group rounded-xl border border-green-100 bg-gradient-to-br from-green-50/70 via-card to-card p-4 px-5 shadow-sm transition-shadow hover:shadow-md hover:border-green-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{t('dashboard.present_today')}</p>
                                        <h3 className="text-2xl font-bold text-foreground mt-1">{stats.present_today}</h3>
                                    </div>
                                    <div className="rounded-full bg-green-100 p-2 text-green-600">
                                        <CheckCircle className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[11px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">{t('dashboard.on_time')}</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>

                            <Link to="/employees" className="group rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-card to-card p-4 px-5 shadow-sm transition-shadow hover:shadow-md hover:border-blue-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{t('dashboard.total_employees')}</p>
                                        <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total_employees}</h3>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                        <Users className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">{t('dashboard.active_staff')}</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>

                            <Link to="/leaves?status=pending" className="group rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/70 via-card to-card p-4 px-5 shadow-sm transition-shadow hover:shadow-md hover:border-orange-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{t('dashboard.pending_leaves')}</p>
                                        <h3 className="text-2xl font-bold text-foreground mt-1">{stats.pending_leaves}</h3>
                                    </div>
                                    <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[11px] text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded">{t('dashboard.requires_action')}</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>

                            <Link to="/payroll" className="group rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-card to-card p-4 px-5 shadow-sm transition-shadow hover:shadow-md hover:border-violet-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{t('dashboard.payroll_this_month')}</p>
                                        <h3 className="text-2xl font-bold text-foreground mt-1">
                                            {payroll ? currencyFormat(payroll.total_paid) : '—'}
                                        </h3>
                                    </div>
                                    <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[11px] text-violet-600 font-medium bg-violet-50 px-2 py-0.5 rounded">
                                        {payroll ? `${payroll.paid_count} ${t('dashboard.paid')} · ${payroll.pending_count} ${t('dashboard.pending')}` : t('dashboard.no_payslips')}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Advanced Analytics Section */}
            <div className="grid gap-5 lg:grid-cols-2">
                {/* Attendance Chart */}
                <div className="bg-gradient-to-br from-blue-50/60 via-card to-card border border-blue-100 rounded-xl p-5 shadow-sm flex flex-col">
                    <h3 className="text-[15px] font-semibold mb-3 text-foreground">
                        {t('dashboard.attendance_overview')} — {rangeLabels[range]}
                    </h3>
                    {loading ? (
                        <ChartSkeleton />
                    ) : !hasAttendanceData ? (
                        <EmptyChart message={t('dashboard.no_attendance_data')} />
                    ) : (
                        <div className="flex-1 w-full min-h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} interval="preserveStartEnd" />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="present" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={range === 'month' ? 10 : 30} name="Present" />
                                    <Bar dataKey="absent" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={range === 'month' ? 10 : 30} name="Absent" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Punctuality Pie Chart */}
                <div className="bg-gradient-to-br from-green-50/60 via-card to-card border border-green-100 rounded-xl p-5 shadow-sm flex flex-col">
                    <div>
                        <h3 className="text-[15px] font-semibold mb-0.5 text-foreground">{t('dashboard.punctuality')} — {rangeLabels[range]}</h3>
                        <p className="text-[11px] text-muted-foreground mb-3">{t('dashboard.punctuality_subtitle')}</p>
                    </div>
                    {loading ? (
                        <ChartSkeleton />
                    ) : !hasPunctualityData ? (
                        <EmptyChart message={t('dashboard.no_punctuality_data')} />
                    ) : (
                        <div className="flex-1 w-full min-h-[280px] flex flex-col">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={punctualityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {punctualityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Custom Legend */}
                            <div className="flex justify-center gap-6 mt-4">
                                {punctualityData.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                        <span className="text-sm font-medium text-slate-700">{entry.name} ({entry.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Announcements Widget */}
                <div className="bg-gradient-to-br from-sky-50/60 via-card to-card border border-sky-100 rounded-xl p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-blue-600" />
                            <h3 className="text-[15px] font-semibold text-foreground">{t('dashboard.announcements')}</h3>
                        </div>
                        <Link to="/notices" className="text-xs font-medium text-blue-600 hover:underline print:hidden">
                            {t('dashboard.view_all')}
                        </Link>
                    </div>
                    {announcements.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center py-8 text-sm text-muted-foreground">
                            {t('dashboard.no_announcements')}
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {announcements.slice(0, 5).map(a => (
                                <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {new Date(a.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadgeColors[a.type] ?? typeBadgeColors.General}`}>
                                        {a.type}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Leave Trends Bar Chart */}
                <div className="bg-gradient-to-br from-violet-50/60 via-card to-card border border-violet-100 rounded-xl p-5 shadow-sm flex flex-col">
                    <div>
                        <h3 className="text-[15px] font-semibold mb-0.5 text-foreground">{t('dashboard.leave_trends')}</h3>
                        <p className="text-[11px] text-muted-foreground mb-3">{t('dashboard.leave_trends_subtitle')}</p>
                    </div>
                    {loading ? (
                        <ChartSkeleton />
                    ) : (
                        <div className="flex-1 w-full min-h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={leaveTrends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="leaves" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={20} name="Approved Leaves" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
