import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface UploadDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Employee {
    id: number;
    name: string;
}

export default function UploadDocumentModal({ isOpen, onClose, onSuccess }: UploadDocumentModalProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [formData, setFormData] = useState({
        employee_id: '',
        name: '',
        type: '',
        file: null as File | null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
        }
    }, [isOpen]);

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees?status=active&all=true');
            setEmployees(response.data.data);
        } catch (err) {
            console.error("Failed to fetch employees", err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, file: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!formData.employee_id || !formData.name || !formData.file) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        const data = new FormData();
        data.append('employee_id', formData.employee_id);
        data.append('name', formData.name);
        data.append('type', formData.type);
        data.append('file', formData.file);

        try {
            await api.post('/documents', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to upload document');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Upload Document</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Employee</label>
                        <select
                            name="employee_id"
                            value={formData.employee_id}
                            onChange={handleChange}
                            className="w-full rounded-md border p-2"
                            required
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Document Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full rounded-md border p-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description / Instructions</label>
                        <textarea
                            name="type"
                            value={formData.type}
                            onChange={handleChange as any}
                            className="w-full rounded-md border p-2"
                            rows={3}
                            placeholder="Brief instructions for the employee..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">File</label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="w-full"
                            accept=".pdf,.doc,.docx,.jpg,.png"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
