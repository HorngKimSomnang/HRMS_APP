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
import { Plus, CheckCircle2, Clock, AlertCircle, Calendar, Paperclip, FileCheck, X, AlertTriangle, Download, Eye, Trash2 } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getStorageUrl, getDownloadUrl } from "@/core/config";

export default function TaskList() {
    const { user } = useAuth();
    const isAdmin = user?.roles?.some((r: any) => r.name !== 'Employee');

    const [tasks, setTasks] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewTask, setViewTask] = useState<any>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

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
            const res = await api.get('/tasks');
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
            const res = await api.get('/employees');
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
        
        // Auto-refresh tasks every 10 seconds
        const interval = setInterval(() => {
            fetchTasks();
        }, 10000);
        
        return () => clearInterval(interval);
    }, [isAdmin, fetchTasks, fetchEmployees]);

    const resetForm = () => {
        setNewTask({ title: "", description: "", assigned_to: [], priority: "medium", due_date: "" });
        setSelectedFile(null);
        setFormError(null);
        setFieldErrors({});
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!newTask.title.trim()) errors.title = "Title is required.";
        if (newTask.assigned_to.length === 0) errors.assigned_to = "Please select at least one employee.";
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
            newTask.assigned_to.forEach(empId => formData.append('assigned_to[]', empId));
            formData.append('priority', newTask.priority);
            formData.append('due_date', newTask.due_date);
            if (selectedFile) {
                formData.append('attachment', selectedFile);
            }

            const res = await api.post('/tasks', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const createdTasks = res.data.data;
            if (Array.isArray(createdTasks)) {
                setTasks([...createdTasks, ...tasks]);
            } else {
                setTasks([createdTasks, ...tasks]);
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

    const updateStatus = async (id: number, status: string) => {
        try {
            await api.put(`/tasks/${id}`, { status });
            setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
        } catch (error) {
            console.error("Failed to update status", error);
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Task Management</h1>
                    <p className="text-muted-foreground">Assign and track employee tasks.</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> New Task
                    </Button>
                )}
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden mt-6">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="pl-6">Task Details</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-32 text-muted-foreground">No tasks found.</TableCell></TableRow>
                        ) : (
                            tasks.map((task: any) => (
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
                                                    {task.employee.first_name[0]}{task.employee.last_name?.[0] || ''}
                                                </div>
                                                <span className="text-sm font-medium">{task.employee.first_name} {task.employee.last_name}</span>
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
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setViewTask(task)} title="View Details">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {isAdmin && (
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
                                            ? `${viewTask.employee.first_name} ${viewTask.employee.last_name}`
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

                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewTask(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Task Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsCreateOpen(open); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
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
                                <div className={`flex flex-col border rounded-md bg-background overflow-y-auto h-32 p-2 space-y-1 ${
                                    fieldErrors.assigned_to ? "border-red-400" : "border-input"
                                }`}>
                                    {employees.length === 0 ? (
                                        <p className="text-xs text-amber-600 p-2">No employees found.</p>
                                    ) : (
                                        employees.map(e => {
                                            const isChecked = newTask.assigned_to.includes(e.id.toString());
                                            return (
                                                <label key={e.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={isChecked}
                                                        onChange={(event) => {
                                                            const strId = e.id.toString();
                                                            let newAssigned = [...newTask.assigned_to];
                                                            if (event.target.checked) {
                                                                newAssigned.push(strId);
                                                            } else {
                                                                newAssigned = newAssigned.filter(id => id !== strId);
                                                            }
                                                            setNewTask({ ...newTask, assigned_to: newAssigned });
                                                            setFieldErrors(p => ({ ...p, assigned_to: '' }));
                                                        }}
                                                    />
                                                    <span className="text-sm">{e.first_name} {e.last_name}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
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
                            {isSubmitting ? "Creating..." : "Create Task"}
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


