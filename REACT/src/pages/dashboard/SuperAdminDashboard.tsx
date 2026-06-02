import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { Users, Server, Activity, ShieldCheck } from "lucide-react";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function SuperAdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total_employees: 0,
        total_users: 0,
        total_admins: 0
    });
    const [departmentData, setDepartmentData] = useState<any[]>([]);
    const [activityChart, setActivityChart] = useState<any[]>([]);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/dashboard');
                if (res.data.stats) setStats(res.data.stats);
                if (res.data.department_distribution) setDepartmentData(res.data.department_distribution);
                if (res.data.system_activity) setActivityChart(res.data.system_activity);
                if (res.data.recent_logs) setRecentLogs(res.data.recent_logs);
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
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center text-muted-foreground">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-5 min-h-screen">
            {/* Banner Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-5 px-6 text-white shadow-lg">
                <div className="relative z-10">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm uppercase tracking-wider">
                            System Overview
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold">{getGreeting()}, {user?.name}! 👋</h1>
                    <p className="mt-1 text-sm text-slate-300 max-w-xl">
                        Welcome to your Super Admin dashboard. Here is an overview of system activity and user distribution.
                    </p>
                </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-card p-4 px-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                            <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total_employees}</h3>
                        </div>
                        <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 px-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total System Users</p>
                            <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total_users}</h3>
                        </div>
                        <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
                            <Activity className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 px-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Admins</p>
                            <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total_admins}</h3>
                        </div>
                        <div className="rounded-full bg-purple-100 p-2 text-purple-600">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 px-5 shadow-sm">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/80">
                        System Status
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Server</span>
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div> Online
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Database</span>
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div> Connected
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-5 lg:grid-cols-2">
                {/* Department Distribution Pie Chart */}
                <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col">
                    <div>
                        <h3 className="text-[15px] font-semibold mb-0.5 text-foreground">Department Distribution</h3>
                        <p className="text-[11px] text-muted-foreground mb-3">Employee composition across all departments.</p>
                    </div>
                    <div className="flex-1 w-full min-h-[250px] flex flex-col">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={departmentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {departmentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || '#3B82F6'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-4 mt-2">
                            {departmentData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || '#3B82F6' }}></div>
                                    <span className="text-[11px] font-medium text-slate-700">{entry.name} ({entry.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* System Activity Chart */}
                <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col">
                    <div>
                        <h3 className="text-[15px] font-semibold mb-0.5 text-foreground">System Activity (7 Days)</h3>
                        <p className="text-[11px] text-muted-foreground mb-3">Total audit logs recorded per day.</p>
                    </div>
                    <div className="flex-1 w-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="logs" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={35} name="Actions Recorded" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Logs Table */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b bg-slate-50/50">
                    <h3 className="text-[15px] font-semibold text-foreground">Recent Security & Audit Logs</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground bg-slate-50/50 uppercase">
                            <tr>
                                <th className="px-5 py-3 font-medium">User</th>
                                <th className="px-5 py-3 font-medium">Action</th>
                                <th className="px-5 py-3 font-medium">Module</th>
                                <th className="px-5 py-3 font-medium">IP Address</th>
                                <th className="px-5 py-3 font-medium text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {recentLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3 text-slate-700 font-medium">
                                        {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-600">{log.model_type || '-'}</td>
                                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{log.ip_address || '-'}</td>
                                    <td className="px-5 py-3 text-right text-slate-500 text-xs">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {recentLogs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                                        No recent activity found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
