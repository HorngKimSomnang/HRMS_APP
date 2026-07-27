import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Wallet, CheckCircle, XCircle, AlertCircle, RefreshCw, Plus, FileText, X, ShieldCheck, Clock, Printer, Trash2, MoreVertical, ChevronDown, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSXStyle from 'xlsx-js-style';
import { toast } from 'sonner';
import { getStorageUrl } from "@/core/config";

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];


const STATUS_CFG: any = {
    draft:    { label:"Draft",    color:"text-gray-600",    bg:"bg-gray-50",    border:"border-gray-200",    icon: Clock },
    pending:  { label:"Pending",  color:"text-amber-700",   bg:"bg-amber-50",   border:"border-amber-200",   icon: AlertCircle },
    approved: { label:"Authorized", color:"text-emerald-700", bg:"bg-emerald-50", border:"border-emerald-200", icon: ShieldCheck },
    paid:     { label:"Paid",     color:"text-blue-700",    bg:"bg-blue-50",    border:"border-blue-200",    icon: CheckCircle },
    rejected: { label:"Rejected", color:"text-red-700",     bg:"bg-red-50",     border:"border-red-200",     icon: XCircle },
};

type MenuItem = { label: string; icon?: any; onClick?: () => void; href?: string; danger?: boolean; disabled?: boolean; title?: string };

