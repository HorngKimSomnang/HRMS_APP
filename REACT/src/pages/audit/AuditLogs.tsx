import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import {
    ScrollText, ShieldCheck, RefreshCw, Search,
    ChevronLeft, ChevronRight, User, Clock, Activity,
    Banknote, FileCheck, Settings2, AlertTriangle, CheckCircle2,
    MapPin, LogIn, LogOut, UserPlus, UserMinus, UserCog,
    KeyRound, Download, Monitor,
} from "lucide-react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

// ── Action config ─────────────────────────────────────────────────────────────
const ACTION_CFG: Record<string, { label: string; color: string; icon: any }> = {
    // Auth
    LOGIN_SUCCESS:               { label: "Login",              color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: LogIn },
    LOGIN_FAILED:                { label: "Login Failed",       color: "bg-red-50 text-red-700 border-red-200",             icon: LogIn },
    LOGOUT:                      { label: "Logout",             color: "bg-slate-50 text-slate-600 border-slate-200",       icon: LogOut },
    PASSWORD_CHANGED:            { label: "Password Changed",   color: "bg-amber-50 text-amber-700 border-amber-200",       icon: KeyRound },
    // Employee
    EMPLOYEE_CREATED:            { label: "Employee Created",   color: "bg-teal-50 text-teal-700 border-teal-200",          icon: UserPlus },
    EMPLOYEE_UPDATED:            { label: "Employee Updated",   color: "bg-cyan-50 text-cyan-700 border-cyan-200",          icon: UserCog },
    EMPLOYEE_DELETED:            { label: "Employee Deleted",   color: "bg-rose-50 text-rose-700 border-rose-200",          icon: UserMinus },
    // Leave
    LEAVE_STATUS_CHANGED:        { label: "Leave Decision",     color: "bg-blue-50 text-blue-700 border-blue-200",          icon: FileCheck },
    // Overtime
    OVERTIME_APPROVED:           { label: "OT Approved",        color: "bg-green-50 text-green-700 border-green-200",       icon: Banknote },
    // Payslip
    PAYSLIP_GENERATED:           { label: "Payslip Generated",  color: "bg-violet-50 text-violet-700 border-violet-200",   icon: FileCheck },
    PAYSLIP_STATUS_CHANGED:      { label: "Payslip Auth",       color: "bg-indigo-50 text-indigo-700 border-indigo-200",   icon: CheckCircle2 },
    // Settings
    SYSTEM_SETTINGS_UPDATED:     { label: "Settings Changed",   color: "bg-amber-50 text-amber-700 border-amber-200",      icon: Settings2 },
};

function getActionCfg(action: string) {
    for (const key of Object.keys(ACTION_CFG)) {
        if (action.startsWith(key)) return ACTION_CFG[key];
    }
    return { label: action, color: "bg-gray-100 text-gray-600 border-gray-200", icon: Activity };
}

function formatModel(modelType: string | null) {
    if (!modelType) return null;
    return modelType.split("\\").pop() ?? modelType;
}

// ── Context renderer ──────────────────────────────────────────────────────────
const CONTEXT_LABELS: Record<string, { label: string; format?: (v: any) => string }> = {
    status:          { label: "Status",         format: v => String(v).toUpperCase() },
    from_status:     { label: "From",           format: v => String(v).toUpperCase() },
    net_salary:      { label: "Net Salary",     format: v => `$${Number(v).toLocaleString()}` },
    override:        { label: "Override",       format: v => v ? "⚠ God Mode" : "No" },
    rejection_reason:{ label: "Reason" },
    hours:           { label: "OT Hours",       format: v => `${v} hrs` },
    calculated_pay:  { label: "OT Pay",         format: v => `$${Number(v).toLocaleString()}` },
    keys_updated:    { label: "Keys",           format: v => Array.isArray(v) ? v.join(", ") : String(v) },
    employee:        { label: "Employee" },
    employee_code:   { label: "Code" },
    department:      { label: "Dept" },
    job_title:       { label: "Title" },
    fields_updated:  { label: "Fields",         format: v => Array.isArray(v) ? v.join(", ") : String(v) },
    leave_type:      { label: "Leave Type" },
    month:           { label: "Month" },
    type:            { label: "Type",           format: v => String(v).replace(/_/g, " ").toUpperCase() },
    email:           { label: "Email" },
    reason:          { label: "Reason" },
};

const HIDE_IN_BADGES = new Set(["user_agent", "changes"]);

