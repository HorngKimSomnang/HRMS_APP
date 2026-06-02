import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { Users, Clock, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const attendanceData = [
    { name: 'Mon', present: 45, absent: 2 },
    { name: 'Tue', present: 48, absent: 1 },
    { name: 'Wed', present: 42, absent: 5 },
    { name: 'Thu', present: 47, absent: 0 },
    { name: 'Fri', present: 44, absent: 4 },
];

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/dashboard');
                if (res.data.stats) {
                    setStats(res.data.stats);
                }
                if (res.data.attendance_chart) {
                    setChartData(res.data.attendance_chart);
                }
                if (res.data.punctuality_chart) {
                    setPunctualityData(res.data.punctuality_chart);
                }
                if (res.data.leave_trends) {
                    setLeaveTrends(res.data.leave_trends);
                }
            } catch (error) {
                console.error("Failed to load dashboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.greeting_morning');
        if (hour < 18) return t('dashboard.greeting_afternoon');
        return t('dashboard.greeting_evening');
    };

    return (
        <div className="space-y-5 min-h-screen">
            {/* Banner Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-slate-700 p-5 px-6 text-white shadow-lg">
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

            <div className="flex flex-col lg:flex-row gap-5 w-full">
                {/* Attendance Stats Cards */}
                <div className="flex-1 min-w-0 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border bg-card p-4 px-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.present_today')}</p>
                                <h3 className="text-2xl font-bold text-foreground mt-1">{loading ? "..." : stats.present_today}</h3>
                            </div>
                            <div className="rounded-full bg-green-100 p-2 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center text-[11px] text-green-600 font-medium bg-green-50 w-fit px-2 py-0.5 rounded">
                            {t('dashboard.on_time')}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-4 px-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.total_employees')}</p>
                                <h3 className="text-2xl font-bold text-foreground mt-1">{loading ? "..." : stats.total_employees}</h3>
                            </div>
                            <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center text-[11px] text-blue-600 font-medium bg-blue-50 w-fit px-2 py-0.5 rounded">
                            {t('dashboard.active_staff')}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-4 px-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.pending_leaves')}</p>
                                <h3 className="text-2xl font-bold text-foreground mt-1">{loading ? "..." : stats.pending_leaves}</h3>
                            </div>
                            <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                                <Clock className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center text-[11px] text-orange-600 font-medium bg-orange-50 w-fit px-2 py-0.5 rounded">
                            {t('dashboard.requires_action')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Analytics Section */}
            <div className="grid gap-5 lg:grid-cols-3">
                {/* 7-Day Attendance Chart */}
                <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col">
                    <h3 className="text-[15px] font-semibold mb-3 text-foreground">{t('dashboard.7_day_overview')}</h3>
                    <div className="flex-1 w-full min-h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.length > 0 ? chartData : attendanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="present" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={30} name="Present" />
                                <Bar dataKey="absent" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={30} name="Absent" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Punctuality Pie Chart */}
                <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col">
                    <div>
                        <h3 className="text-[15px] font-semibold mb-0.5 text-foreground">{t('dashboard.monthly_punctuality')}</h3>
                        <p className="text-[11px] text-muted-foreground mb-3">{t('dashboard.overall_attendance')}</p>
                    </div>
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
                </div>

                {/* Leave Trends Bar Chart (Full Width) */}
                <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col">
                    <div>
                        <h3 className="text-[15px] font-semibold mb-0.5 text-foreground">Leave Trends (Current Year)</h3>
                        <p className="text-[11px] text-muted-foreground mb-3">Total approved leaves taken each month.</p>
                    </div>
                    <div className="flex-1 w-full min-h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leaveTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="leaves" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} name="Approved Leaves" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

