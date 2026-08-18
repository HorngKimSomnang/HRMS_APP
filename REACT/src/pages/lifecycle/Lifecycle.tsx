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
import { FileSignature, History, Plus, Trash2, Edit, Eye, CheckCircle, DoorOpen, CheckCircle2 } from "lucide-react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useAuth } from "@/context/AuthContext";

type Tab = 'contracts' | 'history' | 'offboarding';

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
};

export default function Lifecycle() {
    const { t } = useTranslation();
    const { hasPermission, user } = useAuth();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [tab, setTab] = useState<Tab>(
        tabParam === 'history' || tabParam === 'offboarding' ? tabParam : 'contracts'
    );
    
    const [employees, setEmployees] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [offboardings, setOffboardings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [contractForm, setContractForm] = useState<any | null>(null);
    const [viewContract, setViewContract] = useState<any | null>(null);
    const [offboardForm, setOffboardForm] = useState<any | null>(null);
    const [activeOffboarding, setActiveOffboarding] = useState<any | null>(null);
    const [offboardingToDelete, setOffboardingToDelete] = useState<any | null>(null);

    const loadAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [c, o] = await Promise.all([
                api.get('/lifecycle/contracts'),
                api.get('/lifecycle/offboardings')
            ]);
            setContracts(c.data.data ?? []);
            setOffboardings(o.data.data ?? []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load contracts data");
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

    const saveContract = async () => {
        try {
            if (contractForm.id) {
                await api.put(`/lifecycle/contracts/${contractForm.id}`, contractForm);
            } else {
                await api.post('/lifecycle/contracts', contractForm);
            }
            toast.success(t('common.saved', 'Saved successfully'));
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
            toast.success("Contract deleted");
        } catch { toast.error("Failed to delete"); }
    };

    const activateContract = async (c: any) => {
        try {
            await api.put(`/lifecycle/contracts/${c.id}`, { ...c, status: 'active' });
            toast.success("Contract activated");
            loadAll();
        } catch { toast.error("Failed to activate contract"); }
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
        { key: 'contracts', label: t('nav.contracts', 'Contracts'), icon: FileSignature },
        { key: 'history', label: t('nav.contract_history', 'Contract History'), icon: History },
        { key: 'offboarding', label: t('nav.offboarding', 'Offboarding'), icon: DoorOpen },
    ];

    const activeContracts = contracts.filter(c => c.status === 'active' || c.status === 'pending');
    const historyContracts = contracts.filter(c => c.status === 'expired' || c.status === 'terminated');

    const renderTable = (data: any[], showActivate: boolean) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('common.employee', 'Employee')}</TableHead>
                    <TableHead>{t('common.type', 'Type')}</TableHead>
                    <TableHead>{t('common.start_date', 'Start Date')}</TableHead>
                    <TableHead>{t('common.end_date', 'End Date')}</TableHead>
                    <TableHead>{t('common.status', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('common.no_data', 'No contracts found.')}</TableCell></TableRow>
                )}
                {data.map(c => (
                    <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.employee?.name}</TableCell>
                        <TableCell>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${contractTypeBadge[c.type]}`}>
                                {c.type.replace('_', ' ')}
                            </span>
                        </TableCell>
                        <TableCell>{fmt(c.start_date)}</TableCell>
                        <TableCell>{fmt(c.end_date)}</TableCell>
                        <TableCell>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${statusBadge[c.status]}`}>
                                {c.status}
                            </span>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                            {showActivate && c.status === 'pending' && (
                                <Button variant="ghost" size="icon" onClick={() => activateContract(c)} disabled={!hasPermission('contracts.auto_activate')} title={!hasPermission('contracts.auto_activate') ? 'No permission' : 'Activate Contract'}>
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setViewContract(c)} disabled={!hasPermission('contracts.view')} title={!hasPermission('contracts.view') ? 'No permission' : 'View'}>
                                <Eye className="w-4 h-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setContractForm({ ...c, start_date: c.start_date?.slice(0, 10), end_date: c.end_date?.slice(0, 10) ?? '' })} disabled={!hasPermission('contracts.edit')} title={!hasPermission('contracts.edit') ? 'No permission' : 'Edit'}>
                                <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteContract(c.id)} disabled={!hasPermission('contracts.delete')} title={!hasPermission('contracts.delete') ? 'No permission' : 'Delete'}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 p-8 text-white shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">{t('nav.contract', 'Contract')}</h1>
                    <p className="text-violet-100 mt-2 text-sm font-medium">Manage active contracts and view contract history.</p>
                </div>
                {/* Action button in cover */}
                <div className="relative z-10 flex-shrink-0">
                    {tab === 'contracts' && hasPermission('contracts.create') && (
                        <Button
                            size="sm"
                            className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shadow-md"
                            onClick={() => setContractForm({ employee_id: '', type: 'probation', start_date: '', end_date: '', notes: '', status: 'pending' })}
                        >
                            <Plus className="h-4 w-4 mr-1" /> New Contract
                        </Button>
                    )}
                    {tab === 'offboarding' && hasPermission('employees.delete') && (
                        <Button
                            size="sm"
                            className="bg-white text-red-600 hover:bg-red-50 font-semibold shadow-md"
                            onClick={() => setOffboardForm({ employee_id: '', resignation_date: '', last_working_day: '', reason: '' })}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Start Offboarding
                        </Button>
                    )}
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            </div>

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
                    {tab === 'contracts' && (
                        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/40 via-card to-card shadow-sm">
                            <div className="p-4 border-b">
                                <h3 className="text-[15px] font-semibold">{t('nav.contracts', 'Contracts')}</h3>
                            </div>
                            {renderTable(activeContracts, true)}
                        </div>
                    )}

                    {tab === 'history' && (
                        <div className="rounded-xl border border-slate-200 bg-card shadow-sm">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-[15px] font-semibold">{t('nav.contract_history', 'Contract History')}</h3>
                            </div>
                            {renderTable(historyContracts, false)}
                        </div>
                    )}

                    {tab === 'offboarding' && (
                        <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50/40 via-card to-card shadow-sm">
                            <div className="p-4 border-b">
                                <h3 className="text-[15px] font-semibold">{t('nav.offboarding', 'Offboarding')}</h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.employee', 'Employee')}</TableHead>
                                        <TableHead>Resigned</TableHead>
                                        <TableHead>Last day</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {offboardings.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('common.no_data', 'No offboardings found.')}</TableCell></TableRow>
                                    )}
                                    {offboardings.map(o => (
                                        <TableRow key={o.id}>
                                            <TableCell className="font-medium">{o.employee?.name}</TableCell>
                                            <TableCell>{fmt(o.resignation_date)}</TableCell>
                                            <TableCell>{fmt(o.last_working_day)}</TableCell>
                                            <TableCell>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${statusBadge[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status.replace('_', ' ')}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-50" onClick={() => setActiveOffboarding({ ...o, isView: true })}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => setActiveOffboarding(o)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setOffboardingToDelete(o)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </>
            )}

            {/* ---------- Contract Form Dialog ---------- */}
            <Dialog open={!!contractForm} onOpenChange={(open) => !open && setContractForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{contractForm?.id ? t('common.edit', 'Edit') : 'New Contract'}</DialogTitle>
                    </DialogHeader>
                    {contractForm && (
                        <div className="space-y-3 py-2">
                            {!contractForm.id && (
                                <div>
                                    <Label>Employee</Label>
                                    <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                        value={contractForm.employee_id}
                                        onChange={e => setContractForm({ ...contractForm, employee_id: e.target.value })}>
                                        <option value="">—</option>
                                        {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name ?? `${emp.first_name} ${emp.last_name}`}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <Label>Type</Label>
                                <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                    value={contractForm.type}
                                    onChange={e => setContractForm({ ...contractForm, type: e.target.value })}>
                                    <option value="probation">Probation</option>
                                    <option value="fixed_term">Fixed term</option>
                                    <option value="permanent">Permanent</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Start</Label>
                                    <Input type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <Label>End</Label>
                                    <Input type="date" value={contractForm.end_date ?? ''} onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })} />
                                </div>
                            </div>
                            {contractForm.id && (
                                <div>
                                    <Label>Status</Label>
                                    <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                        value={contractForm.status}
                                        onChange={e => setContractForm({ ...contractForm, status: e.target.value })}>
                                        <option value="pending">Pending</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                        <option value="terminated">Terminated</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <Label>Notes</Label>
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

            {/* ---------- View Contract Dialog ---------- */}
            <Dialog open={!!viewContract} onOpenChange={(open) => !open && setViewContract(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Contract Details</DialogTitle>
                    </DialogHeader>
                    {viewContract && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Employee</Label>
                                    <div className="font-medium">{viewContract.employee?.name}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="font-medium capitalize">{viewContract.status}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Type</Label>
                                    <div className="font-medium capitalize">{viewContract.type.replace('_', ' ')}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Notes</Label>
                                    <div className="font-medium">{viewContract.notes || '—'}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Start Date</Label>
                                    <div className="font-medium">{fmt(viewContract.start_date)}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">End Date</Label>
                                    <div className="font-medium">{fmt(viewContract.end_date)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewContract(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Start Offboarding Dialog ---------- */}
            <Dialog open={!!offboardForm} onOpenChange={(open) => !open && setOffboardForm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Start Offboarding</DialogTitle>
                    </DialogHeader>
                    {offboardForm && (
                        <div className="space-y-3 py-2">
                            <div>
                                <Label>Employee</Label>
                                <select className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
                                    value={offboardForm.employee_id}
                                    onChange={e => setOffboardForm({ ...offboardForm, employee_id: e.target.value })}>
                                    <option value="">—</option>
                                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name ?? `${emp.first_name} ${emp.last_name}`}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Resigned</Label>
                                    <Input type="date" value={offboardForm.resignation_date} onChange={e => setOffboardForm({ ...offboardForm, resignation_date: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Last day</Label>
                                    <Input type="date" value={offboardForm.last_working_day} onChange={e => setOffboardForm({ ...offboardForm, last_working_day: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <Label>Reason</Label>
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
                                Last day: <span className="font-medium text-foreground">{fmt(activeOffboarding.last_working_day)}</span>
                                {activeOffboarding.reason && <> · {activeOffboarding.reason}</>}
                            </div>
                            <div className="space-y-2">
                                {(activeOffboarding.checklist ?? []).map((item: any) => (
                                    <label key={item.key} className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${activeOffboarding.isView ? 'bg-slate-50 opacity-70' : 'cursor-pointer hover:bg-slate-50'}`}>
                                        <input type="checkbox" checked={item.done} disabled={activeOffboarding.isView} onChange={() => toggleChecklistItem(activeOffboarding, item.key)} />
                                        <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                                        {item.done && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
                                    </label>
                                ))}
                            </div>
                            {!activeOffboarding.isView && (
                                <div className="flex items-center gap-2">
                                {activeOffboarding.status !== 'completed' && (
                                    <>
                                        {activeOffboarding.status === 'pending' && (
                                            <Button size="sm" variant="outline" onClick={() => updateOffboarding(activeOffboarding.id, { status: 'in_progress' })}>
                                                Mark In Progress
                                            </Button>
                                        )}
                                        <Button size="sm" onClick={() => updateOffboarding(activeOffboarding.id, { status: 'completed' })}
                                            disabled={checklistProgress(activeOffboarding) < 100}>
                                            Complete Offboarding
                                        </Button>
                                    </>
                                )}
                                {activeOffboarding.status === 'completed' && (
                                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" /> Completed {activeOffboarding.completed_at ? `· ${fmt(activeOffboarding.completed_at)}` : ''}
                                    </span>
                                )}
                                </div>
                            )}
                            {checklistProgress(activeOffboarding) < 100 && activeOffboarding.status !== 'completed' && !activeOffboarding.isView && (
                                <p className="text-[11px] text-muted-foreground">All checklist items must be done before completing.</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Offboarding Confirmation Modal */}
            <Dialog open={!!offboardingToDelete} onOpenChange={(open) => !open && setOffboardingToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Offboarding Record
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this offboarding record? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOffboardingToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => {
                            if (offboardingToDelete) {
                                api.delete(`/lifecycle/offboardings/${offboardingToDelete.id}`).then(() => {
                                    setOffboardings(current => current.filter(off => off.id !== offboardingToDelete.id));
                                    toast.success("Offboarding deleted");
                                    setOffboardingToDelete(null);
                                }).catch(() => toast.error("Failed to delete"));
                            }
                        }}>
                            Delete Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
