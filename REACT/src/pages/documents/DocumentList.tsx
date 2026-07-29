import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { FileText, Download, Trash2, Upload, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import UploadDocumentModal from './UploadDocumentModal';
import EditDocumentModal from './EditDocumentModal';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

interface Document {
    id: number;
    name: string;
    type: string;
    file_path: string;
    created_at: string;
    employee?: {
        name: string;
    };
}

export default function DocumentList() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const isAdmin = user?.roles?.some(r => r.name === 'Super Admin' || r.name === 'Admin');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await api.get('/documents');
            setDocuments(response.data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setLoading(false);
        }
    };

    useLiveRefresh(fetchDocuments);

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/documents/${deleteId}`);
            setDocuments(documents.filter(d => d.id !== deleteId));
            setDeleteId(null);
            toast.success("Document deleted successfully");
        } catch (error) {
            console.error("Failed to delete document", error);
        }
    };

    const getCategory = (doc: Document) => {
        const nameLower = doc.name.toLowerCase();
        const workKeywords = ['contract', 'agreement', 'policy', 'handbook', 'nda', 'company', 'work', 'employment', 'business', 'notice', 'announcement', 'task'];
        if (workKeywords.some(keyword => nameLower.includes(keyword))) return 'work';
        
        const personalKeywords = [
            'national id', 'degree', 'certificate', 'cv', 'resume', 'passport', 
            'id card', 'birth certificate', 'family book', 'diploma', 'transcript', 
            'personal', 'academic', 'qualification', 'educational', 'license', 'engineering', 'study'
        ];
        const nameParts = doc.employee?.name ? doc.employee.name.toLowerCase().split(' ') : [];
        const matchesEmployeeName = nameParts.some(part => part && nameLower.includes(part));
        
        if (personalKeywords.some(keyword => nameLower.includes(keyword)) || matchesEmployeeName) return 'personal';
        return 'work'; // default to work docs
    };

    const workDocs = documents.filter(d => getCategory(d) === 'work');

    if (loading) return <div>Loading documents...</div>;

    return (
        <div className="space-y-6">
            <UploadDocumentModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onSuccess={() => {
                    fetchDocuments();
                    setIsUploadOpen(false);
                }}
            />

            <EditDocumentModal
                isOpen={!!editingDoc}
                onClose={() => setEditingDoc(null)}
                document={editingDoc as any}
                onSuccess={() => {
                    fetchDocuments();
                    setEditingDoc(null);
                }}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Work Documents</h1>
                    <p className="text-muted-foreground">Manage company-wide and work-related documents.</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setIsUploadOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" /> Upload Document
                    </Button>
                )}
            </div>

            <div className="rounded-md border border-amber-100 bg-gradient-to-br from-amber-50/40 via-white to-white">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
                                {isAdmin && <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Employee</th>}
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Description / Instructions</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Upload Date</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {workDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
                                        No documents found.
                                    </td>
                                </tr>
                            ) : (
                                workDocs.map((doc) => (
                                    <tr key={doc.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                {doc.name}
                                            </div>
                                        </td>
                                        {isAdmin && <td className="p-4 align-middle">{doc.employee?.name || 'N/A'}</td>}
                                        <td className="p-4 align-middle max-w-[200px] truncate" title={doc.type || ''}>
                                            {doc.type || '-'}
                                        </td>
                                        <td className="p-4 align-middle">{new Date(doc.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${doc.file_path}`} target="_blank" rel="noreferrer" download>
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                                {isAdmin && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingDoc(doc)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(doc.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Document
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this document? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Document</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
