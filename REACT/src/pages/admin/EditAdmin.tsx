import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { toast } from 'sonner';

export default function EditAdmin() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Admin',
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await api.get(`/users/${id}`);
                const data = response.data.data;
                setFormData({
                    name: data.name,
                    email: data.email ? data.email.replace('@gmail.com', '') : '',
                    password: '', // Don't populate password
                    role: data.roles?.[0]?.name || 'Admin',
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const submitData = { ...formData };
            if (!submitData.email.includes('@')) {
                submitData.email = `${submitData.email}@gmail.com`;
            }
            await api.put(`/users/${id}`, submitData);
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
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Edit Administrator</h2>
                    <p className="text-sm text-slate-500 mt-1">Update system access credentials and roles.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input name="name" value={formData.name} required onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <div className="flex rounded-md">
                        <Input name="email" type="text" value={formData.email} required onChange={handleChange} className="rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="username" />
                        <div className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-sm">
                            @gmail.com
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Password (Leave blank to keep current)</label>
                    <Input name="password" type="password" onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select
                        name="role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={handleChange}
                        value={formData.role}
                    >
                        <option value="Admin">Admin</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Employee">Employee</option>
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
