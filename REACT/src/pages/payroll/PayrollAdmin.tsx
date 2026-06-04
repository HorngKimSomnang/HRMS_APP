import { useState, useEffect } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Wallet, CheckCircle, XCircle, AlertCircle, RefreshCw, Plus, FileText, X, ShieldCheck, Clock, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'sonner';

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];


const STATUS_CFG: any = {
    draft:    { label:"Draft",    color:"text-gray-600",    bg:"bg-gray-50",    border:"border-gray-200",    icon: Clock },
    pending:  { label:"Pending",  color:"text-amber-700",   bg:"bg-amber-50",   border:"border-amber-200",   icon: AlertCircle },
    approved: { label:"Authorized", color:"text-emerald-700", bg:"bg-emerald-50", border:"border-emerald-200", icon: ShieldCheck },
    paid:     { label:"Paid",     color:"text-blue-700",    bg:"bg-blue-50",    border:"border-blue-200",    icon: CheckCircle },
    rejected: { label:"Rejected", color:"text-red-700",     bg:"bg-red-50",     border:"border-red-200",     icon: XCircle },
};

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
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [filterMonth, setFilterMonth] = useState<string>("");
    const [filterYear, setFilterYear] = useState<string>("");

    const filteredPayslips = payslips.filter((p: any) => {
        if (filterMonth && p.month !== filterMonth) return false;
        if (filterYear && p.year !== filterYear) return false;
        return true;
    });

    const [companyLogo, setCompanyLogo] = useState<HTMLImageElement | null>(null);

    const blankForm = { employee_id:"", month:"01", year: String(new Date().getFullYear()),
        basic_salary:"", overtime_amount:"0", commission:"0",
        attendance_bonus:"0", allowances:"0", advance_deduction:"0", deductions:"0", notes:"" };
    const [form, setForm] = useState<any>(blankForm);

    const net = () => {
        const n = (k: string) => parseFloat(form[k]||"0")||0;
        return (n("basic_salary")+n("overtime_amount")+n("commission")+n("attendance_bonus")+n("allowances")
               -n("advance_deduction")-n("deductions")).toFixed(2);
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
        
        // Preload logo to avoid async issues during PDF generation
        const img = new Image();
        img.src = "/logo.png";
        img.onload = () => setCompanyLogo(img);
    }, []);

    // Auto-calculate overtime from approved requests
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



    const updatePayslipStatus = async (id:number, status:string) => {
        setUpdatingId(id);
        try { await api.patch(`/payslips/${id}`,{status}); setPayslips(p=>p.map(r=>r.id===id?{...r,status}:r)); }
        catch (e:any) { toast.error(e.response?.data?.message || "Failed to update payslip status"); } finally { setUpdatingId(null); }
    };

    const markPayslipSigned = async (id:number) => {
        setUpdatingId(id);
        try { await api.post(`/payslips/${id}/sign`); setPayslips(p=>p.map(r=>r.id===id?{...r,is_signed:1}:r)); }
        catch (e:any) { toast.error(e.response?.data?.message || "Failed to mark payslip as signed"); } finally { setUpdatingId(null); }
    };

    const downloadPayslipPDF = (slip: any) => {
        try {
            const doc = new jsPDF();
            const monthName = MONTH_NAMES[parseInt(slip.month) - 1] || slip.month;
            const employeeName = slip.employee?.user?.name || "Employee";

            if (companyLogo) {
                doc.addImage(companyLogo, 'PNG', 14, 15, 18, 18);
            }

            // Header
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

            const doc = new jsPDF("landscape");

            if (companyLogo) {
                doc.addImage(companyLogo, 'PNG', 14, 15, 18, 18);
            }

            doc.setFontSize(20);
            doc.setTextColor(30, 64, 175);
            doc.text("HEN CHEN INVESTMENT CO.LTD", 36, 23);

            doc.setFontSize(14);
            doc.setTextColor(55, 65, 81);
            doc.text(`Master Signature Roster`, 36, 31);
            
            doc.setFontSize(10);
            doc.text("All employees must physically sign next to their name to verify their work hours and salary.", 14, 40);

            const tableData = filteredPayslips.map((slip: any, i: number) => {
                let signatureText = "";
                if (slip.is_signed === 1 || slip.is_signed === true) {
                    const datePart = slip.signed_at && slip.signed_at.length >= 10 ? slip.signed_at.substring(0, 10) : "";
                    signatureText = `Signed ${datePart ? '('+datePart+')' : ''}`;
                }
                
                const monthName = MONTH_NAMES[parseInt(slip.month) - 1] || slip.month;
                
                return [
                    (i + 1).toString(),
                    slip.employee?.user?.name || "Unknown",
                    `${monthName} ${slip.year}`,
                    `$${parseFloat(slip.net_salary).toFixed(2)}`,
                    STATUS_CFG[slip.status]?.label || slip.status,
                    "", // Date column
                    signatureText
                ];
            });

            autoTable(doc, {
                startY: 45,
                head: [["No.", "Employee Name", "Pay Period", "Net Salary", "Status", "Date", "Employee Signature"]],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 5, valign: 'middle' },
                headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold', halign: 'left', valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 45 },
                    2: { cellWidth: 30 }, // Pay Period
                    3: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }, // Net Salary
                    4: { cellWidth: 25 },
                    5: { cellWidth: 30 },   // Date column
                    6: { cellWidth: 90 } // Signature column
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY || 160;

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text("________________________________", 14, finalY + 30);
            doc.text("HR / Admin Signature", 14, finalY + 37);

            doc.save("Master_Signature_Roster.pdf");
        } catch (e: any) { toast.error("Download failed: " + e.message); console.error(e); }
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

                // Header
                doc.setFontSize(22);
                doc.setTextColor(30, 64, 175);
                doc.text("HEN CHEN INVESTMENT CO.LTD", 36, 23);

                doc.setFontSize(14);
                doc.setTextColor(55, 65, 81);
                doc.text("Salary Payslip / Verification Sheet", 36, 31);

                // Employee Info
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

            doc.save(`Batch_Individual_Payslips.pdf`);
        } catch (e: any) { toast.error("Download failed: " + e.message); console.error(e); }
    };

    const generatePayslip = async () => {
        if (!form.employee_id||!form.basic_salary){ toast("Select an employee and enter basic salary."); return; }
        setSaving(true);
        try {
            await api.post("/payslips", {...form, basic_salary: parseFloat(form.basic_salary),
                overtime_amount: parseFloat(form.overtime_amount||"0"),
                commission: parseFloat(form.commission||"0"),
                attendance_bonus: parseFloat(form.attendance_bonus||"0"),
                allowances: parseFloat(form.allowances||"0"),
                advance_deduction: parseFloat(form.advance_deduction||"0"),
                deductions: parseFloat(form.deductions||"0"),
            });
            setShowModal(false); setForm(blankForm); fetchData();
        } catch(e:any){ toast.error(e.response?.data?.message||"Failed to generate payslip"); }
        finally { setSaving(false); }
    };


    return (
        <div className="space-y-6">
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
                    <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                        <Plus className="h-4 w-4"/> Generate Payslip
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
                <div className="bg-white rounded-xl border shadow-sm flex flex-col mt-6">
                    {payslips.length > 0 && (
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-sm font-semibold text-gray-700">All Payslips</h2>
                            <div className="flex gap-2">
                                <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
                                    <option value="">All Months</option>
                                    {MONTH_NAMES.map((m, i) => <option key={i} value={MONTHS[i]}>{m}</option>)}
                                </select>
                                <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
                                    <option value="">All Years</option>
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                                </select>
                                <button onClick={downloadBatchPayslips} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                                    <Printer className="h-4 w-4 text-gray-500" /> Batch Individual
                                </button>
                                <button onClick={downloadMasterRosterPDF} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                                    <FileText className="h-4 w-4 text-gray-500" /> Print Master Roster
                                </button>
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
                                                <div className="font-medium text-red-500">-${(parseFloat(slip.advance_deduction||0)+parseFloat(slip.deductions||0)).toFixed(2)}</div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-red-400">
                                                    {parseFloat(slip.advance_deduction) > 0 && <span>Adv: -${slip.advance_deduction}</span>}
                                                    {parseFloat(slip.deductions) > 0 && <span>Ded: -${slip.deductions}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-600 text-base">${slip.net_salary}</td>
                                        <td className="px-6 py-4">
                                            {(() => { const sc = STATUS_CFG[slip.status] ?? STATUS_CFG.pending; return (
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color} ${sc.border}`}>
                                                        <sc.icon className="h-3 w-3"/>{sc.label}
                                                    </span>
                                                    <span className={`text-[10px] font-medium flex items-center gap-1 ${slip.is_signed === 1 || slip.is_signed === true ? 'text-blue-600' : 'text-amber-600'}`}>
                                                        {slip.is_signed === 1 || slip.is_signed === true 
                                                            ? <><CheckCircle className="h-3 w-3"/> Verified</> 
                                                            : <><AlertCircle className="h-3 w-3"/> Unsigned</>}
                                                    </span>
                                                </div>
                                            ); })()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => downloadPayslipPDF(slip)} title="Print Signature Sheet"
                                                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                                                    <Printer className="h-4 w-4"/>
                                                </button>
                                                {/* Admin Actions: Mark Signed (Office verification) */}
                                                {!(slip.is_signed === 1 || slip.is_signed === true) && (
                                                    <button disabled={updatingId===slip.id} onClick={()=>markPayslipSigned(slip.id)}
                                                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1 transition-colors">
                                                        <CheckCircle className="h-3 w-3"/> Verify Sign
                                                    </button>
                                                )}
                                                
                                                {/* Super Admin: Authorize draft -> approved, then mark paid */}
                                                {isSuperAdmin && slip.status === "draft" && (
                                                    <button disabled={updatingId===slip.id} onClick={()=>updatePayslipStatus(slip.id,"approved")}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                                                        <ShieldCheck className="h-3 w-3"/> Authorize
                                                    </button>
                                                )}
                                                {isSuperAdmin && slip.status === "approved" && (
                                                    <button disabled={updatingId===slip.id} onClick={()=>updatePayslipStatus(slip.id,"paid")}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                                                        Mark Paid
                                                    </button>
                                                )}
                                                {!isSuperAdmin && slip.status === "draft" && (
                                                    <span className="text-xs text-gray-400 italic">Awaiting Auth</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    </div>
                </div>
            )}

            {/* Generate Payslip Modal */}
            {showModal&&(
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                            <h2 className="text-lg font-bold text-gray-900">Generate Payslip {!isSuperAdmin && <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ml-1">Draft — Requires Super Admin Authorization</span>}</h2>
                            <p className="text-sm text-muted-foreground">{isSuperAdmin ? "Create and immediately authorize a payslip." : "Prepare a draft payslip for Super Admin review."}</p>
                        </div>
                            <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Employee + Period */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Employee</label>
                                <select value={form.employee_id} onChange={e => {
                                    const empId = e.target.value;
                                    const emp = employees.find((x:any) => x.id.toString() === empId);
                                    setForm({
                                        ...form, 
                                        employee_id: empId, 
                                        basic_salary: emp ? (emp.salary || emp.basic_salary || "") : ""
                                    });
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
                                <p className="text-xs font-bold uppercase text-red-500 mb-3">➖ Deductions</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Advance Deduction ($)" value={form.advance_deduction} onChange={(v:string)=>setForm({...form,advance_deduction:v})}/>
                                    <Field label="Other Deductions ($)" value={form.deductions} onChange={(v:string)=>setForm({...form,deductions:v})} placeholder="Tax, insurance..."/>
                                </div>
                            </div>

                            {/* Net Preview */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-700">Net Salary (calculated)</span>
                                <span className="text-2xl font-bold text-emerald-600">${net()}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes (optional)</label>
                                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Any remarks for this payslip..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"/>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t">
                            <button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={generatePayslip} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                {saving ? "Saving..." : isSuperAdmin ? "Generate & Authorize" : "Save as Draft"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
