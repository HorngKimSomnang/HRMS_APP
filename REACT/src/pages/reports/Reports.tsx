import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Download, Send } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function Reports() {
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.some((role: any) => role.name === 'Super Admin');

    const [reportTypes, setReportTypes] = useState<string[]>(["attendance"]);
    
    // Default to the current month's start and end dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });
    const [reportDataMap, setReportDataMap] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(false);
    
    // Employee filter
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

    // Fetch employees for dropdown
    useEffect(() => {
        api.get('/employees?status=active&all=true').then(res => {
            const data = res.data.data;
            setEmployees(Array.isArray(data) ? data : (data?.data || []));
        }).catch(err => console.error(err));
    }, []);

    const generateReport = async () => {
        if (reportTypes.length === 0) return toast("Please select at least one report type.");
        setLoading(true);
        try {
            const params: any = { start_date: dateRange.start || new Date().toISOString().split('T')[0], end_date: dateRange.end || new Date().toISOString().split('T')[0] };
            
            const newMap: Record<string, any[]> = {};
            await Promise.all(reportTypes.map(async (type) => {
                const endpoint = `/reports/${type}`;
                const typeParams = { ...params };
                if (selectedEmployeeId && type !== "employees") {
                    typeParams.employee_id = selectedEmployeeId;
                }
                const res = await api.get(endpoint, { params: typeParams });
                newMap[type] = res.data.data || res.data;
            }));
            
            setReportDataMap(newMap);
        } catch (error) {
            console.error("Failed to fetch report", error);
        } finally {
            setLoading(false);
        }
    };

    const sendToSuperAdmin = async () => {
        const start = dateRange.start || new Date().toISOString().split('T')[0];
        const end = dateRange.end || new Date().toISOString().split('T')[0];
        
        setLoading(true);
        try {
            await api.post("/reports/send-to-superadmin", {
                start_date: start,
                end_date: end,
                report_type: reportTypes.join(', ')
            });
            toast.success("Report successfully sent to Super Admin!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send report");
        } finally {
            setLoading(false);
        }
    };

    const getReportConfig = (type: string) => {
        if (type === "attendance") {
            return {
                title: "Attendance Report",
                headers: ["Date", "Employee", "Status", "Clock In", "Clock Out", "Hours"],
                mapRow: (row: any) => [
                    new Date(row.date).toLocaleDateString(),
                    row.employee?.user?.name || `${row.employee?.first_name} ${row.employee?.last_name}`,
                    row.status,
                    row.clock_in ? new Date(row.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                    row.clock_out ? new Date(row.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                    row.hours_worked || '-'
                ]
            };
        } else if (type === "leaves") {
            return {
                title: "Leaves Report",
                headers: ["Start", "End", "Employee", "Type", "Days", "Status"],
                mapRow: (row: any) => [
                    new Date(row.start_date).toLocaleDateString(),
                    new Date(row.end_date).toLocaleDateString(),
                    row.employee?.user?.name || `${row.employee?.first_name} ${row.employee?.last_name}`,
                    row.leave_type || '-',
                    row.days_count || '-',
                    row.status
                ]
            };
        } else if (type === "payroll") {
            return {
                title: "Payroll & Payslips Report",
                headers: ["Period", "Employee", "Basic Salary", "Overtime", "Commissions", "Net Salary", "Status"],
                mapRow: (row: any) => [
                    `${row.month} ${row.year}`,
                    row.employee?.user?.name || `${row.employee?.first_name} ${row.employee?.last_name}`,
                    `$${row.basic_salary}`,
                    `$${row.overtime_amount}`,
                    `$${row.commission}`,
                    `$${row.net_salary}`,
                    row.status
                ]
            };
        } else if (type === "overtime") {
            return {
                title: "Overtime Requests Report",
                headers: ["Date", "Employee", "Start Time", "End Time", "Hours", "Status"],
                mapRow: (row: any) => [
                    new Date(row.date).toLocaleDateString(),
                    row.employee?.user?.name || `${row.employee?.first_name} ${row.employee?.last_name}`,
                    row.start_time,
                    row.end_time,
                    row.hours,
                    row.status
                ]
            };
        } else {
            return {
                title: "Employees Report",
                headers: ["Joined", "Name", "Code", "Dept", "Title", "Status"],
                mapRow: (row: any) => [
                    row.joining_date ? new Date(row.joining_date).toLocaleDateString() : '-',
                    row.user?.name || `${row.first_name} ${row.last_name}`,
                    row.employee_code,
                    row.department || '-',
                    row.job_title || '-',
                    row.status
                ]
            };
        }
    };

    const exportToExcel = () => {
        if (Object.keys(reportDataMap).length === 0) return;

        const workbook = XLSX.utils.book_new();

        reportTypes.forEach(type => {
            const data = reportDataMap[type];
            if (!data || data.length === 0) return;
            const cfg = getReportConfig(type);

            // ── Build rows ──────────────────────────────────────────────────
            // Row 1: Company name
            const companyRow = ['HCI — Human Capital Intelligence'];
            // Row 2: Report title
            const titleRow = [cfg.title];
            // Row 3: Period
            const periodRow = [`Report Period: ${dateRange.start || '—'} to ${dateRange.end || '—'}`, '', `Generated: ${new Date().toLocaleString()}`];
            // Row 4: blank separator
            const blankRow: string[] = [];
            // Row 5: column headers
            const headerRow = cfg.headers;
            // Rows 6+: data
            const dataRows = data.map(r => cfg.mapRow(r));

            const sheetData = [companyRow, titleRow, periodRow, blankRow, headerRow, ...dataRows];
            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            // ── Column widths (auto-fit based on longest value) ─────────────
            const colWidths = cfg.headers.map((h, colIdx) => {
                const maxLen = Math.max(
                    h.length,
                    ...dataRows.map(row => String(row[colIdx] ?? '').length)
                );
                return { wch: Math.min(maxLen + 4, 40) };
            });
            ws['!cols'] = colWidths;

            // ── Row heights for info rows ───────────────────────────────────
            ws['!rows'] = [{ hpx: 18 }, { hpx: 20 }, { hpx: 15 }, { hpx: 8 }, { hpx: 18 }];

            // ── Merge company name across all columns ───────────────────────
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: cfg.headers.length - 1 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: cfg.headers.length - 1 } },
            ];

            // ── Sheet name (max 31 chars, Excel limit) ──────────────────────
            const sheetName = cfg.title.replace(/[\\\/*?\[\]]/g, '').slice(0, 31);
            XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        });

        const filename = `HR_Report_${dateRange.start}_to_${dateRange.end}.xlsx`;
        XLSX.writeFile(workbook, filename);
    };

    const exportToPDF = () => {
        if (Object.keys(reportDataMap).length === 0) return;
        
        const generateWithDoc = (doc: jsPDF, logoImg?: HTMLImageElement) => {
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 14;
            let currentY = 20;
            
            const drawPageHeader = (isFirstPage: boolean) => {
                if (isFirstPage) {
                    if (logoImg) {
                        // Align logo to the top right
                        doc.addImage(logoImg, 'PNG', pageW - margin - 24, 12, 24, 24);
                    }

                    // Company name
                    doc.setFontSize(9);
                    doc.setTextColor(120);
                    doc.setFont('helvetica', 'bold');
                    doc.text('HCI — HUMAN CAPITAL INTELLIGENCE', margin, 18);

                    // Big report title
                    doc.setFontSize(22);
                    doc.setTextColor(40, 40, 40);
                    doc.text('Official HR Report', margin, 28);

                    // Meta info
                    doc.setFontSize(9);
                    doc.setTextColor(100);
                    doc.setFont('helvetica', 'normal');
                    const period = `Report Period: ${dateRange.start || '—'}  to  ${dateRange.end || '—'}`;
                    const genDate = `Generated: ${new Date().toLocaleString()}`;
                    doc.text(period, margin, 36);
                    doc.text(genDate, margin, 41);

                    // Clean elegant separator line
                    doc.setDrawColor(220);
                    doc.setLineWidth(0.5);
                    doc.line(margin, 48, pageW - margin, 48);

                    currentY = 56;
                } else {
                    // Subsequent pages: compact header
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text('Official HR Report — HCI', margin, 10);
                    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - margin, 10, { align: 'right' });
                    doc.setDrawColor(230);
                    doc.setLineWidth(0.5);
                    doc.line(margin, 14, pageW - margin, 14);
                    currentY = 22;
                }
            };

            // ── Helper: draw page footer ──────────────────────────────────────
            const drawFooter = () => {
                const totalPages = doc.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.setDrawColor(230);
                    doc.setLineWidth(0.5);
                    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text('Confidential — For Internal Use Only', margin, pageH - 9);
                    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 9, { align: 'right' });
                }
            };

            // ── Draw first-page header ────────────────────────────────────────
            drawPageHeader(true);

            // ── Render each report section ────────────────────────────────────
            reportTypes.forEach((type, idx) => {
                const data = reportDataMap[type];
                if (!data || data.length === 0) return;
                const cfg = getReportConfig(type);

                // Add spacing between sections
                if (idx > 0) currentY += 8;

                // Page break if not enough space
                if (currentY > pageH - 50) {
                    doc.addPage();
                    drawPageHeader(false);
                }

                // Section title (Modern, minimal)
                doc.setFontSize(12);
                doc.setTextColor(50, 50, 50);
                doc.setFont('helvetica', 'bold');
                doc.text(cfg.title, margin, currentY + 2);

                // Row count indicator
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.setFont('helvetica', 'normal');
                doc.text(`${data.length} record${data.length !== 1 ? 's' : ''}`, pageW - margin, currentY + 2, { align: 'right' });

                currentY += 6;

                autoTable(doc, {
                    startY: currentY,
                    head: [cfg.headers],
                    body: data.map(cfg.mapRow),
                    theme: 'plain',
                    headStyles: {
                        fillColor: [248, 250, 252],
                        textColor: [71, 85, 105],
                        fontStyle: 'bold',
                        fontSize: 8,
                        cellPadding: 4,
                        lineWidth: { bottom: 0.5 },
                        lineColor: [203, 213, 225],
                    },
                    bodyStyles: {
                        fontSize: 8,
                        textColor: [51, 65, 85],
                        cellPadding: 4,
                    },
                    alternateRowStyles: {
                        fillColor: [252, 253, 254],
                    },
                    styles: {
                        lineWidth: { bottom: 0.1 },
                        lineColor: [226, 232, 240],
                        overflow: 'linebreak',
                    },
                    margin: { left: margin, right: margin, bottom: 20 },
                });

                currentY = (doc as any).lastAutoTable.finalY + 12;
            });

            // ── Footers on all pages ──────────────────────────────────────────
            drawFooter();

            const filename = `HR_Report_${dateRange.start}_to_${dateRange.end}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
        };

        const img = new Image();
        img.src = '/logo.png';
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const doc = new jsPDF();
            generateWithDoc(doc, img);
        };
        img.onerror = () => {
            console.warn("Failed to load logo for PDF.");
            const doc = new jsPDF();
            generateWithDoc(doc);
        };
    };

    const toggleReportType = (type: string) => {
        if (reportTypes.includes(type)) {
            setReportTypes(reportTypes.filter(t => t !== type));
        } else {
            setReportTypes([...reportTypes, type]);
        }
        setReportDataMap({});
    };

    const hasData = Object.values(reportDataMap).some(arr => arr && arr.length > 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isSuperAdmin ? "Company Reports" : "Reports & Analytics"}</h1>
                    <p className="text-muted-foreground mt-1">{isSuperAdmin ? "Review reports submitted by the HR Manager." : "Generate and export system reports."}</p>
                </div>
                <div className="flex gap-2">
                    {!isSuperAdmin && (
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100" onClick={sendToSuperAdmin} disabled={!hasData || loading}>
                            <Send className="mr-2 h-4 w-4" /> Send to CEO
                        </Button>
                    )}
                    <Button variant="outline" onClick={exportToExcel} disabled={!hasData}>
                        <Download className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                    <Button variant="outline" onClick={exportToPDF} disabled={!hasData}>
                        <Download className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap mb-4 gap-2 border-b pb-4">
                {[
                    { id: "attendance", label: "Attendance" },
                    { id: "leaves", label: "Leaves" },
                    { id: "overtime", label: "Overtime" },
                    { id: "payroll", label: "Payroll" },
                    { id: "employees", label: "Employees" }
                ].map(tab => {
                    const isSelected = reportTypes.includes(tab.id);
                    return (
                        <button
                            key={tab.id}
                            onClick={() => toggleReportType(tab.id)}
                            className={`text-xs font-bold px-4 py-2 rounded-full border transition-colors uppercase tracking-wide ${isSelected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                        >
                            {isSelected && <span className="mr-1">✓</span>}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 bg-card p-4 rounded-lg border shadow-sm mb-6">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                </div>
                {(!reportTypes.includes("employees") || reportTypes.length > 1) && (
                    <div className="grid gap-2 min-w-[200px]">
                        <label className="text-sm font-medium">Filter by Employee</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                            <option value="">All Employees</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <Button onClick={generateReport} disabled={loading}>
                    {loading ? "Loading..." : (isSuperAdmin ? "View Report" : "Generate Report")}
                </Button>
            </div>

            {/* Report Tables */}
            <div className="space-y-8">
                {reportTypes.map(type => {
                    const data = reportDataMap[type];
                    const cfg = getReportConfig(type);
                    
                    return (
                        <div key={type} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                            <div className="bg-muted/30 px-4 py-3 border-b">
                                <h3 className="font-semibold text-lg">{cfg.title}</h3>
                            </div>
                            <Table>
                                <TableHeader className="bg-muted/10">
                                    <TableRow>
                                        {cfg.headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={cfg.headers.length} className="text-center h-32 text-muted-foreground">Fetching data...</TableCell>
                                        </TableRow>
                                    ) : !data || data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={cfg.headers.length} className="text-center h-32 text-muted-foreground">
                                                No records found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((row: any, i) => (
                                            <TableRow key={i} className="hover:bg-muted/50">
                                                {cfg.mapRow(row).map((val: any, j: number) => (
                                                    <TableCell key={j}>
                                                        {j === 2 && type === "attendance" ? (
                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${val === 'Present' ? 'bg-green-50 text-green-700' : val === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                                                {val}
                                                            </span>
                                                        ) : (j === 6 && type === "payroll") || (j === 5 && type === "leaves") || (j === 5 && type === "employees") || (j === 5 && type === "overtime") ? (
                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${val === 'approved' || val === 'active' || val === 'paid' ? 'bg-green-50 text-green-700' : val === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                                                {val}
                                                            </span>
                                                        ) : val}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    );
                })}
                {reportTypes.length === 0 && (
                    <div className="text-center p-12 bg-card rounded-lg border text-muted-foreground shadow-sm">
                        Select at least one report type above to view data.
                    </div>
                )}
            </div>
        </div>
    );
}