function ContextBadges({ context, onShowAgent }: { context: Record<string, any> | null; onShowAgent?: (ua: string) => void }) {
    if (!context || Object.keys(context).length === 0)
        return <span className="text-gray-300 text-xs">—</span>;

    const entries = Object.entries(context).filter(([k, v]) =>
        !HIDE_IN_BADGES.has(k) && v !== null && v !== undefined && v !== false
    );

    const ua: string | null = context.user_agent ?? null;

    return (
        <div className="flex flex-wrap gap-1.5 items-center">
            {entries.map(([k, v]) => {
                const cfg = CONTEXT_LABELS[k];
                const label = cfg?.label ?? k;
                const val = cfg?.format ? cfg.format(v) : String(v);
                const isOverride = k === "override" && v === true;
                const isError = k === "reason" || (k === "status" && String(v).toLowerCase() === "rejected");

                return (
                    <span key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border
                        ${isOverride ? "bg-red-50 text-red-700 border-red-200"
                        : isError    ? "bg-orange-50 text-orange-700 border-orange-200"
                                     : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {isOverride && <AlertTriangle className="h-3 w-3" />}
                        <span className="font-semibold">{label}:</span> {val}
                    </span>
                );
            })}
            {ua && onShowAgent && (
                <button
                    onClick={() => onShowAgent(ua)}
                    title={ua}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 transition-colors"
                >
                    <Monitor className="h-3 w-3" />
                    Device
                </button>
            )}
        </div>
    );
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(logs: any[]) {
    const headers = ["Timestamp", "Actor", "Email", "Role", "Action", "Module", "Record ID", "IP Address"];
    const rows = logs.map(l => [
        new Date(l.created_at).toISOString(),
        l.user?.name ?? "System",
        l.user?.email ?? "",
        l.role,
        l.action,
        formatModel(l.model_type) ?? "",
        l.model_id ?? "",
        l.ip_address ?? "",
    ]);

    const csv = [headers, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── User-Agent Modal ──────────────────────────────────────────────────────────
function UAModal({ ua, onClose }: { ua: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-3">
                    <Monitor className="h-5 w-5 text-slate-500" />
                    <h2 className="text-sm font-bold text-slate-800">Device / Browser Info</h2>
                </div>
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono break-all">{ua}</p>
                <button onClick={onClose} className="mt-4 w-full py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">Close</button>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuditLogs() {
    const [logs, setLogs]           = useState<any[]>([]);
    const [meta, setMeta]           = useState<any>(null);
    const [loading, setLoading]     = useState(true);
    const [page, setPage]           = useState(1);
    const [search, setSearch]       = useState("");
    const [roleFilter, setRoleFilter]   = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [agentModal, setAgentModal]   = useState<string | null>(null);

    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params: any = { page };
            if (search)       params.action     = search;
            if (roleFilter)   params.role       = roleFilter;
            if (actionFilter) params.action     = actionFilter;
            const res = await api.get("/audit-logs", { params });
            setLogs(res.data.data || []);
            setMeta(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [page, search, roleFilter, actionFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useLiveRefresh(() => fetchLogs(true));

    // Derived stats from current page
    const godModeCount   = logs.filter(l => l.context?.override === true).length;
    const superAdminActs = logs.filter(l => l.role === "Super Admin").length;
    const adminActs      = logs.filter(l => l.role === "Admin").length;

    return (
        <div className="space-y-6">
            {agentModal && <UAModal ua={agentModal} onClose={() => setAgentModal(null)} />}

            {/* ── Header ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-xl">
                <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">System Audit Trail</h1>
                            <p className="text-slate-400 text-sm mt-0.5">Immutable, tamper-proof record of all privileged actions.</p>
                        </div>
                    </div>
                    <div className="hidden md:flex flex-col gap-1.5 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Read-Only • Cannot be altered</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
                            <Clock className="h-3.5 w-3.5 text-blue-400" />
                            <span>Server-side timestamps (UTC)</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
                            <Monitor className="h-3.5 w-3.5 text-purple-400" />
                            <span>IP + Device captured per action</span>
                        </div>
                    </div>
                </div>
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
                <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            {/* ── Stats Strip ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Entries",    value: meta?.total ?? "—",  color: "text-slate-700",  bg: "bg-slate-50 border-slate-200" },
                    { label: "Super Admin Acts", value: superAdminActs,       color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
                    { label: "Admin Acts",       value: adminActs,            color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
                    { label: "God Mode Used",    value: godModeCount,         color: "text-red-700",    bg: "bg-red-50 border-red-200" },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl border ${s.bg} px-5 py-4`}>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-3 items-center bg-gradient-to-br from-slate-100/60 via-white to-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by action keyword…"
                        className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                <select
                    value={actionFilter}
                    onChange={e => { setActionFilter(e.target.value); setSearch(""); setPage(1); }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    <option value="">All Events</option>
                    <optgroup label="Auth">
                        <option value="LOGIN_SUCCESS">Login</option>
                        <option value="LOGIN_FAILED">Login Failed</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="PASSWORD_CHANGED">Password Changed</option>
                    </optgroup>
                    <optgroup label="Employee">
                        <option value="EMPLOYEE_CREATED">Employee Created</option>
                        <option value="EMPLOYEE_UPDATED">Employee Updated</option>
                        <option value="EMPLOYEE_DELETED">Employee Deleted</option>
                    </optgroup>
                    <optgroup label="HR Decisions">
                        <option value="LEAVE_STATUS_CHANGED">Leave Decision</option>
                        <option value="OVERTIME_APPROVED">OT Approved</option>
                    </optgroup>
                    <optgroup label="Payroll">
                        <option value="PAYSLIP_GENERATED">Payslip Generated</option>
                        <option value="PAYSLIP_STATUS_CHANGED">Payslip Authorized</option>
                    </optgroup>
                    <optgroup label="System">
                        <option value="SYSTEM_SETTINGS_UPDATED">Settings Changed</option>
                    </optgroup>
                </select>

                <select
                    value={roleFilter}
                    onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    <option value="">All Roles</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Employee">Employee</option>
                    <option value="Unknown">Unknown</option>
                </select>

                <button
                    onClick={() => fetchLogs()}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-gray-200 transition-colors"
                >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>

                <button
                    onClick={() => exportCSV(logs)}
                    disabled={logs.length === 0}
                    className="flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-50 border border-emerald-200 transition-colors disabled:opacity-40"
                >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                </button>

                {meta && (
                    <span className="text-xs text-muted-foreground ml-auto font-medium">
                        Showing {logs.length} of {meta.total ?? 0} records
                    </span>
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-gradient-to-br from-slate-100/50 via-white to-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
                        <RefreshCw className="h-5 w-5 animate-spin" /> Loading audit trail…
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-24 text-center">
                        <ScrollText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No audit records found.</p>
                        <p className="text-xs text-muted-foreground mt-1">Logs appear automatically as actions are performed.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/80 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b">
                            <tr>
                                <th className="px-5 py-4">Timestamp</th>
                                <th className="px-5 py-4">Actor</th>
                                <th className="px-5 py-4">Role</th>
                                <th className="px-5 py-4">Event</th>
                                <th className="px-5 py-4">Module</th>
                                <th className="px-5 py-4">Record</th>
                                <th className="px-5 py-4 min-w-[280px]">Details</th>
                                <th className="px-5 py-4">Source IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log: any) => {
                                const cfg  = getActionCfg(log.action);
                                const Icon = cfg.icon;
                                const model = formatModel(log.model_type);
                                const isGodMode = log.context?.override === true;
                                return (
                                    <tr key={log.id} className={`hover:bg-slate-50/60 transition-colors ${isGodMode ? "bg-red-50/30" : ""}`}>

                                        {/* Timestamp */}
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="text-xs font-semibold text-gray-700">
                                                {new Date(log.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                            </div>
                                            <div className="text-[11px] text-gray-400 mt-0.5">
                                                {new Date(log.created_at).toLocaleTimeString("en-GB")}
                                            </div>
                                        </td>

                                        {/* Actor */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-primary/10">
                                                    {(log.user?.name ?? "?")[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-800 text-xs leading-tight">{log.user?.name ?? "System"}</div>
                                                    <div className="text-gray-400 text-[10px] mt-0.5">{log.user?.email ?? "—"}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role */}
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border
                                                ${log.role === "Super Admin" ? "bg-violet-50 text-violet-700 border-violet-200"
                                                : log.role === "Admin"       ? "bg-blue-50 text-blue-700 border-blue-200"
                                                : log.role === "Unknown"     ? "bg-red-50 text-red-600 border-red-200"
                                                                             : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                                {log.role === "Super Admin" ? <ShieldCheck className="h-3 w-3" />
                                                : log.role === "Unknown"    ? <AlertTriangle className="h-3 w-3" />
                                                                            : <User className="h-3 w-3" />}
                                                {log.role}
                                            </span>
                                        </td>

                                        {/* Event */}
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${cfg.color}`}>
                                                <Icon className="h-3 w-3 shrink-0" />
                                                {cfg.label}
                                            </span>
                                        </td>

                                        {/* Module */}
                                        <td className="px-5 py-4">
                                            {model ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
                                                    {model}
                                                </span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>

                                        {/* Record ID */}
                                        <td className="px-5 py-4">
                                            {log.model_id ? (
                                                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                                    #{log.model_id}
                                                </span>
                                            ) : <span className="text-gray-300 text-xs">—</span>}
                                        </td>

                                        {/* Context Details */}
                                        <td className="px-5 py-4">
                                            <ContextBadges
                                                context={log.context}
                                                onShowAgent={ua => setAgentModal(ua)}
                                            />
                                        </td>

                                        {/* Source IP */}
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-500">
                                                <MapPin className="h-3 w-3 text-gray-300" />
                                                {log.ip_address ?? "—"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Pagination ── */}
            {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        Page <strong>{meta.current_page}</strong> of <strong>{meta.last_page}</strong>
                    </span>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                            <ChevronLeft className="h-4 w-4" /> Previous
                        </button>
                        <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                            Next <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
