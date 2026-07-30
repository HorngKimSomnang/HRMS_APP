import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';
import { toast } from 'sonner';

export default function CreateAdmin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/users', formData);
            toast.success(response.data.message || 'Administrator created successfully');
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
                    <p className="text-sm text-slate-500 mt-1">Create a new system access account and assign roles.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Employee Name</label>
                    <Input
                        name="name"
                        value={formData.name}
                        required
                        autoComplete="off"
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        required
                        autoComplete="off"
                        onChange={handleChange}
                        placeholder="name@example.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select
                        name="role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={handleChange}
                        value={formData.role}
                        required
                    >
                        <option value="" disabled>Select Role...</option>
                        <option value="Admin">Admin</option>
                        <option value="Super Admin">Super Admin</option>
                    </select>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/admins')}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Administrator'}
                    </Button>
                </div>
            </form>
            </div>
        </div>
    );
}
