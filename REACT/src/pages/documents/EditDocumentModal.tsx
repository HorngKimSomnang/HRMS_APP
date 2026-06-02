import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface EditDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    document: {
        id: number;
        name: string;
        type: string;
    } | null;
}

export default function EditDocumentModal({ isOpen, onClose, onSuccess, document }: EditDocumentModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        type: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && document) {
            setFormData({
                name: document.name || '',
                type: document.type || '',
            });
        }
    }, [isOpen, document]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!formData.name) {
            setError('Please fill in the document name');
            setLoading(false);
            return;
        }

        try {
            await api.put(`/documents/${document?.id}`, {
                name: formData.name,
                type: formData.type
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update document');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !document) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Edit Document</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            onChange={handleChange}
                            className="w-full rounded-md border p-2"
                            rows={4}
                            placeholder="Brief instructions for the employee..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
