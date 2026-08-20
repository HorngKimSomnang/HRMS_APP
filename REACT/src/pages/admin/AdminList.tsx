import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Edit, Trash2, Search, ShieldCheck, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

export default function AdminList() {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewAdmin, setViewAdmin] = useState<any | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    useLiveRefresh(fetchUsers, { resources: ['users', 'profile'] });

    const confirmDelete = async () => {
        if (!deleteId) return;
        const id = deleteId;
        const previousUsers = users;
        setUsers(current => current.filter(item => item.id !== id));
        setDeleteId(null);

        try {
            await api.delete(`/users/${id}`);
        } catch (error: any) {
            setUsers(previousUsers);
            console.error('Failed to delete user', error);
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-gray-900 to-zinc-950 p-8 text-white shadow-xl mb-6">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">System Administrators</h1>
                    <p className="text-slate-200 mt-2 text-sm font-medium">Manage system access and administrator accounts.</p>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search administrators..."
                        className="pl-9 bg-card"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Link to="/admins/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Administrator
                    </Button>
                </Link>
            </div>

            <div className="rounded-lg border border-violet-100 bg-gradient-to-br from-violet-50/50 via-card to-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[300px]">User</TableHead>
                            <TableHead>Roles</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">Loading users...</TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                    No users found matching "{search}".
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((rowUser) => (
                                <TableRow key={rowUser.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {rowUser.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{rowUser.name}</div>
                                                <div className="text-xs text-muted-foreground">{rowUser.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {rowUser.roles && rowUser.roles.map((r: any) => (
                                                <span key={r.id} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${r.name === 'Super Admin'
                                                    ? 'bg-purple-50 text-purple-700 ring-purple-700/10'
                                                    : r.name === 'Admin'
                                                        ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                        : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                                                    }`}>
                                                    {r.name === 'Super Admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                                                    {r.name}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                            Active
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Logic: 
                                                - Super Admin can edit/delete anyone.
                                                - Admin can edit/delete other Admins/Employees, but NOT Super Admins.
                                                - Cannot delete self (button disabled).
                                             */}
                                            {(!user?.roles?.some((r: any) => r.name === 'Super Admin') &&
                                                rowUser.roles?.some((r: any) => r.name === 'Super Admin')) ? (
                                                <span className="text-xs text-muted-foreground italic mr-2">Protected</span>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setViewAdmin(rowUser)}
                                                        title="View User"
                                                    >
                                                        <Eye className="h-4 w-4 text-slate-500" />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => navigate(`/admins/edit/${rowUser.id}`)}
                                                        title="Edit User"
                                                    >
                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:bg-red-50 disabled:opacity-50"
                                                        onClick={() => setDeleteId(rowUser.id)}
                                                        disabled={user?.id === rowUser.id}
                                                        title={user?.id === rowUser.id ? "Cannot delete yourself" : "Delete User"}
                                                    >
                                                        <Trash2 className={`h-4 w-4 ${user?.id === rowUser.id ? "text-gray-400" : "text-red-500"}`} />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* View Modal */}
            <Dialog open={!!viewAdmin} onOpenChange={(open) => !open && setViewAdmin(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Administrator Details</DialogTitle>
                    </DialogHeader>
                    {viewAdmin && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="font-semibold text-muted-foreground">Name:</div>
                                <div className="col-span-2">{viewAdmin.name}</div>
                                
                                <div className="font-semibold text-muted-foreground">Email:</div>
                                <div className="col-span-2">{viewAdmin.email}</div>
                                
                                <div className="font-semibold text-muted-foreground">Roles:</div>
                                <div className="col-span-2 flex flex-wrap gap-1">
                                    {viewAdmin.roles?.map((r: any) => (
                                        <span key={r.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                                            {r.name}
                                        </span>
                                    ))}
                                </div>
                                
                                <div className="font-semibold text-muted-foreground">Status:</div>
                                <div className="col-span-2">Active</div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewAdmin(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Administrator
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this administrator? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete User</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
