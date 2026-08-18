import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { FileText, Download, Trash2, Upload, Edit, Eye, Plus, Pencil } from 'lucide-react';
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
    const { user, hasPermission } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [viewDoc, setViewDoc] = useState<Document | null>(null);

    const isAdmin = hasPermission('documents.edit') || hasPermission('documents.delete');

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

    useLiveRefresh(fetchDocuments, { resources: 'documents' });

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

            {/* View Document Modal */}
            <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>View Document</DialogTitle>
                    </DialogHeader>
                    {viewDoc && (
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Document Name</label>
                                <div className="w-full rounded-md border p-2 bg-gray-50 text-gray-700">
                                    {viewDoc.name}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description / Instructions</label>
                                <div className="w-full rounded-md border p-2 bg-gray-50 text-gray-700 min-h-[100px] whitespace-pre-wrap">
                                    {viewDoc.type || '-'}
                                </div>
                            </div>
                            
                            {viewDoc.employee?.name && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Employee</label>
                                    <div className="w-full rounded-md border p-2 bg-gray-50 text-gray-700">
                                        {viewDoc.employee.name}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">Upload Date</label>
                                <div className="w-full rounded-md border p-2 bg-gray-50 text-gray-700">
                                    {new Date(viewDoc.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setViewDoc(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 p-8 text-white shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-poppins">Work Documents</h1>
                    <p className="text-slate-200 mt-2 text-sm font-medium">Manage company-wide and work-related documents.</p>
                </div>
                {isAdmin && (
                    <div className="relative z-10">
                        {hasPermission('documents.upload') && (
                            <Button onClick={() => setIsUploadOpen(true)} className="bg-white/20 hover:bg-white/30 text-white border-white/50 backdrop-blur-sm">
                                <Plus className="mr-2 h-4 w-4" /> Upload Document
                            </Button>
                        )}
                    </div>
                )}
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 -mb-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
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
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">Actions</th>
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
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 h-8 w-8" disabled={!hasPermission('documents.view')} onClick={() => setViewDoc(doc)} title={!hasPermission('documents.view') ? 'No permission' : 'View Details'}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {isAdmin && (
                                                    <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8" disabled={!hasPermission('documents.edit')} onClick={() => setEditingDoc(doc)} title={!hasPermission('documents.edit') ? 'No permission' : 'Edit'}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {isAdmin && (
                                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8" disabled={!hasPermission('documents.delete')} onClick={() => setDeleteId(doc.id)} title={!hasPermission('documents.delete') ? 'No permission' : 'Delete'}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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
