import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, Clock, AlertCircle, Calendar, Paperclip, FileCheck, X, AlertTriangle, Download, Eye, Trash2, Edit } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getStorageUrl, getDownloadUrl } from "@/core/config";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

export default function TaskList() {
    const { user, hasPermission } = useAuth();
    const isAdmin = user?.roles?.some((r: any) => r.name !== 'Employee');

    const [tasks, setTasks] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewTask, setViewTask] = useState<any>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
    const [editTaskId, setEditTaskId] = useState<number | null>(null);
    const [taskView, setTaskView] = useState<'active' | 'completed'>('active');

    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        assigned_to: [] as string[],
        priority: "medium",
        due_date: ""
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await api.get('/tasks?all=true');
            const payload = res.data.data;
            if (Array.isArray(payload)) {
                setTasks(payload);
            } else if (payload?.data && Array.isArray(payload.data)) {
                setTasks(payload.data);
            } else {
                setTasks([]);
            }
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        }
    }, []);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await api.get('/employees?status=active&all=true');
            const data = res.data.data;
            setEmployees(Array.isArray(data) ? data : (data?.data || []));
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
        if (isAdmin) {
            fetchEmployees();
        }
    }, [isAdmin, fetchTasks, fetchEmployees]);

    useLiveRefresh(async () => {
        await fetchTasks();
        if (isAdmin) await fetchEmployees();
    }, { resources: ['tasks', 'employees'] });

    const resetForm = () => {
        setNewTask({ title: "", description: "", assigned_to: [], priority: "medium", due_date: "" });
        setSelectedFile(null);
        setFormError(null);
        setFieldErrors({});
        setEditTaskId(null);
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!newTask.title.trim()) errors.title = "Title is required.";
        if (newTask.assigned_to.length === 0) errors.assigned_to = "Please select at least one employee.";
        if (editTaskId && newTask.assigned_to.length > 1) errors.assigned_to = "Can only assign to a single employee when editing.";
        if (!newTask.due_date) errors.due_date = "Due date is required.";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = async () => {
        setFormError(null);
        setFieldErrors({});

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', newTask.title);
            formData.append('description', newTask.description);
            if (editTaskId) {
                formData.append('assigned_to', newTask.assigned_to[0]);
                formData.append('_method', 'PUT');
            } else {
                newTask.assigned_to.forEach(empId => formData.append('assigned_to[]', empId));
            }
            formData.append('priority', newTask.priority);
            formData.append('due_date', newTask.due_date);
            if (selectedFile) {
                formData.append('attachment', selectedFile);
            }

            if (editTaskId) {
                const res = await api.post(`/tasks/${editTaskId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                const updatedTask = res.data.data;
                setTasks(tasks.map(t => t.id === editTaskId ? updatedTask : t));
            } else {
                const res = await api.post('/tasks', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                const createdTasks = res.data.data;
                if (Array.isArray(createdTasks)) {
                    setTasks([...createdTasks, ...tasks]);
                } else {
                    setTasks([createdTasks, ...tasks]);
                }
            }
            setIsCreateOpen(false);
            resetForm();
        } catch (error: any) {
            if (error.response?.status === 422) {
                const laravelErrors = error.response.data?.errors;
                if (laravelErrors) {
                    const mapped: Record<string, string> = {};
                    for (const [key, msgs] of Object.entries(laravelErrors)) {
                        mapped[key] = (msgs as string[])[0];
                    }
                    setFieldErrors(mapped);
                    setFormError("Please fix the errors below before submitting.");
                } else {
                    setFormError(error.response.data?.message || "Validation failed.");
                }
            } else if (error.response?.data?.message) {
                setFormError(error.response.data.message);
            } else {
                setFormError("Failed to create task. Please check your connection and try again.");
            }
            console.error("Create task error:", error.response?.data ?? error.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    const confirmDelete = async () => {
        if (!taskToDelete) return;
        try {
            await api.delete(`/tasks/${taskToDelete}`);
            setTasks(tasks.filter(t => t.id !== taskToDelete));
            setTaskToDelete(null);
        } catch (error) {
            console.error("Failed to delete task", error);
        }
    };

    const activeTasks = tasks.filter((task) => task.status !== 'completed');
    const completedTasks = tasks.filter((task) => task.status === 'completed');
    const visibleTasks = taskView === 'active' ? activeTasks : completedTasks;

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-8 text-white shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">Task Management</h1>
                    <p className="text-orange-50 mt-2 text-sm font-medium">Assign and track employee tasks.</p>
                </div>
                {isAdmin && (
                    <div className="relative z-10 flex gap-2">
                        {hasPermission('tasks.create') && (
                            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm">
                                <Plus className="mr-2 h-4 w-4" /> New Task
                            </Button>
                        )}
                    </div>
                )}
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            </div>

            <div className="flex w-fit items-center gap-1 rounded-xl border bg-muted/40 p-1">
                <button
                    type="button"
                    onClick={() => setTaskView('active')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        taskView === 'active'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Active Tasks
                    <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {activeTasks.length}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setTaskView('completed')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        taskView === 'completed'
                            ? 'bg-white text-green-700 shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Completed Tasks
                    <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                        {completedTasks.length}
                    </span>
                </button>
            </div>

            <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/50 via-card to-card shadow-sm overflow-hidden mt-6">
                <div className="border-b px-6 py-4">
                    <h2 className="font-semibold">
                        {taskView === 'active' ? 'Active Tasks' : 'Completed Tasks'}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {taskView === 'active'
                            ? 'Pending and in-progress assignments.'
                            : 'Finished assignments and employee submissions.'}
                    </p>
                </div>
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="pl-6">Task Details</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                    {taskView === 'active' ? 'No active tasks found.' : 'No completed tasks found.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleTasks.map((task: any) => (
                                <TableRow key={task.id} className="hover:bg-muted/50">
                                    <TableCell className="pl-6">
                                        <div className="font-medium text-base mb-1">{task.title}</div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" /> Due: {task.due_date}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {task.employee ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                                    {task.employee.last_name[0]}{task.employee.first_name?.[0] || ''}
                                                </div>
                                                <span className="text-sm font-medium">{task.employee.last_name} {task.employee.first_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic text-sm">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${
                                            task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                            task.priority === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                            'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>
                                            {task.priority}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`flex w-fit items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${
                                            task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                            task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {task.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : 
                                             task.status === 'in_progress' ? <AlertCircle className="h-3.5 w-3.5" /> : 
                                             <Clock className="h-3.5 w-3.5" />}
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100" disabled={!hasPermission('tasks.view')} onClick={() => setViewTask(task)} title={!hasPermission('tasks.view') ? 'No permission' : 'View Details'}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {isAdmin && hasPermission('tasks.edit') && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => {
                                                    setNewTask({
                                                        title: task.title,
                                                        description: task.description || "",
                                                        assigned_to: task.employee ? [task.employee.id.toString()] : [],
                                                        priority: task.priority,
                                                        due_date: task.due_date
                                                    });
                                                    setEditTaskId(task.id);
                                                    setIsCreateOpen(true);
                                                }} title="Edit Task">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {isAdmin && hasPermission('tasks.delete') && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setTaskToDelete(task.id)} title="Delete Task">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* View Task Dialog */}
            <Dialog open={!!viewTask} onOpenChange={() => setViewTask(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Task Details
                        </DialogTitle>
                    </DialogHeader>
                    {viewTask && (
                        <div className="space-y-4 py-2">
                            <div>
                                <h3 className="font-semibold text-lg">{viewTask.title}</h3>
                                <div className="flex gap-2 mt-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${
                                        viewTask.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                        viewTask.priority === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                        {viewTask.priority} Priority
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold border bg-gray-50 text-gray-600 border-gray-200">
                                        {viewTask.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-muted/30 p-3 rounded-md text-sm text-foreground/80 whitespace-pre-wrap">
                                {viewTask.description || <span className="italic opacity-50">No description provided</span>}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mt-4 p-3 border rounded-lg bg-white">
                                <div>
                                    <span className="text-muted-foreground block text-xs mb-1">Due Date</span>
                                    <div className="flex items-center gap-1 font-medium">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        {viewTask.due_date}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs mb-1">Assigned To</span>
                                    <div className="font-medium">
                                        {viewTask.employee
                                            ? `${viewTask.employee.last_name} ${viewTask.employee.first_name}`
                                            : 'Unassigned'}
                                    </div>
                                </div>
                            </div>

                            {/* Attachments Section — always visible */}
                            <div className="mt-2 pt-4 border-t space-y-2">
                                <h4 className="text-sm font-semibold text-muted-foreground">Attachments</h4>

                                {/* Admin Instruction File */}
                                {viewTask.attachment_path ? (
                                    <a
                                        href={getStorageUrl(viewTask.attachment_path)}
                                        target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 p-2.5 rounded-md border border-blue-100 bg-blue-50/60 hover:bg-blue-50 transition-colors text-sm text-blue-700 font-medium"
                                    >
                                        <Paperclip className="h-4 w-4 shrink-0" />
                                        <span>View Admin Instructions</span>
                                        <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">File</span>
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-2 p-2.5 rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                                        <Paperclip className="h-4 w-4 shrink-0" />
                                        <span>No instruction file attached</span>
                                    </div>
                                )}

                                {/* Employee Submission */}
                                {viewTask.submission_path ? (
                                    <div className="flex gap-2">
                                        <a
                                            href={getStorageUrl(viewTask.submission_path)}
                                            target="_blank" rel="noreferrer"
                                            className="flex-1 flex items-center gap-2 p-2.5 rounded-md border border-green-200 bg-green-50/60 hover:bg-green-50 transition-colors text-sm text-green-700 font-medium"
                                        >
                                            <FileCheck className="h-4 w-4 shrink-0" />
                                            <span>View Employee Submission</span>
                                            <span className="ml-auto text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-bold uppercase">Proof</span>
                                        </a>
                                        <a
                                            href={getDownloadUrl(viewTask.submission_path)}
                                            className="flex items-center justify-center px-4 rounded-md border border-green-200 bg-green-100 hover:bg-green-200 transition-colors text-green-700 font-medium"
                                            title="Store to Computer"
                                        >
                                            <Download className="h-5 w-5" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className={`flex items-center gap-2 p-2.5 rounded-md border text-sm ${
                                        viewTask.status === 'completed'
                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                            : 'border-dashed border-gray-200 bg-gray-50 text-gray-400'
                                    }`}>
                                        <FileCheck className="h-4 w-4 shrink-0" />
                                        <span>
                                            {viewTask.status === 'completed'
                                                ? 'Employee completed without uploading proof'
                                                : 'No submission yet'}
                                        </span>
                                        {viewTask.status === 'completed' && (
                                            <span className="ml-auto text-[10px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">None</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Employee Note */}
                            {viewTask.submission_note && (
                                <div className="mt-2 pt-4 border-t">
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Employee Remarks</h4>
                                    <div className="bg-green-50/50 border border-green-100 p-3 rounded-md text-sm text-green-900 whitespace-pre-wrap">
                                        {viewTask.submission_note}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewTask(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create / Edit Task Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsCreateOpen(open); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editTaskId ? "Edit Task" : "Create New Task"}</DialogTitle>
                    </DialogHeader>

                    {/* Global error banner */}
                    {formError && (
                        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="flex-1">{formError}</span>
                            <button onClick={() => setFormError(null)}>
                                <X className="h-4 w-4 opacity-60 hover:opacity-100" />
                            </button>
                        </div>
                    )}

                    <div className="space-y-4 py-2">
                        {/* Title */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={newTask.title}
                                onChange={(e) => {
                                    setNewTask({ ...newTask, title: e.target.value });
                                    setFieldErrors(p => ({ ...p, title: '' }));
                                }}
                                placeholder="Task title"
                                className={fieldErrors.title ? "border-red-400 focus-visible:ring-red-300" : ""}
                            />
                            {fieldErrors.title && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> {fieldErrors.title}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Describe what needs to be done..."
                                rows={3}
                            />
                        </div>

                        {/* Assign To + Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">
                                    Assign To <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                                        fieldErrors.assigned_to ? "border-red-400 focus:ring-red-400" : "border-input focus:border-blue-500"
                                    }`}
                                    value={newTask.assigned_to[0] || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewTask({ ...newTask, assigned_to: val ? [val] : [] });
                                        setFieldErrors(p => ({ ...p, assigned_to: '' }));
                                    }}
                                >
                                    <option value="" disabled>Select an employee</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id.toString()}>
                                            {e.first_name} {e.last_name}
                                        </option>
                                    ))}
                                </select>
                                {fieldErrors.assigned_to && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> {fieldErrors.assigned_to}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Priority</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">
                                Due Date <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                value={newTask.due_date}
                                onChange={(e) => {
                                    setNewTask({ ...newTask, due_date: e.target.value });
                                    setFieldErrors(p => ({ ...p, due_date: '' }));
                                }}
                                className={fieldErrors.due_date ? "border-red-400 focus-visible:ring-red-300" : ""}
                                min={new Date().toISOString().split('T')[0]}
                            />
                            {fieldErrors.due_date && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> {fieldErrors.due_date}
                                </p>
                            )}
                        </div>

                        {/* Attachment */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium">
                                Instruction File / Photo <span className="text-muted-foreground text-xs">(Optional)</span>
                            </label>
                            <Input
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                accept="image/*,.pdf,.doc,.docx"
                            />
                            {selectedFile && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" /> {selectedFile.name}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => { setIsCreateOpen(false); resetForm(); }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={isSubmitting}>
                            {isSubmitting ? (editTaskId ? "Saving..." : "Creating...") : (editTaskId ? "Save Changes" : "Create Task")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={taskToDelete !== null} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Permanent Deletion
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-slate-700">
                            Are you absolutely sure you want to delete this task?
                        </p>
                        <p className="text-red-600 text-sm mt-2 font-medium bg-red-50 p-2 rounded-md border border-red-100">
                            This will permanently erase the task and any submitted photos or videos from the server. You cannot undo this action.
                        </p>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setTaskToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Yes, Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
