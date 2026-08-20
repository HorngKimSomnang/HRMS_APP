import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CreateAdmin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        user_id: '',
        name: '',
        email: '',
        role: '',
    });

    useEffect(() => {
        api.get('/users?all=1')
            .then((response) => setUsers(response.data.data))
            .catch(() => toast.error('Failed to load users'))
            .finally(() => setFetchingUsers(false));
    }, []);

    const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = users.find((item) => item.id === Number(e.target.value));
        setFormData({
            user_id: e.target.value,
            name: selected?.name || '',
            email: selected?.email || '',
            role: selected?.roles?.[0]?.name || 'Employee',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/users', {
                user_id: Number(formData.user_id),
                role: formData.role,
            });
            toast.success(response.data.message || 'User role updated successfully');
            navigate('/admins');
        } catch (error: any) {
            console.error('Failed to create user', error);
            toast.error(error.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-4">
            <div className="bg-gradient-to-br from-violet-50/40 via-white to-white rounded-2xl shadow-sm border border-violet-100 p-6 sm:p-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Add Administrator</h2>
                    <p className="text-sm text-slate-500 mt-1">Select an existing employee and assign their system role.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <select
                        name="user_id"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.user_id}
                        onChange={handleUserSelect}
                        disabled={fetchingUsers}
                        required
                    >
                        <option value="" disabled>
                            {fetchingUsers ? 'Loading users...' : 'Select employee email...'}
                        </option>
                        {users.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.email}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Employee Name</label>
                    <Input
                        name="name"
                        value={formData.name}
                        readOnly
                        className="bg-slate-50"
                        placeholder="Automatically filled from selected email"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select
                        name="role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        value={formData.role}
                        required
                    >
                        <option value="" disabled>Select Role...</option>
                        <option value="Employee">Employee</option>
                        <option value="Admin">Admin</option>
                        <option value="Super Admin">Super Admin</option>
                    </select>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/admins')}>Cancel</Button>
                    <Button type="submit" disabled={loading || !formData.user_id}>
                        {loading ? 'Saving...' : 'Assign Role'}
                    </Button>
                </div>
            </form>
            </div>
        </div>
    );
}
