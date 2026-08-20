import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function EditAdmin() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [userResponse, usersResponse] = await Promise.all([
                    api.get(`/users/${id}`),
                    api.get('/users?all=1'),
                ]);
                const data = userResponse.data.data;
                setUsers(usersResponse.data.data);
                setFormData({
                    name: data.name,
                    email: data.email || '',
                    role: data.roles?.[0]?.name || '',
                });
            } catch (error) {
                console.error('Failed to load user', error);
                navigate('/admins');
            } finally {
                setFetching(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        navigate(`/admins/edit/${e.target.value}`, { replace: true });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.put(`/users/${id}`, { role: formData.role });
            const updatedUser = response.data.data;

            if (Number(id) === user?.id) {
                updateUser(updatedUser);
            }

            toast.success(response.data.message || 'User role updated successfully');
            navigate('/admins');
        } catch (error: any) {
            console.error('Failed to update user', error);
            toast.error(error.response?.data?.message || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div>Loading...</div>;

    return (
        <div className="max-w-3xl mx-auto py-4">
            <div className="bg-gradient-to-br from-violet-50/40 via-white to-white rounded-2xl shadow-sm border border-violet-100 p-6 sm:p-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Edit User Role</h2>
                    <p className="text-sm text-slate-500 mt-1">Select an existing user and change their system role.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <select
                        name="email"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={id}
                        onChange={handleUserSelect}
                        required
                    >
                        {users.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.email}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Employee Name</label>
                    <Input name="name" value={formData.name} readOnly className="bg-slate-50" />
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
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Administrator'}
                    </Button>
                </div>
            </form>
            </div>
        </div>
    );
}
