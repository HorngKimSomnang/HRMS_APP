import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import api from "@/services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { FileSignature, History, DoorOpen, AlertTriangle, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

type Tab = 'overview' | 'contracts' | 'history' | 'offboarding';

const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diff / 86400000);
};

const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString() : '—';

const contractTypeBadge: Record<string, string> = {
    probation: "bg-orange-100 text-orange-700",
    fixed_term: "bg-blue-100 text-blue-700",
    permanent: "bg-green-100 text-green-700",
};

const statusBadge: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    expired: "bg-slate-100 text-slate-600",
    terminated: "bg-red-100 text-red-700",
    pending: "bg-orange-100 text-orange-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
};

const eventTypeBadge: Record<string, string> = {
    promotion: "bg-violet-100 text-violet-700",
    transfer: "bg-blue-100 text-blue-700",
    salary_change: "bg-green-100 text-green-700",
    status_change: "bg-slate-100 text-slate-600",
};

export default function Lifecycle() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [tab, setTab] = useState<Tab>(
        tabParam === 'contracts' || tabParam === 'history' || tabParam === 'offboarding' ? tabParam : 'overview'
    );
    const [employees, setEmployees] = useState<any[]>([]);
    const [overview, setOverview] = useState<any>(null);
    const [contracts, setContracts] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [offboardings, setOffboardings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // dialogs
    const [contractForm, setContractForm] = useState<any | null>(null);
    const [eventForm, setEventForm] = useState<any | null>(null);
    const [offboardForm, setOffboardForm] = useState<any | null>(null);
    const [activeOffboarding, setActiveOffboarding] = useState<any | null>(null);

    const loadAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [ov, c, e, o] = await Promise.all([
                api.get('/lifecycle/overview'),
                api.get('/lifecycle/contracts'),
                api.get('/lifecycle/events'),
                api.get('/lifecycle/offboardings'),
            ]);
            setOverview(ov.data);
            setContracts(c.data.data ?? []);
            setEvents(e.data.data ?? []);
            setOffboardings(o.data.data ?? []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load lifecycle data");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useLiveRefresh(async () => {
        await loadAll(true);
        const res = await api.get('/employees?status=active&all=true');
        setEmployees(res.data.data ?? res.data ?? []);
    }, { resources: ['lifecycle', 'employees'] });

    useEffect(() => {
        loadAll();
        api.get('/employees?status=active&all=true')
            .then(res => setEmployees(res.data.data ?? res.data ?? []))
            .catch(() => {});
    }, [loadAll]);

    // ---------- actions ----------
    const saveContract = async () => {
        try {
            if (contractForm.id) {
                await api.put(`/lifecycle/contracts/${contractForm.id}`, contractForm);
            } else {
                await api.post('/lifecycle/contracts', contractForm);
            }
            toast.success(t('lifecycle.saved', 'Saved'));
            setContractForm(null);
            loadAll();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save contract");
        }
    };

    const deleteContract = async (id: number) => {
        try {
            await api.delete(`/lifecycle/contracts/${id}`);
            setContracts(contracts.filter(c => c.id !== id));
        } catch { toast.error("Failed to delete"); }
    };

    const saveEvent = async () => {
        try {
            await api.post('/lifecycle/events', eventForm);
            toast.success(t('lifecycle.saved', 'Saved'));
            setEventForm(null);
            loadAll();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save event");
        }
    };

    const deleteEvent = async (id: number) => {
        try {
            await api.delete(`/lifecycle/events/${id}`);
            setEvents(events.filter(e => e.id !== id));
        } catch { toast.error("Failed to delete"); }
    };

    const saveOffboarding = async () => {
        try {
            await api.post('/lifecycle/offboardings', offboardForm);
            toast.success(t('lifecycle.offboarding_started', 'Offboarding started'));
            setOffboardForm(null);
            loadAll();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to start offboarding");
        }
    };

    const updateOffboarding = async (id: number, payload: any) => {
        try {
            const res = await api.put(`/lifecycle/offboardings/${id}`, payload);
            const updated = res.data.data;
            setOffboardings(offboardings.map(o => o.id === id ? updated : o));
            setActiveOffboarding(updated);
            loadAll();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update");
        }
    };

    const toggleChecklistItem = (ob: any, key: string) => {
        const checklist = (ob.checklist ?? []).map((item: any) =>
            item.key === key ? { ...item, done: !item.done } : item
        );
        updateOffboarding(ob.id, { checklist });
    };

    const checklistProgress = (ob: any) => {
        const items = ob.checklist ?? [];
        if (!items.length) return 0;
        return Math.round(items.filter((i: any) => i.done).length / items.length * 100);
    };

    const tabs: { key: Tab; label: string; icon: any }[] = [
        { key: 'overview', label: t('lifecycle.tab_overview', 'Overview'), icon: AlertTriangle },
        { key: 'contracts', label: t('lifecycle.tab_contracts', 'Contracts'), icon: FileSignature },
        { key: 'history', label: t('lifecycle.tab_history', 'Career History'), icon: History },
        { key: 'offboarding', label: t('lifecycle.tab_offboarding', 'Offboarding'), icon: DoorOpen },
    ];

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('lifecycle.title', 'Employee Lifecycle')}</h1>
                    <p className="text-sm text-muted-foreground">{t('lifecycle.subtitle', 'Contracts, career history and offboarding in one place.')}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm w-fit">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-slate-100'
                        }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground animate-pulse">
                    {t('common.loading', 'Loading...')}
                </div>
            ) : (
                <>
                    {/* ---------- OVERVIEW ---------- */}
                    {tab === 'overview' && overview && (
                        <div className="grid gap-5 lg:grid-cols-3">
                            <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/50 via-card to-card p-5 shadow-sm">
                                <h3 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    {t('lifecycle.expiring_contracts', 'Contracts expiring soon')} ({overview.counts.expiring_contracts})
                                </h3>
                                {overview.expiring_contracts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4">{t('lifecycle.none', 'Nothing here.')}</p>
                                ) : overview.expiring_contracts.map((c: any) => (
                                    <div key={c.id} className="py-2 border-b last:border-0 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{c.employee?.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{c.type} · {fmt(c.end_date)}</p>
                                        </div>
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${daysUntil(c.end_date) <= 7 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {daysUntil(c.end_date)} {t('lifecycle.days', 'days')}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-card to-card p-5 shadow-sm">
                                <h3 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
                                    <FileSignature className="h-4 w-4 text-blue-500" />
                                    {t('lifecycle.active_probations', 'Active probations')} ({overview.counts.probations})
                                </h3>
                                {overview.probations.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4">{t('lifecycle.none', 'Nothing here.')}</p>
                                ) : overview.probations.map((c: any) => (
                                    <div key={c.id} className="py-2 border-b last:border-0 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{c.employee?.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{t('lifecycle.ends', 'Ends')}: {fmt(c.end_date)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50/50 via-card to-card p-5 shadow-sm">
                                <h3 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
                                    <DoorOpen className="h-4 w-4 text-red-500" />
                                    {t('lifecycle.open_offboardings', 'Open offboardings')} ({overview.counts.open_offboardings})
                                </h3>
                                {overview.open_offboardings.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4">{t('lifecycle.none', 'Nothing here.')}</p>
                                ) : overview.open_offboardings.map((o: any) => (
                                    <div key={o.id} className="py-2 border-b last:border-0 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{o.employee?.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{t('lifecycle.last_day', 'Last day')}: {fmt(o.last_working_day)}</p>
                                        </div>
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${statusBadge[o.status]}`}>{o.status.replace('_', ' ')}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/50 via-card to-card p-5 shadow-sm lg:col-span-3">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[15px] font-semibold flex items-center gap-2">
                                        <History className="h-4 w-4 text-violet-500" />
                                        {t('lifecycle.recent_activity', 'Recent activity')}
                                    </h3>
                                    {events.length > 0 && (
                                        <button onClick={() => setTab('history')} className="text-xs font-medium text-blue-600 hover:underline">
                                            {t('lifecycle.view_all', 'View all')}
                                        </button>
                                    )}
                                </div>
                                {events.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4">{t('lifecycle.none', 'Nothing here.')}</p>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {events.slice(0, 6).map((e: any) => (
                                            <div key={e.id} className="flex items-start gap-3 rounded-lg border p-3">
                                                <span className={`mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded capitalize shrink-0 ${eventTypeBadge[e.type]}`}>
                                                    {e.type.replace('_', ' ')}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{e.employee?.name}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        {e.old_value && <span className="line-through mr-1">{e.old_value}</span>}
                                                        {e.new_value}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">{fmt(e.effective_date)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ---------- CONTRACTS ---------- */}
                    {tab === 'contracts' && (
                        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/40 via-card to-card shadow-sm">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-[15px] font-semibold">{t('lifecycle.tab_contracts', 'Contracts')}</h3>
                                <Button size="sm" onClick={() => setContractForm({ employee_id: '', type: 'probation', start_date: '', end_date: '', notes: '' })}>
                                    <Plus className="h-4 w-4 mr-1" /> {t('lifecycle.new_contract', 'New Contract')}
                                </Button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('lifecycle.employee', 'Employee')}</TableHead>
                                        <TableHead>{t('lifecycle.type', 'Type')}</TableHead>
                                        <TableHead>{t('lifecycle.start', 'Start')}</TableHead>
                                        <TableHead>{t('lifecycle.end', 'End')}</TableHead>
                                        <TableHead>{t('lifecycle.status', 'Status')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contracts.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('lifecycle.none', 'Nothing here.')}</TableCell></TableRow>
                                    )}
                                    {contracts.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.employee?.name}</TableCell>
                                            <TableCell>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${contractTypeBadge[c.type]}`}>{c.type.replace('_', ' ')}</span>
                                            </TableCell>
                                            <TableCell>{fmt(c.start_date)}</TableCell>
                                            <TableCell>{fmt(c.end_date)}</TableCell>
                                            <TableCell>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${statusBadge[c.status]}`}>{c.status}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setContractForm({ ...c, start_date: c.start_date?.slice(0, 10), end_date: c.end_date?.slice(0, 10) ?? '' })}>
                                                    {t('common.edit', 'Edit')}
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteContract(c.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* ---------- CAREER HISTORY ---------- */}
                    {tab === 'history' && (
                        <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/40 via-card to-card shadow-sm">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-[15px] font-semibold">{t('lifecycle.tab_history', 'Career History')}</h3>
                                <Button size="sm" onClick={() => setEventForm({ employee_id: '', type: 'promotion', old_value: '', new_value: '', effective_date: '', notes: '', apply_to_employee: true })}>
                                    <Plus className="h-4 w-4 mr-1" /> {t('lifecycle.record_event', 'Record Event')}
                                </Button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('lifecycle.employee', 'Employee')}</TableHead>
                                        <TableHead>{t('lifecycle.type', 'Type')}</TableHead>
                                        <TableHead>{t('lifecycle.change', 'Change')}</TableHead>
                                        <TableHead>{t('lifecycle.effective', 'Effective')}</TableHead>
                                        <TableHead>{t('lifecycle.recorded_by', 'Recorded by')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('lifecycle.none', 'Nothing here.')}</TableCell></TableRow>
                                    )}
                                    {events.map(e => (
                                        <TableRow key={e.id}>
                                            <TableCell className="font-medium">{e.employee?.name}</TableCell>
                                            <TableCell>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${eventTypeBadge[e.type]}`}>{e.type.replace('_', ' ')}</span>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {e.old_value && <span className="text-muted-foreground line-through mr-2">{e.old_value}</span>}
                                                <span className="font-medium">{e.new_value}</span>
                                            </TableCell>
                                            <TableCell>{fmt(e.effective_date)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{e.creator?.name ?? '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteEvent(e.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* ---------- OFFBOARDING ---------- */}
                    {tab === 'offboarding' && (
                        <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50/40 via-card to-card shadow-sm">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-[15px] font-semibold">{t('lifecycle.tab_offboarding', 'Offboarding')}</h3>
                                <Button size="sm" onClick={() => setOffboardForm({ employee_id: '', resignation_date: '', last_working_day: '', reason: '' })}>
                                    <Plus className="h-4 w-4 mr-1" /> {t('lifecycle.start_offboarding', 'Start Offboarding')}
                                </Button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('lifecycle.employee', 'Employee')}</TableHead>
                                        <TableHead>{t('lifecycle.resigned', 'Resigned')}</TableHead>
                                        <TableHead>{t('lifecycle.last_day', 'Last day')}</TableHead>
                                        <TableHead>{t('lifecycle.checklist', 'Checklist')}</TableHead>
                                        <TableHead>{t('lifecycle.status', 'Status')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {offboardings.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('lifecycle.none', 'Nothing here.')}</TableCell></TableRow>
                                    )}
                                    {offboardings.map(o => (
                                        <TableRow key={o.id}>
                                            <TableCell className="font-medium">{o.employee?.name}</TableCell>
                                            <TableCell>{fmt(o.resignation_date)}</TableCell>
                                            <TableCell>{fmt(o.last_working_day)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${checklistProgress(o)}%` }} />
                                                    </div>
                                                    <span className="text-[11px] text-muted-foreground">{checklistProgress(o)}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${statusBadge[o.status]}`}>{o.status.replace('_', ' ')}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setActiveOffboarding(o)}>
                                                    {t('common.manage', 'Manage')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </>
            )}

            {/* ---------- Contract Dialog ---------- */}
            <Dialog open={!!contractForm} onOpenChange={(open) => !open && setContractForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{contractForm?.id ? t('common.edit', 'Edit') : t('lifecycle.new_contract', 'New Contract')}</DialogTitle>
                    </DialogHeader>
                    {contractForm && (
                        <div className="space-y-3 py-2">
                            {!contractForm.id && (
                                <div>
                                    <Label>{t('lifecycle.employee', 'Employee')}</Label>
                                    <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                        value={contractForm.employee_id}
                                        onChange={e => setContractForm({ ...contractForm, employee_id: e.target.value })}>
                                        <option value="">—</option>
                                        {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name ?? `${emp.first_name} ${emp.last_name}`}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <Label>{t('lifecycle.type', 'Type')}</Label>
                                <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                    value={contractForm.type}
                                    onChange={e => setContractForm({ ...contractForm, type: e.target.value })}>
                                    <option value="probation">{t('lifecycle.probation', 'Probation')}</option>
                                    <option value="fixed_term">{t('lifecycle.fixed_term', 'Fixed term')}</option>
                                    <option value="permanent">{t('lifecycle.permanent', 'Permanent')}</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('lifecycle.start', 'Start')}</Label>
                                    <Input type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <Label>{t('lifecycle.end', 'End')}</Label>
                                    <Input type="date" value={contractForm.end_date ?? ''} onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })} />
                                </div>
                            </div>
                            {contractForm.id && (
                                <div>
                                    <Label>{t('lifecycle.status', 'Status')}</Label>
                                    <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                        value={contractForm.status}
                                        onChange={e => setContractForm({ ...contractForm, status: e.target.value })}>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                        <option value="terminated">Terminated</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <Label>{t('lifecycle.notes', 'Notes')}</Label>
                                <Input value={contractForm.notes ?? ''} onChange={e => setContractForm({ ...contractForm, notes: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setContractForm(null)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={saveContract} disabled={!contractForm?.employee_id && !contractForm?.id || !contractForm?.start_date}>{t('common.save', 'Save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Event Dialog ---------- */}
            <Dialog open={!!eventForm} onOpenChange={(open) => !open && setEventForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('lifecycle.record_event', 'Record Event')}</DialogTitle>
                    </DialogHeader>
                    {eventForm && (
                        <div className="space-y-3 py-2">
                            <div>
                                <Label>{t('lifecycle.employee', 'Employee')}</Label>
                                <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                    value={eventForm.employee_id}
                                    onChange={e => setEventForm({ ...eventForm, employee_id: e.target.value })}>
                                    <option value="">—</option>
                                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name ?? `${emp.first_name} ${emp.last_name}`}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>{t('lifecycle.type', 'Type')}</Label>
                                <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                    value={eventForm.type}
                                    onChange={e => setEventForm({ ...eventForm, type: e.target.value })}>
                                    <option value="promotion">{t('lifecycle.promotion', 'Promotion')}</option>
                                    <option value="transfer">{t('lifecycle.transfer', 'Transfer')}</option>
                                    <option value="salary_change">{t('lifecycle.salary_change', 'Salary change')}</option>
                                    <option value="status_change">{t('lifecycle.status_change', 'Status change')}</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('lifecycle.from', 'From')}</Label>
                                    <Input placeholder={t('lifecycle.old_value_ph', 'e.g. Junior Developer')} value={eventForm.old_value} onChange={e => setEventForm({ ...eventForm, old_value: e.target.value })} />
                                </div>
                                <div>
                                    <Label>{t('lifecycle.to', 'To')}</Label>
                                    <Input placeholder={t('lifecycle.new_value_ph', 'e.g. Senior Developer')} value={eventForm.new_value} onChange={e => setEventForm({ ...eventForm, new_value: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <Label>{t('lifecycle.effective', 'Effective')}</Label>
                                <Input type="date" value={eventForm.effective_date} onChange={e => setEventForm({ ...eventForm, effective_date: e.target.value })} />
                            </div>
                            <div>
                                <Label>{t('lifecycle.notes', 'Notes')}</Label>
                                <Input value={eventForm.notes} onChange={e => setEventForm({ ...eventForm, notes: e.target.value })} />
                            </div>
                            {(eventForm.type === 'promotion' || eventForm.type === 'transfer') && (
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={eventForm.apply_to_employee}
                                        onChange={e => setEventForm({ ...eventForm, apply_to_employee: e.target.checked })} />
                                    {t('lifecycle.apply_to_employee', 'Also update the employee record (job title / department)')}
                                </label>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEventForm(null)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={saveEvent} disabled={!eventForm?.employee_id || !eventForm?.effective_date}>{t('common.save', 'Save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Start Offboarding Dialog ---------- */}
            <Dialog open={!!offboardForm} onOpenChange={(open) => !open && setOffboardForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('lifecycle.start_offboarding', 'Start Offboarding')}</DialogTitle>
                    </DialogHeader>
                    {offboardForm && (
                        <div className="space-y-3 py-2">
                            <div>
                                <Label>{t('lifecycle.employee', 'Employee')}</Label>
                                <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                    value={offboardForm.employee_id}
                                    onChange={e => setOffboardForm({ ...offboardForm, employee_id: e.target.value })}>
                                    <option value="">—</option>
                                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name ?? `${emp.first_name} ${emp.last_name}`}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('lifecycle.resigned', 'Resigned')}</Label>
                                    <Input type="date" value={offboardForm.resignation_date} onChange={e => setOffboardForm({ ...offboardForm, resignation_date: e.target.value })} />
                                </div>
                                <div>
                                    <Label>{t('lifecycle.last_day', 'Last day')}</Label>
                                    <Input type="date" value={offboardForm.last_working_day} onChange={e => setOffboardForm({ ...offboardForm, last_working_day: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <Label>{t('lifecycle.reason', 'Reason')}</Label>
                                <Input value={offboardForm.reason} onChange={e => setOffboardForm({ ...offboardForm, reason: e.target.value })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOffboardForm(null)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={saveOffboarding} disabled={!offboardForm?.employee_id || !offboardForm?.resignation_date || !offboardForm?.last_working_day}>
                            {t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Manage Offboarding Dialog ---------- */}
            <Dialog open={!!activeOffboarding} onOpenChange={(open) => !open && setActiveOffboarding(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DoorOpen className="h-5 w-5 text-red-500" />
                            {activeOffboarding?.employee?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {activeOffboarding && (
                        <div className="space-y-4 py-2">
                            <div className="text-sm text-muted-foreground">
                                {t('lifecycle.last_day', 'Last day')}: <span className="font-medium text-foreground">{fmt(activeOffboarding.last_working_day)}</span>
                                {activeOffboarding.reason && <> · {activeOffboarding.reason}</>}
                            </div>
                            <div className="space-y-2">
                                {(activeOffboarding.checklist ?? []).map((item: any) => (
                                    <label key={item.key} className="flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(activeOffboarding, item.key)} />
                                        <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                                        {item.done && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
                                    </label>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                {activeOffboarding.status !== 'completed' && (
                                    <>
                                        {activeOffboarding.status === 'pending' && (
                                            <Button size="sm" variant="outline" onClick={() => updateOffboarding(activeOffboarding.id, { status: 'in_progress' })}>
                                                {t('lifecycle.mark_in_progress', 'Mark In Progress')}
                                            </Button>
                                        )}
                                        <Button size="sm" onClick={() => updateOffboarding(activeOffboarding.id, { status: 'completed' })}
                                            disabled={checklistProgress(activeOffboarding) < 100}>
                                            {t('lifecycle.complete', 'Complete Offboarding')}
                                        </Button>
                                    </>
                                )}
                                {activeOffboarding.status === 'completed' && (
                                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" /> {t('lifecycle.completed', 'Completed')} {activeOffboarding.completed_at ? `· ${fmt(activeOffboarding.completed_at)}` : ''}
                                    </span>
                                )}
                            </div>
                            {checklistProgress(activeOffboarding) < 100 && activeOffboarding.status !== 'completed' && (
                                <p className="text-[11px] text-muted-foreground">{t('lifecycle.complete_hint', 'All checklist items must be done before completing.')}</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