function DropdownMenu({ trigger, items }: { trigger: React.ReactNode; items: MenuItem[] }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({ top: rect.bottom + 4, left: rect.right - 192 }); // 192px = menu width (w-48)
    };

    useEffect(() => {
        if (!open) return;
        updatePosition();
        const onClick = (e: MouseEvent) => {
            if (triggerRef.current?.contains(e.target as Node)) return;
            if (menuRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            document.removeEventListener('mousedown', onClick);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open]);

    return (
        <div className="relative inline-block" ref={triggerRef}>
            <div onClick={() => setOpen(o => !o)}>{trigger}</div>
            {open && createPortal(
                <div ref={menuRef} style={{ position: 'fixed', top: pos.top, left: pos.left }}
                    className="w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    {items.map((item, i) => {
                        const cls = `w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                            item.disabled ? 'text-gray-300 cursor-not-allowed' :
                            item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                        }`;
                        return item.href ? (
                            <a key={i} href={item.disabled ? undefined : item.href} target="_blank" rel="noopener noreferrer"
                                onClick={() => setOpen(false)} className={cls} title={item.title}>
                                {item.icon && <item.icon className="h-3.5 w-3.5" />} {item.label}
                            </a>
                        ) : (
                            <button key={i} disabled={item.disabled} onClick={() => { item.onClick?.(); setOpen(false); }} className={cls} title={item.title}>
                                {item.icon && <item.icon className="h-3.5 w-3.5" />} {item.label}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}

function Field({ label, value, onChange, type="number", placeholder="0" }: any) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
            <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
    );
}

export default function PayrollAdmin() {
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'Super Admin') ?? false;
    const [payslips, setPayslips]   = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [overtimes, setOvertimes] = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [updatingId, setUpdatingId]   = useState<number|null>(null);
    const [deleteId, setDeleteId] = useState<number|null>(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [searchParams] = useSearchParams();
    const [filterMonth, setFilterMonth] = useState<string>(searchParams.get('month') || String(new Date().getMonth() + 1).padStart(2, '0'));
    const [filterYear, setFilterYear] = useState<string>(searchParams.get('year') || String(new Date().getFullYear()));

    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchMonth, setBatchMonth] = useState<string>("01");
    const [batchYear, setBatchYear] = useState<string>(String(new Date().getFullYear()));

    const filteredPayslips = payslips.filter((p: any) => {
        if (filterMonth && p.month !== filterMonth) return false;
        if (filterYear && p.year !== filterYear) return false;
        return true;
    });

    const [companyLogo, setCompanyLogo] = useState<HTMLImageElement | null>(null);

    const blankForm = { id: null, employee_id:"", month:"01", year: String(new Date().getFullYear()),
        basic_salary:"", overtime_amount:"0", commission:"0",
        attendance_bonus:"0", allowances:"0", advance_deduction:"0", unpaid_leave_deduction:"0", deductions:"0", notes:"",
        skip_signature: false };
    const [form, setForm] = useState<any>(blankForm);

    const net = () => {
        const n = (k: string) => parseFloat(form[k]||"0")||0;
        return (n("basic_salary")+n("overtime_amount")+n("commission")+n("attendance_bonus")+n("allowances")
               -n("advance_deduction")-n("unpaid_leave_deduction")-n("deductions")).toFixed(2);
    };

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.get("/payslips"), 
            api.get("/employees?status=active&all=true"),
            api.get("/overtimes")
        ])
            .then(([r2, r3, r4]) => { 
                setPayslips(r2.data.data||r2.data||[]); 
                setEmployees(r3.data.data||r3.data||[]); 
                setOvertimes(r4.data.data||r4.data||[]);
            })
            .finally(()=>setLoading(false));
    };

    useEffect(() => { 
        fetchData(); 
        const img = new Image();
        img.src = "/logo.png";
        img.onload = () => setCompanyLogo(img);
    }, []);

    useEffect(() => {
        if (!form.employee_id || !form.month || !form.year) return;
        
        const autoOtHours = overtimes
            .filter((r: any) => 
                r.status === 'approved' && 
                r.employee_id?.toString() === form.employee_id &&
                r.date?.startsWith(`${form.year}-${form.month}`)
            )
            .reduce((sum: number, r: any) => sum + parseFloat(r.hours || "0"), 0);
            
        const basicSalary = parseFloat(form.basic_salary || "0");
        const autoOtAmount = autoOtHours * (basicSalary / 160) * 1.5;
            
        setForm((prev: any) => {
            const newOt = autoOtAmount > 0 ? autoOtAmount.toFixed(2) : "0";
            if (prev.overtime_amount === newOt) return prev;
            return { ...prev, overtime_amount: newOt };
        });
    }, [form.employee_id, form.month, form.year, form.basic_salary, overtimes]);


    const handleEdit = (slip: any) => {
        setForm(slip);
        setShowModal(true);
    };

    const handleDelete = (id: number) => setDeleteId(id);

    const confirmDelete = async () => {
        setUpdatingId(deleteId);
        try {
            await api.delete(`/payslips/${deleteId}`);
            setPayslips(payslips.filter(p => p.id !== deleteId));
            setDeleteId(null);
        } catch { toast.error("Failed to delete."); }
        finally { setUpdatingId(null); }
    };

    const updatePayslipStatus = async (id:number, status:string) => {
        setUpdatingId(id);
        try { await api.patch(`/payslips/${id}`,{status}); setPayslips(p=>p.map(r=>r.id===id?{...r,status}:r)); }
        catch (e:any) { toast.error(e.response?.data?.message || "Failed to update payslip status"); } finally { setUpdatingId(null); }
    };

    // Verifying a signature means uploading the scanned copy of the physically-signed
    // paper — the upload itself is what marks the payslip as signed, not a click.
    const signFileInputRef = useRef<HTMLInputElement>(null);
    const [signTargetId, setSignTargetId] = useState<number | null>(null);

    // Scan the whole signed roster once, admin confirms each row against it.
    const [showScanRosterModal, setShowScanRosterModal] = useState(false);
    const [rosterScanFile, setRosterScanFile] = useState<File | null>(null);
    const [rosterScanPreviewUrl, setRosterScanPreviewUrl] = useState<string | null>(null);
    const [rosterCheckedIds, setRosterCheckedIds] = useState<Set<number>>(new Set());
    const [rosterSaving, setRosterSaving] = useState(false);
    const [rosterDetecting, setRosterDetecting] = useState(false);
    const [rosterDetectionSkipped, setRosterDetectionSkipped] = useState(false);

    const triggerSignUpload = (id: number) => {
        setSignTargetId(id);
        signFileInputRef.current?.click();
    };

    const handleSignFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const id = signTargetId;
        e.target.value = ""; // allow re-selecting the same file later
        if (!file || !id) return;

        setUpdatingId(id);
        try {
            const formData = new FormData();
            formData.append('signed_document', file);
            const res = await api.post(`/payslips/${id}/sign`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPayslips(p => p.map(r => r.id === id ? res.data.data : r));
            toast.success("Signature verified and scan saved.");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to mark payslip as signed");
        } finally {
            setUpdatingId(null);
            setSignTargetId(null);
        }
    };

    // Candidates for the roster scan: unsigned drafts that actually need a signature,
    // matching the currently-selected month/year filter (same set as the printed roster).
    const rosterScanCandidates = filteredPayslips.filter((p: any) =>
        p.requires_signature && !(p.is_signed === 1 || p.is_signed === true)
    );

    const openScanRosterModal = () => {
        setRosterScanFile(null);
        setRosterScanPreviewUrl(null);
        setRosterCheckedIds(new Set());
        setRosterDetectionSkipped(false);
        setShowScanRosterModal(true);
    };

    // The roster PDF is A4 landscape (297x210mm, ratio ~1.41). Detection assumes the
    // uploaded image IS that full page edge-to-edge — a cropped screenshot or a photo
    // of just part of the page has a very different ratio and breaks every coordinate
    // the detector calculates, which is what caused false positives before this check existed.
    const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) { resolve(null); return; }
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(file);
        });
    };

    const handleRosterScanFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setRosterScanFile(file);
        setRosterScanPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
        setRosterCheckedIds(new Set());
        setRosterDetectionSkipped(false);

        const dims = await getImageDimensions(file);
        const ratio = dims ? dims.width / dims.height : null;
        const looksLikeFullPage = ratio !== null && ratio > 1.15 && ratio < 1.7;

        if (!looksLikeFullPage) {
            // Doesn't look like a full landscape page (e.g. a cropped screenshot) —
            // auto-detection would be guessing blindly, so skip it and let the admin
            // check rows manually instead of risking another false positive.
            setRosterDetectionSkipped(true);
            return;
        }

        // Best-effort auto-detection: pre-check rows the scan looks signed on.
        // Still fully editable afterward — this is a suggestion, not a decision.
        setRosterDetecting(true);
        try {
            const formData = new FormData();
            formData.append('signed_document', file);
            rosterScanCandidates.forEach((p: any) => formData.append('payslip_ids[]', String(p.id)));
            const res = await api.post('/payslips/detect-signatures', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const suggested = new Set<number>(
                rosterScanCandidates.filter((p: any) => res.data.suggestions[p.id]).map((p: any) => p.id)
            );
            setRosterCheckedIds(suggested);
            if (suggested.size > 0) toast(`Auto-detected ${suggested.size} likely signature${suggested.size === 1 ? '' : 's'} — please review before confirming.`);
        } catch {
            // Detection is a convenience, not a requirement — silently fall back to manual checking.
        } finally {
            setRosterDetecting(false);
        }
    };

    const toggleRosterChecked = (id: number) => {
        setRosterCheckedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const confirmRosterScan = async () => {
        if (!rosterScanFile || rosterCheckedIds.size === 0) return;
        setRosterSaving(true);
        try {
            const formData = new FormData();
            formData.append('signed_document', rosterScanFile);
            Array.from(rosterCheckedIds).forEach(id => formData.append('payslip_ids[]', String(id)));
            const res = await api.post('/payslips/sign-batch', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message);
            setShowScanRosterModal(false);
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to verify from scan");
        } finally {
            setRosterSaving(false);
        }
    };

    const downloadPayslipPDF = (slip: any) => {
        try {
            const doc = new jsPDF();
            const monthName = MONTH_NAMES[parseInt(slip.month) - 1] || slip.month;
            const employeeName = slip.employee?.user?.name || "Employee";

            if (companyLogo) {
                doc.addImage(companyLogo, 'PNG', 14, 15, 18, 18);
            }

            doc.setTextColor(30, 64, 175);
            doc.text("HEN CHEN INVESTMENT CO.LTD", 36, 23);

            doc.setFontSize(14);
            doc.setTextColor(55, 65, 81);
            doc.text("Salary Payslip / Verification Sheet", 36, 31);

            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`Employee Name: ${employeeName}`, 14, 45);
            doc.text(`Pay Period: ${monthName} ${slip.year}`, 14, 52);
            doc.text(`Status: ${STATUS_CFG[slip.status]?.label || slip.status}`, 14, 59);

            const formatMoney = (val: any) => `$${parseFloat(val || "0").toFixed(2)}`;

            const tableData = [
                [{ content: "EARNINGS", colSpan: 2, styles: { fillColor: [16, 185, 129] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const } }],
                ["Basic Salary", formatMoney(slip.basic_salary)],
                ["Overtime", formatMoney(slip.overtime_amount)],
                ["Commission", formatMoney(slip.commission)],
                ["Attendance Bonus", formatMoney(slip.attendance_bonus)],
                ["Allowances", formatMoney(slip.allowances)],
                [{ content: "DEDUCTIONS", colSpan: 2, styles: { fillColor: [239, 68, 68] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const } }],
                ["Tax", formatMoney(slip.tax || "0")],
                ["Advance Deduction", formatMoney(slip.advance_deduction)],
                ["Unpaid Leave", formatMoney(slip.unpaid_leave_deduction)],
                ["Other Deductions", formatMoney(slip.deductions)],
                [{ content: "NET SALARY", styles: { fontStyle: 'bold' as const } }, { content: formatMoney(slip.net_salary), styles: { fontStyle: 'bold' as const } }]
            ];

            autoTable(doc, {
                startY: 70,
                head: [],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 5 },
                columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } }
            });

            const finalY = (doc as any).lastAutoTable.finalY || 160;

            doc.setFontSize(10);
            doc.text("I acknowledge that I have verified my work hours and that this payslip is accurate.", 14, finalY + 20);

            doc.text("________________________________", 14, finalY + 45);
            doc.text("Employee Signature", 14, finalY + 52);

            doc.text("________________________________", 100, finalY + 45);
            doc.text("Date", 100, finalY + 52);

            doc.text("________________________________", 14, finalY + 75);
            doc.text("HR / Admin Signature", 14, finalY + 82);

            doc.save(`${employeeName.replace(/\s+/g, '_')}_${monthName}_${slip.year}_Verification.pdf`);
        } catch (e: any) { toast.error("Download failed: " + e.message); console.error(e); }
    };

    const downloadMasterRosterPDF = () => {
        try {
            if (filteredPayslips.length === 0) {
                toast("No payslips available to print.");
                return;
            }

            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            if (companyLogo) {
                doc.addImage(companyLogo, 'PNG', 14, 15, 18, 18);
            }

            doc.setFontSize(15);
            doc.setTextColor(30, 64, 175);
            doc.text("HEN CHEN INVESTMENT CO.LTD", 36, 21);

            doc.setFontSize(11);
            doc.setTextColor(55, 65, 81);
            let titleMonthName = filterMonth ? MONTH_NAMES[parseInt(filterMonth) - 1] : "";
            let titleYearStr = filterYear;

            if (!titleMonthName && filteredPayslips.length > 0) {
                titleMonthName = MONTH_NAMES[parseInt(filteredPayslips[0].month) - 1];
            }
            if (!titleYearStr && filteredPayslips.length > 0) {
                titleYearStr = filteredPayslips[0].year;
            }

            const titlePeriod = (titleMonthName && titleYearStr) ? ` - ${titleMonthName} ${titleYearStr}` : "";
            doc.text(`Monthly Payroll Roster${titlePeriod}`, 36, 28);

            // Right-aligned meta: address + document info, like a real company form
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text("Phnom Penh, Kingdom of Cambodia", 196, 16, { align: 'right' });
            doc.text(`Doc No: PR-${titleYearStr || ''}${filterMonth || ''}`, 196, 21, { align: 'right' });
            doc.text(`Printed: ${new Date().toLocaleDateString()}`, 196, 26, { align: 'right' });

            doc.setDrawColor(226, 232, 240);
            doc.line(14, 35, 196, 35);

            doc.setFontSize(10);
            doc.setTextColor(55, 65, 81);
            doc.text("All employees must physically sign next to their name to verify their work hours and salary.", 14, 43);

            const num = (v: any) => parseFloat(v || 0);
            const money = (v: number) => `$${v.toFixed(2)}`;

            let totBasic = 0, totAllow = 0, totDeduct = 0, totNet = 0;
            const tableData = filteredPayslips.map((slip: any, i: number) => {
                const basic = num(slip.basic_salary);
                const allow = num(slip.overtime_amount) + num(slip.commission) + num(slip.attendance_bonus) + num(slip.allowances);
                const deduct = num(slip.advance_deduction) + num(slip.unpaid_leave_deduction) + num(slip.deductions);
                const net = num(slip.net_salary);
                totBasic += basic; totAllow += allow; totDeduct += deduct; totNet += net;
                const isSigned = slip.is_signed === 1 || slip.is_signed === true;
                return [
                    (i + 1).toString(),
                    slip.employee?.user?.name || "Unknown",
                    slip.employee?.job_title || "-",
                    money(basic),
                    money(allow),
                    money(deduct),
                    money(net),
                    isSigned && slip.signed_at ? new Date(slip.signed_at).toLocaleDateString() : "",
                    isSigned ? "Verified (scanned)" : ""
                ];
            });

            autoTable(doc, {
                startY: 48,
                margin: { left: 14, right: 14 },
                head: [["No.", "Employee Name", "Position", "Basic", "Allow.", "Deduct.", "Net Pay", "Date", "Signature"]],
                body: tableData,
                foot: [["", "TOTAL", "", money(totBasic), money(totAllow), money(totDeduct), money(totNet), "", ""]],
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: { top: 6, bottom: 6, left: 2, right: 2 }, valign: 'middle', lineColor: [203, 213, 225], lineWidth: 0.1 },
                headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left', valign: 'middle' },
                footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'right', fontSize: 9 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                bodyStyles: { minCellHeight: 24 },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 18 },
                    3: { cellWidth: 18, halign: 'right' },
                    4: { cellWidth: 15, halign: 'right' },
                    5: { cellWidth: 15, halign: 'right', textColor: [220, 38, 38] },
                    6: { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
                    7: { cellWidth: 13 },
                    8: { cellWidth: 50 }
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY || 160;

            // Prepared / Checked / Approved — always pinned near the bottom of the page,
            // regardless of how many employees are in the table (not right after it).
            const pageHeight = doc.internal.pageSize.getHeight();
            let sigY = pageHeight - 35;
            if (finalY + 10 > sigY) {
                doc.addPage();
                sigY = pageHeight - 35;
            }

            doc.setFontSize(10);
            doc.setTextColor(31, 41, 55);
            doc.text("_____________", 16, sigY);
            doc.text("Prepared by", 24, sigY + 6);
            doc.setFontSize(8); doc.setTextColor(100, 116, 139);
            doc.text("HR / Admin", 26, sigY + 11);

            doc.setFontSize(10); doc.setTextColor(31, 41, 55);
            doc.text("_____________", 80, sigY);
            doc.text("Checked by", 88, sigY + 6);
            doc.setFontSize(8); doc.setTextColor(100, 116, 139);
            doc.text("Finance / Accounting", 76, sigY + 11);

            doc.setFontSize(10); doc.setTextColor(31, 41, 55);
            doc.text("_____________", 144, sigY);
            doc.text("Approved by", 152, sigY + 6);
            doc.setFontSize(8); doc.setTextColor(100, 116, 139);
            doc.text("Director / CEO", 150, sigY + 11);

            doc.save("Monthly_Payroll_Roster.pdf");
        } catch (e: any) { toast.error("Download failed: " + e.message); console.error(e); }
    };

    const downloadMasterRosterExcel = () => {
        try {
            if (filteredPayslips.length === 0) {
                toast("No payslips available to export.");
                return;
            }

            const num = (v: any) => parseFloat(v || 0);

            let titleMonthName = filterMonth ? MONTH_NAMES[parseInt(filterMonth) - 1] : "";
            let titleYearStr = filterYear;
            if (!titleMonthName && filteredPayslips.length > 0) {
                titleMonthName = MONTH_NAMES[parseInt(filteredPayslips[0].month) - 1];
            }
            if (!titleYearStr && filteredPayslips.length > 0) {
                titleYearStr = filteredPayslips[0].year;
            }
            const titlePeriod = (titleMonthName && titleYearStr) ? ` - ${titleMonthName} ${titleYearStr}` : "";

            const headerRow = ["No.", "Employee Name", "Position", "Basic", "Allow.", "Deduct.", "Net Pay", "Date", "Signature"];

            let totBasic = 0, totAllow = 0, totDeduct = 0, totNet = 0;
            const dataRows = filteredPayslips.map((slip: any, i: number) => {
                const basic = num(slip.basic_salary);
                const allow = num(slip.overtime_amount) + num(slip.commission) + num(slip.attendance_bonus) + num(slip.allowances);
                const deduct = num(slip.advance_deduction) + num(slip.unpaid_leave_deduction) + num(slip.deductions);
                const net = num(slip.net_salary);
                totBasic += basic; totAllow += allow; totDeduct += deduct; totNet += net;
                const isSigned = slip.is_signed === 1 || slip.is_signed === true;
                return [
                    i + 1,
                    slip.employee?.user?.name || "Unknown",
                    slip.employee?.job_title || "-",
                    basic,
                    allow,
                    deduct,
                    net,
                    isSigned && slip.signed_at ? new Date(slip.signed_at).toLocaleDateString() : "",
                    isSigned ? "Verified (scanned)" : ""
                ];
            });

            const noteRow = ["All employees must physically sign next to their name to verify their work hours and salary."];
            const sheetData = [
                ["HEN CHEN INVESTMENT CO.LTD"],
                [`Monthly Payroll Roster${titlePeriod}`],
                [`Printed: ${new Date().toLocaleDateString()}`],
                noteRow,
                [],
                headerRow,
                ...dataRows,
                ["", "TOTAL", "", totBasic, totAllow, totDeduct, totNet, "", ""],
            ];

            const HEADER_ROW_IDX = 5;
            const FIRST_DATA_ROW_IDX = 6;
            const TOTAL_ROW_IDX = sheetData.length - 1;
            const LAST_COL_IDX = headerRow.length - 1;

            const ws = XLSXStyle.utils.aoa_to_sheet(sheetData);

            ws['!cols'] = [
                { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
                { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 },
            ];
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: LAST_COL_IDX } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: LAST_COL_IDX } },
                { s: { r: 3, c: 0 }, e: { r: 3, c: LAST_COL_IDX } },
            ];
            ws['!rows'] = [{ hpx: 26 }, { hpx: 20 }, { hpx: 16 }, { hpx: 16 }, { hpx: 6 }, { hpx: 22 }];

            // ── Colors matched to the printed PDF roster ────────────────────
            const NAVY = '1E40AF';
            const SLATE = '374151';
            const MUTED = '64748B';
            const RED = 'DC2626';
            const GREEN = '10B981';
            const ROW_ALT = 'F8FAFC';
            const TOTAL_FILL = 'F1F5F9';
            const BORDER = { style: 'thin', color: { rgb: 'CBD5E1' } };
            const thinBox = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

            const setStyle = (r: number, c: number, style: Record<string, unknown>) => {
                const addr = XLSXStyle.utils.encode_cell({ r, c });
                if (!ws[addr]) ws[addr] = { t: 's', v: '' };
                ws[addr].s = { ...(ws[addr].s || {}), ...style };
            };

            setStyle(0, 0, { font: { bold: true, sz: 16, color: { rgb: NAVY } } });
            setStyle(1, 0, { font: { bold: true, sz: 12, color: { rgb: SLATE } } });
            setStyle(2, 0, { font: { sz: 9, italic: true, color: { rgb: MUTED } } });
            setStyle(3, 0, { font: { sz: 9, italic: true, color: { rgb: MUTED } } });

            // Header row: navy fill, white bold text, thin borders
            for (let c = 0; c <= LAST_COL_IDX; c++) {
                setStyle(HEADER_ROW_IDX, c, {
                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: NAVY } },
                    alignment: { vertical: 'center', horizontal: c === 1 || c === 2 ? 'left' : 'center', wrapText: false },
                    border: thinBox,
                });
            }

            // Data rows: alternating shading + borders; deduction col red, net salary col green/bold
            for (let r = FIRST_DATA_ROW_IDX; r < TOTAL_ROW_IDX; r++) {
                const isAlt = (r - FIRST_DATA_ROW_IDX) % 2 === 1;
                for (let c = 0; c <= LAST_COL_IDX; c++) {
                    const base: Record<string, unknown> = {
                        border: thinBox,
                        fill: isAlt ? { fgColor: { rgb: ROW_ALT } } : undefined,
                        font: { color: { rgb: SLATE } },
                        alignment: { vertical: 'center', horizontal: [3, 4, 5, 6].includes(c) ? 'right' : (c === 0 ? 'center' : 'left') },
                    };
                    if (c === 5) base.font = { color: { rgb: RED } };
                    if (c === 6) base.font = { bold: true, color: { rgb: GREEN } };
                    setStyle(r, c, base);
                }
            }

            // Total row: light fill, bold
            for (let c = 0; c <= LAST_COL_IDX; c++) {
                setStyle(TOTAL_ROW_IDX, c, {
                    font: { bold: true, color: { rgb: SLATE } },
                    fill: { fgColor: { rgb: TOTAL_FILL } },
                    border: thinBox,
                    alignment: { horizontal: [3, 4, 5, 6].includes(c) ? 'right' : 'left' },
                });
            }

            // Format the money columns (Basic, Allowances, Deductions, Net Salary) as currency
            const moneyCols = [3, 4, 5, 6];
            for (let r = FIRST_DATA_ROW_IDX; r <= TOTAL_ROW_IDX; r++) {
                moneyCols.forEach(c => {
                    const cell = ws[XLSXStyle.utils.encode_cell({ r, c })];
                    if (cell && typeof cell.v === 'number') cell.z = '$#,##0.00';
                });
            }

            const workbook = XLSXStyle.utils.book_new();
            XLSXStyle.utils.book_append_sheet(workbook, ws, "Payroll Roster");

            const filename = `Monthly_Payroll_Roster${titlePeriod ? `_${titleMonthName}_${titleYearStr}` : ''}.xlsx`;
            XLSXStyle.writeFile(workbook, filename);
        } catch (e: any) { toast.error("Export failed: " + e.message); console.error(e); }
    };

    const downloadBatchPayslips = () => {
        try {
            if (filteredPayslips.length === 0) {
                toast("No payslips available to print.");
                return;
            }

            const doc = new jsPDF();

            filteredPayslips.forEach((slip: any, index: number) => {
                if (index > 0) doc.addPage();
                const monthName = MONTH_NAMES[parseInt(slip.month) - 1] || slip.month;
                const employeeName = slip.employee?.user?.name || "Employee";

                if (companyLogo) {
                    doc.addImage(companyLogo, 'PNG', 14, 15, 18, 18);
                }

                doc.setFontSize(22);
                doc.setTextColor(30, 64, 175);
                doc.text("HEN CHEN INVESTMENT CO.LTD", 36, 23);

                doc.setFontSize(14);
                doc.setTextColor(55, 65, 81);
                doc.text("Salary Payslip / Verification Sheet", 36, 31);

                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.text(`Employee Name: ${employeeName}`, 14, 45);
                doc.text(`Pay Period: ${monthName} ${slip.year}`, 14, 52);
                doc.text(`Status: ${STATUS_CFG[slip.status]?.label || slip.status}`, 14, 59);

                const formatMoney = (val: any) => `$${parseFloat(val || "0").toFixed(2)}`;

                const tableData = [
                    [{ content: "EARNINGS", colSpan: 2, styles: { fillColor: [16, 185, 129] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const } }],
                    ["Basic Salary", formatMoney(slip.basic_salary)],
                    ["Overtime", formatMoney(slip.overtime_amount)],
                    ["Commission", formatMoney(slip.commission)],
                    ["Attendance Bonus", formatMoney(slip.attendance_bonus)],
                    ["Allowances", formatMoney(slip.allowances)],
                    [{ content: "DEDUCTIONS", colSpan: 2, styles: { fillColor: [239, 68, 68] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const } }],
                    ["Tax", formatMoney(slip.tax || "0")],
                    ["Advance Deduction", formatMoney(slip.advance_deduction)],
                    ["Unpaid Leave", formatMoney(slip.unpaid_leave_deduction)],
                    ["Other Deductions", formatMoney(slip.deductions)],
                    [{ content: "NET SALARY", styles: { fontStyle: 'bold' as const } }, { content: formatMoney(slip.net_salary), styles: { fontStyle: 'bold' as const } }]
                ];

                autoTable(doc, {
                    startY: 70,
                    head: [],
                    body: tableData,
                    theme: 'grid',
                    styles: { fontSize: 10, cellPadding: 5 },
                    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } }
                });

                const finalY = (doc as any).lastAutoTable.finalY || 160;

                doc.setFontSize(10);
                doc.text("I acknowledge that I have verified my work hours and that this payslip is accurate.", 14, finalY + 20);

                doc.text("________________________________", 14, finalY + 45);
                doc.text("Employee Signature", 14, finalY + 52);

                doc.text("________________________________", 100, finalY + 45);
                doc.text("Date", 100, finalY + 52);

                doc.text("________________________________", 14, finalY + 75);
                doc.text("HR / Admin Signature", 14, finalY + 82);
            });

            doc.save(`Batch_Payslips_${filteredPayslips[0].month}_${filteredPayslips[0].year}.pdf`);
        } catch (e: any) { toast.error("Download failed: " + e.message); console.error(e); }
    };

    const handleBatchGenerate = async () => {
        setSaving(true);
        try {
            const res = await api.post("/payslips/batch", { month: batchMonth, year: batchYear });
            toast.success(res.data.message || "Batch payroll generated successfully!");
            setShowBatchModal(false);
            fetchData();
        } catch (e:any) {
            toast.error(e.response?.data?.message || "Failed to generate batch payroll");
        } finally {
            setSaving(false);
        }
    };

    const handleBatchAuthorize = async () => {
        setSaving(true);
        try {
            const res = await api.post("/payslips/authorize-all", { month: filterMonth, year: filterYear });
            if (res.data.unsigned_skipped > 0) toast(res.data.message);
            else toast.success(res.data.message);
            fetchData();
        } catch (e:any) {
            toast.error(e.response?.data?.message || "Failed to authorize drafts");
        } finally {
            setSaving(false);
        }
    };

    const generatePayslip = async () => {
        if (!form.employee_id||!form.basic_salary){ toast("Select an employee and enter basic salary."); return; }
        setSaving(true);
        try {
            const payload = { ...form, 
                basic_salary: parseFloat(form.basic_salary),
                overtime_amount: parseFloat(form.overtime_amount||"0"),
                commission: parseFloat(form.commission||"0"),
                attendance_bonus: parseFloat(form.attendance_bonus||"0"),
                allowances: parseFloat(form.allowances||"0"),
                advance_deduction: parseFloat(form.advance_deduction||"0"),
                unpaid_leave_deduction: parseFloat(form.unpaid_leave_deduction||"0"),
                deductions: parseFloat(form.deductions||"0"),
            };
            if(form.id) await api.put(`/payslips/${form.id}`, payload);
            else await api.post("/payslips", payload);
            
            setShowModal(false); setForm(blankForm); fetchData();
        } catch(e:any){ toast.error(e.response?.data?.message||"Failed to generate payslip"); }
        finally { setSaving(false); }
    };

    const openGenerateModal = () => { setForm(blankForm); setShowModal(true); };

    return (
        <div className="space-y-6">
            <input type="file" ref={signFileInputRef} onChange={handleSignFileSelected}
                accept="image/*,application/pdf" capture="environment" style={{ display: 'none' }} />

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" /> Delete Draft Payslip</DialogTitle>
                    </DialogHeader>
                    <div className="py-4"><p className="text-sm text-slate-600">Are you sure you want to delete this draft payslip? This action cannot be undone.</p></div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete} disabled={!!updatingId}>
                            {updatingId ? "Deleting..." : "Delete Draft"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Run Payroll (Batch)</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-gray-500">
                            This will automatically generate a draft payslip for every active employee for the selected period.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Month</label>
                                <select value={batchMonth} onChange={e=>setBatchMonth(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                                    {MONTHS.map((m,i)=><option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Year</label>
                                <input value={batchYear} onChange={e=>setBatchYear(e.target.value)} type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBatchModal(false)}>Cancel</Button>
                        <Button onClick={handleBatchGenerate} disabled={saving}>
                            {saving ? "Generating..." : "Run Payroll"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showScanRosterModal} onOpenChange={setShowScanRosterModal}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Scan Signed Roster</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                        <p className="text-sm text-gray-500">
                            Upload one photo or scan of the whole signed roster, then check off each employee you can confirm has signed on it.
                        </p>

                        {!rosterScanFile ? (
                            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-10 cursor-pointer hover:bg-gray-50 transition-colors">
                                <FileText className="h-8 w-8 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">Click to upload the scanned roster</span>
                                <span className="text-xs text-gray-400">Full-page photo or scan only — not a cropped screenshot. Image or PDF, max 10MB.</span>
                                <input type="file" accept="image/*,application/pdf" capture="environment"
                                    onChange={handleRosterScanFileSelected} className="hidden" />
                            </label>
                        ) : (
                            <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                                {rosterScanPreviewUrl ? (
                                    <img src={rosterScanPreviewUrl} alt="Roster scan preview" className="h-20 w-20 object-cover rounded-lg border" />
                                ) : (
                                    <div className="h-20 w-20 flex items-center justify-center bg-gray-100 rounded-lg border">
                                        <FileText className="h-8 w-8 text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{rosterScanFile.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {rosterDetecting ? "Detecting signatures..." : `${(rosterScanFile.size / 1024).toFixed(0)} KB`}
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" disabled={rosterDetecting}
                                    onClick={() => { setRosterScanFile(null); setRosterScanPreviewUrl(null); setRosterCheckedIds(new Set()); }}>
                                    Change
                                </Button>
                            </div>
                        )}

                        {rosterScanFile && rosterCheckedIds.size > 0 && !rosterDetecting && (
                            <p className="text-xs text-amber-600 -mt-2">
                                Auto-detected from the scan — double-check against the photo before confirming.
                            </p>
                        )}
                        {rosterDetectionSkipped && (
                            <p className="text-xs text-red-500 -mt-2">
                                This doesn't look like a full-page photo or scan, so auto-detection was skipped — please check each row manually against the image.
                            </p>
                        )}

                        <div className="border border-gray-200 rounded-xl max-h-72 overflow-y-auto">
                            {rosterScanCandidates.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">No unsigned drafts to verify for the current filter.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left w-10">No.</th>
                                            <th className="px-3 py-2 text-left">Employee Name</th>
                                            <th className="px-3 py-2 text-left">Pay Period</th>
                                            <th className="px-3 py-2 text-right">Net Salary</th>
                                            <th className="px-3 py-2 text-center w-24">Signed?</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {rosterScanCandidates.map((p: any, i: number) => (
                                            <tr key={p.id} onClick={() => toggleRosterChecked(p.id)}
                                                className={`cursor-pointer transition-colors ${rosterCheckedIds.has(p.id) ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                                <td className="px-3 py-2 font-medium text-gray-800">{p.employee?.user?.name || p.employee?.employee_code}</td>
                                                <td className="px-3 py-2 text-gray-500">{MONTH_NAMES[parseInt(p.month) - 1]} {p.year}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-emerald-600">${p.net_salary}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <input type="checkbox" checked={rosterCheckedIds.has(p.id)} onChange={() => toggleRosterChecked(p.id)}
                                                        onClick={(e) => e.stopPropagation()} className="h-4 w-4 accent-primary" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowScanRosterModal(false)}>Cancel</Button>
                        <Button onClick={confirmRosterScan} disabled={!rosterScanFile || rosterCheckedIds.size === 0 || rosterSaving || rosterDetecting}>
                            {rosterSaving ? "Saving..." : rosterDetecting ? "Detecting..." : `Confirm ${rosterCheckedIds.size || ''} Verified`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Wallet className="h-6 w-6 text-primary"/>Payroll & Payments</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {isSuperAdmin
                            ? "Review payroll drafts and authorize final payslip publication."
                            : "Prepare payroll drafts for Super Admin authorization."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowBatchModal(true)} className="flex items-center gap-2 text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                        <Clock className="h-4 w-4"/> Run Payroll (Batch)
                    </button>
                    <button onClick={openGenerateModal} className="flex items-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                        <Plus className="h-4 w-4"/> Generate Individual
                    </button>
                    <button onClick={fetchData} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50">
                        <RefreshCw className="h-4 w-4"/>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label:"Drafts (Pending Auth)", value:payslips.filter((p:any)=>p.status==="draft").length, color:"text-amber-600", bg:"bg-amber-50 border-amber-200", icon:Clock },
                    { label:"Authorized Payslips", value:payslips.filter((p:any)=>p.status==="approved"||p.status==="paid").length, color:"text-emerald-600", bg:"bg-emerald-50 border-emerald-200", icon:ShieldCheck },
                ].map(s=>(
                    <div key={s.label} className={`rounded-xl border ${s.bg} p-5 flex items-center gap-4`}>
                        <s.icon className={`h-7 w-7 ${s.color}`}/>
                        <div><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-sm text-muted-foreground">{s.label}</p></div>
                    </div>
                ))}
            </div>

            {loading ? <div className="text-center py-20 text-muted-foreground">Loading...</div>
            : (
                <div className="bg-gradient-to-br from-violet-50/40 via-white to-white rounded-xl border border-violet-100 shadow-sm flex flex-col mt-6">
                    {payslips.length > 0 && (
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-sm font-semibold text-gray-700">All Payslips</h2>
                            <div className="flex gap-2">
                                <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
                                    <option value="">All Months</option>
                                    {MONTHS.map((m, i) => <option key={i} value={m}>{MONTH_NAMES[i]}</option>)}
                                </select>
                                <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
                                    <option value="">All Years</option>
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                                </select>
                                
                                {filteredPayslips.some((p:any)=>p.status==="draft") && (
                                    <button onClick={handleBatchAuthorize} className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm ml-2">
                                        <ShieldCheck className="h-4 w-4"/> Authorize All
                                    </button>
                                )}

                                <DropdownMenu
                                    trigger={
                                        <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm ml-2">
                                            <MoreVertical className="h-4 w-4 text-gray-500" /> More <ChevronDown className="h-3 w-3 text-gray-400" />
                                        </button>
                                    }
                                    items={[
                                        { label: "Scan Signed Roster", icon: CheckCircle, onClick: openScanRosterModal },
                                        { label: "Print Master Roster", icon: FileText, onClick: downloadMasterRosterPDF },
                                        { label: "Export Roster to Excel", icon: FileSpreadsheet, onClick: downloadMasterRosterExcel },
                                        { label: "Batch Individual Payslips", icon: Printer, onClick: downloadBatchPayslips },
                                    ]}
                                />
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        {filteredPayslips.length===0?(
                            <div className="py-20 text-center"><FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3"/><p className="text-muted-foreground">No payslips found.</p></div>
                        ):(
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Employee & Period</th>
                                    <th className="px-6 py-4">Earnings</th>
                                    <th className="px-6 py-4">Deductions</th>
                                    <th className="px-6 py-4 text-emerald-700">Net Salary</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPayslips.map((slip:any)=>(
                                    <tr key={slip.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{slip.employee?.user?.name??"—"}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{MONTH_NAMES[parseInt(slip.month)-1]} {slip.year}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="font-medium text-gray-900">${slip.basic_salary} <span className="text-xs font-normal text-muted-foreground ml-1">Basic</span></div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                                    {parseFloat(slip.overtime_amount) > 0 && <span className="text-indigo-600 font-medium">OT: ${slip.overtime_amount}</span>}
                                                    {parseFloat(slip.commission) > 0 && <span className="text-violet-600 font-medium">Comm: ${slip.commission}</span>}
                                                    {parseFloat(slip.attendance_bonus) > 0 && <span className="text-teal-600 font-medium">Att: ${slip.attendance_bonus}</span>}
                                                    {parseFloat(slip.allowances) > 0 && <span className="text-blue-600 font-medium">Allow: ${slip.allowances}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="font-medium text-red-500">-${(parseFloat(slip.advance_deduction||0)+parseFloat(slip.unpaid_leave_deduction||0)+parseFloat(slip.deductions||0)).toFixed(2)}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-600 text-base">${slip.net_salary}</td>
                                        <td className="px-6 py-4">
                                            {(() => { const sc = STATUS_CFG[slip.status] ?? STATUS_CFG.pending; return (
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color} ${sc.border}`}>
                                                        <sc.icon className="h-3 w-3"/>{sc.label}
                                                    </span>
                                                    {slip.requires_signature ? (
                                                        <span className={`text-[10px] font-medium flex items-center gap-1 ${slip.is_signed === 1 || slip.is_signed === true ? 'text-blue-600' : 'text-amber-600'}`}>
                                                            {slip.is_signed === 1 || slip.is_signed === true
                                                                ? <><CheckCircle className="h-3 w-3"/> Verified</>
                                                                : <><AlertCircle className="h-3 w-3"/> Unsigned</>}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-gray-400">No signature required</span>
                                                    )}
                                                </div>
                                            ); })()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {(() => {
                                                const isSelf = !isSuperAdmin && slip.employee?.user_id === user?.id;
                                                const isSigned = slip.is_signed === 1 || slip.is_signed === true;
                                                const needsSignature = slip.requires_signature && !isSigned;
                                                const busy = updatingId === slip.id;

                                                return (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {slip.status === "draft" && (
                                                            <button
                                                                disabled={busy || isSelf || needsSignature}
                                                                onClick={()=>updatePayslipStatus(slip.id,"approved")}
                                                                title={needsSignature ? "Scan the signed paper before authorizing" : isSelf ? "Super Admin must authorize your payslip" : "Authorize"}
                                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 shadow-sm">
                                                                <ShieldCheck className="h-3 w-3"/> Authorize
                                                            </button>
                                                        )}
                                                        {slip.status === "approved" && isSigned && (
                                                            <button disabled={busy || isSelf} onClick={()=>updatePayslipStatus(slip.id,"paid")}
                                                                title={isSelf ? "Super Admin must pay your payslip" : "Mark as Paid"}
                                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white flex items-center gap-1 shadow-sm bg-blue-600 hover:bg-blue-700">
                                                                Mark Paid
                                                            </button>
                                                        )}

                                                        <DropdownMenu
                                                            trigger={
                                                                <button className={`relative p-1.5 rounded-lg transition-colors ${needsSignature ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                                                                    title={needsSignature ? "Signature verification needed" : undefined}>
                                                                    <MoreVertical className="h-4 w-4"/>
                                                                    {needsSignature && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"/>}
                                                                </button>
                                                            }
                                                            items={[
                                                                ...(needsSignature ? [{
                                                                    label: busy ? "Uploading..." : "Scan to Verify",
                                                                    icon: CheckCircle,
                                                                    disabled: busy || isSelf,
                                                                    title: isSelf ? "You cannot verify your own payslip" : "Scan the signed paper to verify",
                                                                    onClick: () => triggerSignUpload(slip.id),
                                                                }] : []),
                                                                { label: "Print Signature Sheet", icon: Printer, onClick: () => downloadPayslipPDF(slip) },
                                                                ...(slip.signed_document_path ? [{ label: "View Scanned Copy", icon: FileText, href: getStorageUrl(slip.signed_document_path) }] : []),
                                                                { label: "Edit", disabled: busy || isSelf, onClick: () => handleEdit(slip) },
                                                                { label: "Delete", danger: true, disabled: busy || isSelf, onClick: () => handleDelete(slip.id) },
                                                            ]}
                                                        />
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    </div>
                </div>
            )}

            {showModal&&(
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                            <h2 className="text-lg font-bold text-gray-900">Generate Payslip</h2>
                        </div>
                            <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Employee</label>
                                <select value={form.employee_id} onChange={e => {
                                    const empId = e.target.value;
                                    const emp = employees.find((x:any) => x.id.toString() === empId);
                                    setForm({...form, employee_id: empId, basic_salary: emp ? (emp.salary || emp.basic_salary || "") : ""});
                                }}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                                    <option value="">Select employee...</option>
                                    {employees.map((emp:any)=><option key={emp.id} value={emp.id}>{emp.name || emp.user?.name || "Unknown"} ({emp.employee_code})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Month</label>
                                    <select value={form.month} onChange={e=>setForm({...form,month:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                                        {MONTHS.map((m,i)=><option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
                                    </select>
                                </div>
                                <Field label="Year" value={form.year} onChange={(v:string)=>setForm({...form,year:v})} type="text" placeholder={String(new Date().getFullYear())}/>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-xs font-bold uppercase text-emerald-600 mb-3">💰 Earnings</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Basic Salary ($)" value={form.basic_salary} onChange={(v:string)=>setForm({...form,basic_salary:v})} placeholder="e.g. 500"/>
                                    <Field label="Overtime (OT) ($)" value={form.overtime_amount} onChange={(v:string)=>setForm({...form,overtime_amount:v})}/>
                                    <Field label="Commission ($)" value={form.commission} onChange={(v:string)=>setForm({...form,commission:v})}/>
                                    <Field label="Attendance Bonus ($)" value={form.attendance_bonus} onChange={(v:string)=>setForm({...form,attendance_bonus:v})}/>
                                    <Field label="Allowances ($)" value={form.allowances} onChange={(v:string)=>setForm({...form,allowances:v})} placeholder="Transport, meals..."/>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-xs font-bold uppercase text-red-500 mb-3">📉 Deductions</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Advance Deduction ($)" value={form.advance_deduction} onChange={(v:string)=>setForm({...form,advance_deduction:v})}/>
                                    <Field label="Unpaid Leave ($)" value={form.unpaid_leave_deduction} onChange={(v:string)=>setForm({...form,unpaid_leave_deduction:v})}/>
                                    <Field label="Other Deductions ($)" value={form.deductions} onChange={(v:string)=>setForm({...form,deductions:v})}/>
                                </div>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-700">Net Salary</span>
                                <span className="text-2xl font-bold text-emerald-600">${net()}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"/>
                            </div>

                            <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                                <input type="checkbox" checked={!!form.skip_signature} onChange={e=>setForm({...form,skip_signature:e.target.checked})} className="mt-0.5"/>
                                <span>One-off bonus/correction — skip the signature requirement and authorize directly.</span>
                            </label>
                        </div>
                        <div className="p-6 border-t flex gap-3">
                            <button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={generatePayslip} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                {saving ? "Saving..." : "Save Payslip"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
