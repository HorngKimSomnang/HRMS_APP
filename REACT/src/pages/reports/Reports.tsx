import {
    useCallback,
    useEffect,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";
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
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { subscribeApiCacheInvalidation } from '@/services/apiCache';

interface CustomEntitySummary {
    id: number;
    name: string;
    slug: string;
}

interface CustomEntityField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'dropdown' | 'textarea' | 'file';
    options?: string[] | null;
}

const reportSessionState: Record<string, unknown> = {};
const activeReportInvalidators = new Set<(types: Set<string>) => void>();
const allReportTypes = new Set([
    "attendance",
    "leaves",
    "overtime",
    "payroll",
    "employees",
    "custom_entities",
]);

const reportTypesForResources = (resources?: string[]) => {
    if (!resources) return new Set(allReportTypes);

    const types = new Set<string>();
    if (resources.includes("employees")) return new Set(allReportTypes);
    if (resources.includes("attendance")) types.add("attendance");
    if (resources.some(resource => ["leaves", "leave-types"].includes(resource))) types.add("leaves");
    if (resources.includes("overtimes")) types.add("overtime");
    if (resources.includes("payslips")) types.add("payroll");
    if (resources.includes("entities")) types.add("custom_entities");

    const hasSpecificResource = types.size > 0;
    if (!hasSpecificResource && resources.includes("reports")) {
        return new Set(allReportTypes);
    }

    return types;
};

subscribeApiCacheInvalidation(resources => {
    const invalidatedTypes = reportTypesForResources(resources);
    if (invalidatedTypes.size === 0) return;

    const retainedData = (reportSessionState.reportDataMap ?? {}) as Record<string, any[]>;
    reportSessionState.reportDataMap = Object.fromEntries(
        Object.entries(retainedData).filter(([type]) => !invalidatedTypes.has(type)),
    );
    activeReportInvalidators.forEach(invalidate => invalidate(invalidatedTypes));
});

function useRetainedReportState<T>(
    key: string,
    initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValueState] = useState<T>(
        () => (reportSessionState[key] as T | undefined) ?? initialValue,
    );

    const setValue = useCallback<Dispatch<SetStateAction<T>>>((nextValue) => {
        setValueState(current => {
            const resolved = typeof nextValue === "function"
                ? (nextValue as (previous: T) => T)(current)
                : nextValue;
            reportSessionState[key] = resolved;
            return resolved;
        });
    }, [key]);

    return [value, setValue];
}

export default function Reports() {
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.some((role: any) => role.name === 'Super Admin');

    const [reportTypes, setReportTypes] = useRetainedReportState<string[]>(
        "reportTypes",
        ["attendance"],
    );
    
    // Default to the current month's start and end dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const [dateRange, setDateRange] = useRetainedReportState(
        "dateRange",
        { start: firstDay, end: lastDay },
    );
    const [reportDataMap, setReportDataMap] = useRetainedReportState<Record<string, any[]>>(
        "reportDataMap",
        {},
    );
    const [collapsedReports, setCollapsedReports] = useRetainedReportState<Record<string, boolean>>(
        "collapsedReports",
        {},
    );
    const [loading, setLoading] = useState(false);
    
    // Employee filter
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useRetainedReportState(
        "selectedEmployeeId",
        "",
    );
    const [customEntities, setCustomEntities] = useState<CustomEntitySummary[]>([]);
    const [selectedEntitySlug, setSelectedEntitySlug] = useRetainedReportState(
        "selectedEntitySlug",
        "",
    );
    const [customEntityFields, setCustomEntityFields] = useState<CustomEntityField[]>([]);
    const [customFieldKey, setCustomFieldKey] = useRetainedReportState("customFieldKey", "");
    const [customFieldValue, setCustomFieldValue] = useRetainedReportState("customFieldValue", "");

    useEffect(() => {
        const invalidateVisibleReports = (types: Set<string>) => {
            setReportDataMap(current => Object.fromEntries(
                Object.entries(current).filter(([type]) => !types.has(type)),
            ));
        };

        activeReportInvalidators.add(invalidateVisibleReports);
        return () => {
            activeReportInvalidators.delete(invalidateVisibleReports);
        };
    }, [setReportDataMap]);

    const fetchReportSources = useCallback(async () => {
        try {
            const [employeeRes, entityRes] = await Promise.all([
                api.get('/employees?status=active&all=true'),
                api.get('/entities'),
            ]);
            const employeeData = employeeRes.data.data;
            setEmployees(Array.isArray(employeeData) ? employeeData : (employeeData?.data || []));

            const entityData = Array.isArray(entityRes.data?.data) ? entityRes.data.data : [];
            setCustomEntities(entityData);
            setSelectedEntitySlug(current => current || entityData[0]?.slug || "");
        } catch (error) {
            console.error(error);
        }
    }, [setSelectedEntitySlug]);

    // Fetch employees and custom report sources.
    useEffect(() => {
        fetchReportSources();
    }, [fetchReportSources]);

    useEffect(() => {
        if (!selectedEntitySlug) {
            setCustomEntityFields([]);
            return;
        }

        api.get(`/entities/${selectedEntitySlug}`).then(res => {
            setCustomEntityFields(res.data?.data?.fields || []);
            setCustomFieldKey("");
            setCustomFieldValue("");
        }).catch(err => {
            console.error(err);
            setCustomEntityFields([]);
        });
    }, [selectedEntitySlug, setCustomFieldKey, setCustomFieldValue]);

    const generateReport = async (silent = false) => {
        if (reportTypes.length === 0) return toast("Please select at least one report type.");
        if (reportTypes.includes("custom_entities") && !selectedEntitySlug) {
            return toast("Please select a custom entity.");
        }
        if (!silent) setLoading(true);
        try {
            const params: any = { start_date: dateRange.start || new Date().toISOString().split('T')[0], end_date: dateRange.end || new Date().toISOString().split('T')[0] };
            
            const newMap: Record<string, any[]> = {};
            await Promise.all(reportTypes.map(async (type) => {
                const endpoint = type === "custom_entities"
                    ? "/reports/custom-entities"
                    : `/reports/${type}`;
                const typeParams = { ...params };
                if (selectedEmployeeId && type !== "employees") {
                    typeParams.employee_id = selectedEmployeeId;
                }
                if (type === "custom_entities") {
                    typeParams.entity_slug = selectedEntitySlug;
                    if (customFieldKey && customFieldValue.trim()) {
                        typeParams.field_key = customFieldKey;
                        typeParams.field_value = customFieldValue.trim();
                    }
                }
                const res = await api.get(endpoint, { params: typeParams });
                newMap[type] = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
            }));
            
            setReportDataMap(current => ({ ...current, ...newMap }));
        } catch (error) {
            console.error("Failed to fetch report", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useLiveRefresh(async () => {
        await fetchReportSources();
        if (Object.keys(reportDataMap).length > 0) {
            await generateReport(true);
        }
    }, {
        resources: [
            'attendance',
            'leaves',
            'overtimes',
            'payslips',
            'employees',
            'entities',
        ],
    });

    const formatCustomValue = (field: CustomEntityField, value: any): string => {
        if (value === null || value === undefined || value === "") return "-";
        if (field.type === "boolean") return value ? "Yes" : "No";
        if (field.type === "date") {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString();
        }
        if (field.type === "file" && typeof value === "object") {
            return value?.name || "Attached file";
        }
        return String(value);
    };

    const getReportConfig = (type: string) => {
        if (type === "attendance") {
            return {
                title: "Attendance Report",
                headers: ["Date", "Employee", "Status", "Clock In", "Clock Out", "Hours"],
                mapRow: (row: any) => [
                    new Date(row.date).toLocaleDateString(),
                    row.employee?.user?.name || `${row.employee?.last_name} ${row.employee?.first_name}`,
                    ({
                        present: 'Present',
                        late: 'Late',
                        early_out: 'Early Out',
                        absent: 'Absent',
                        warning: 'Warning',
                        on_leave: 'On Leave',
                        day_off: 'Day Off',
                    } as Record<string, string>)[row.status] || row.status,
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
                    row.employee?.user?.name || `${row.employee?.last_name} ${row.employee?.first_name}`,
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
                    row.employee?.user?.name || `${row.employee?.last_name} ${row.employee?.first_name}`,
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
                    row.employee?.user?.name || `${row.employee?.last_name} ${row.employee?.first_name}`,
                    row.start_time,
                    row.end_time,
                    row.hours,
                    row.status
                ]
            };
        } else if (type === "custom_entities") {
            const selectedEntity = customEntities.find(entity => entity.slug === selectedEntitySlug);
            return {
                title: `${selectedEntity?.name || "Custom Entity"} Report`,
                headers: ["Submitted", "Submitted By", ...customEntityFields.map(field => field.label)],
                mapRow: (row: any) => [
                    row.created_at ? new Date(row.created_at).toLocaleString() : "-",
                    row.creator?.name || "Admin / System",
                    ...customEntityFields.map(field => formatCustomValue(field, row.data?.[field.key]))
                ]
            };
        } else {
            return {
                title: "Employees Report",
                headers: ["Joined", "Name", "Code", "Dept", "Title", "Status"],
                mapRow: (row: any) => [
                    row.joining_date ? new Date(row.joining_date).toLocaleDateString() : '-',
                    row.user?.name || `${row.last_name} ${row.first_name}`,
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
            const sheetName = cfg.title.replace(/[\\/*?[\]]/g, '').slice(0, 31);
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

            // ── Color palette ─────────────────────────────────────────────────
            const navyDark: [number, number, number]  = [15, 23, 60];
            const navyMid:  [number, number, number]  = [30, 58, 138];
            const accentBlue: [number, number, number] = [59, 130, 246];
            const slateLight: [number, number, number] = [241, 245, 249];
            const slateBorder: [number, number, number] = [203, 213, 225];
            const textDark: [number, number, number]  = [15, 23, 42];
            const textMid:  [number, number, number]  = [71, 85, 105];
            const textLight: [number, number, number] = [148, 163, 184];
            const white: [number, number, number]     = [255, 255, 255];
            const rowAlt: [number, number, number]    = [248, 250, 252];

            // ── Section accent colors ─────────────────────────────────────────
            const sectionColors: Record<string, [number, number, number]> = {
                'Attendance Report':  [34, 197, 94],
                'Leaves Report':      [251, 146, 60],
                'Payroll Report':     [99, 102, 241],
                'Overtime Report':    [236, 72, 153],
                'Employee Report':    [20, 184, 166],
            };

            const drawPageHeader = (isFirstPage: boolean) => {
                if (isFirstPage) {
                    // ── Full-width hero banner ────────────────────────────────
                    doc.setFillColor(...navyDark);
                    doc.rect(0, 0, pageW, 54, 'F');

                    // Subtle accent stripe
                    doc.setFillColor(...navyMid);
                    doc.rect(0, 44, pageW, 10, 'F');

                    // Logo
                    if (logoImg) {
                        doc.addImage(logoImg, 'PNG', pageW - margin - 26, 6, 26, 26);
                    }

                    // Company tag
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7);
                    doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
                    doc.text('HCI — HUMAN CAPITAL INTELLIGENCE', margin, 13);

                    // Main title
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(20);
                    doc.setTextColor(...white);
                    doc.text('Official HR Report', margin, 26);

                    // Divider line inside banner
                    doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2]);
                    doc.setLineWidth(0.6);
                    doc.line(margin, 31, margin + 50, 31);

                    // Meta row inside banner
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(...textLight);
                    const period = `Period: ${dateRange.start || '—'} — ${dateRange.end || '—'}`;
                    const genDate = `Generated: ${new Date().toLocaleString()}`;
                    doc.text(period, margin, 39);
                    doc.text(genDate, margin, 46);

                    // "CONFIDENTIAL" watermark badge in top-left
                    doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
                    doc.roundedRect(margin, 1, 28, 6, 1, 1, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(5.5);
                    doc.setTextColor(...white);
                    doc.text('CONFIDENTIAL', margin + 2, 5.4);

                    currentY = 64;
                } else {
                    // Compact header for subsequent pages
                    doc.setFillColor(...navyDark);
                    doc.rect(0, 0, pageW, 12, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7);
                    doc.setTextColor(...textLight);
                    doc.text('HCI — Official HR Report', margin, 8);
                    doc.setTextColor(...accentBlue);
                    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - margin, 8, { align: 'right' });
                    currentY = 20;
                }
            };

            // ── Helper: draw page footer ──────────────────────────────────────
            const drawFooter = () => {
                const totalPages = doc.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);

                    // Footer bar
                    doc.setFillColor(...slateLight);
                    doc.rect(0, pageH - 14, pageW, 14, 'F');

                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(7);
                    doc.setTextColor(...textMid);
                    doc.text('Confidential — For Internal Use Only', margin, pageH - 5.5);

                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...navyMid);
                    doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 5.5, { align: 'right' });
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
                if (idx > 0) currentY += 10;

                // Page break if not enough space
                if (currentY > pageH - 60) {
                    doc.addPage();
                    drawPageHeader(false);
                }

                // Accent color for this section
                const accent = type === 'custom_entities'
                    ? [14, 165, 164] as [number, number, number]
                    : (sectionColors[cfg.title] || navyMid);

                // ── Section header band ──────────────────────────────────────
                doc.setFillColor(...accent);
                doc.rect(margin, currentY - 1, 3, 10, 'F');

                doc.setFontSize(11);
                doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                doc.setFont('helvetica', 'bold');
                doc.text(cfg.title, margin + 6, currentY + 6);

                // Record count pill
                const countLabel = `${data.length} record${data.length !== 1 ? 's' : ''}`;
                const pillW = doc.getTextWidth(countLabel) + 6;
                doc.setFillColor(...slateLight);
                doc.roundedRect(pageW - margin - pillW, currentY + 1, pillW, 7, 2, 2, 'F');
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(textMid[0], textMid[1], textMid[2]);
                doc.text(countLabel, pageW - margin - pillW / 2, currentY + 6, { align: 'center' });

                currentY += 14;

                autoTable(doc, {
                    startY: currentY,
                    head: [cfg.headers],
                    body: data.map(cfg.mapRow),
                    theme: 'plain',
                    headStyles: {
                        fillColor: navyDark,
                        textColor: white,
                        fontStyle: 'bold',
                        fontSize: 8,
                        cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
                    },
                    bodyStyles: {
                        fontSize: 8,
                        textColor: textDark,
                        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
                    },
                    alternateRowStyles: {
                        fillColor: rowAlt,
                    },
                    styles: {
                        lineWidth: 0,
                        overflow: 'linebreak',
                    },
                    rowPageBreak: 'avoid',
                    margin: { left: margin, right: margin, bottom: 20 },
                    didDrawCell: (hookData: any) => {
                        if (hookData.section === 'head' && hookData.column.index === 0) {
                            doc.setFillColor(...accent);
                            doc.rect(hookData.cell.x, hookData.cell.y, 2.5, hookData.cell.height, 'F');
                        }

                        // Draw one deliberate separator across the full table after
                        // every record. AutoTable's plain theme can make per-cell
                        // borders disappear against alternating white rows.
                        if (
                            hookData.section === 'body'
                            && hookData.column.index === cfg.headers.length - 1
                        ) {
                            const separatorY = hookData.cell.y + hookData.cell.height;
                            doc.setDrawColor(...slateBorder);
                            doc.setLineWidth(0.35);
                            doc.line(margin, separatorY, pageW - margin, separatorY);
                        }
                    },
                });

                currentY = (doc as any).lastAutoTable.finalY + 8;
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
            setCollapsedReports(current => {
                const next = { ...current };
                delete next[type];
                return next;
            });
        } else {
            setReportTypes([...reportTypes, type]);
        }
    };

    const toggleReportSection = (type: string) => {
        setCollapsedReports(current => ({
            ...current,
            [type]: !current[type],
        }));
    };

    const hasData = reportTypes.some(type => reportDataMap[type]?.length > 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isSuperAdmin ? "Company Reports" : "Reports & Analytics"}</h1>
                    <p className="text-muted-foreground mt-1">{isSuperAdmin ? "Review reports submitted by the HR Manager." : "Generate and export system reports."}</p>
                </div>
                <div className="flex gap-2">
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
                    { id: "employees", label: "Employees" },
                    { id: "custom_entities", label: "Custom Data" }
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
            <div className="flex flex-wrap items-end gap-4 bg-gradient-to-br from-teal-50/50 via-card to-card p-4 rounded-lg border border-teal-100 shadow-sm mb-6">
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
                                <option key={e.id} value={e.id}>{e.last_name} {e.first_name}</option>
                            ))}
                        </select>
                    </div>
                )}
                {reportTypes.includes("custom_entities") && (
                    <>
                        <div className="grid gap-2 min-w-[220px]">
                            <label className="text-sm font-medium">Custom Entity</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={selectedEntitySlug}
                                onChange={(e) => {
                                    setSelectedEntitySlug(e.target.value);
                                    setReportDataMap(current => {
                                        const next = { ...current };
                                        delete next.custom_entities;
                                        return next;
                                    });
                                }}
                            >
                                {customEntities.length === 0 && <option value="">No custom entities</option>}
                                {customEntities.map(entity => (
                                    <option key={entity.id} value={entity.slug}>{entity.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2 min-w-[200px]">
                            <label className="text-sm font-medium">Filter by Field</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={customFieldKey}
                                onChange={(e) => {
                                    setCustomFieldKey(e.target.value);
                                    setCustomFieldValue("");
                                }}
                            >
                                <option value="">All Records</option>
                                {customEntityFields.map(field => (
                                    <option key={field.key} value={field.key}>{field.label}</option>
                                ))}
                            </select>
                        </div>
                        {customFieldKey && (() => {
                            const field = customEntityFields.find(item => item.key === customFieldKey);
                            if (!field) return null;

                            return (
                                <div className="grid gap-2 min-w-[200px]">
                                    <label className="text-sm font-medium">Filter Value</label>
                                    {field.type === "dropdown" ? (
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={customFieldValue}
                                            onChange={(e) => setCustomFieldValue(e.target.value)}
                                        >
                                            <option value="">All Values</option>
                                            {(field.options || []).map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    ) : field.type === "boolean" ? (
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={customFieldValue}
                                            onChange={(e) => setCustomFieldValue(e.target.value)}
                                        >
                                            <option value="">All Values</option>
                                            <option value="true">Yes</option>
                                            <option value="false">No</option>
                                        </select>
                                    ) : (
                                        <Input
                                            type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                                            value={customFieldValue}
                                            placeholder={`Enter ${field.label.toLowerCase()}`}
                                            onChange={(e) => setCustomFieldValue(e.target.value)}
                                        />
                                    )}
                                </div>
                            );
                        })()}
                    </>
                )}
                <Button onClick={() => generateReport()} disabled={loading}>
                    {loading ? "Loading..." : (isSuperAdmin ? "View Report" : "Generate Report")}
                </Button>
            </div>

            {/* Report Tables */}
            <div className="space-y-8">
                {reportTypes.map(type => {
                    const data = reportDataMap[type];
                    const cfg = getReportConfig(type);
                    const isCollapsed = collapsedReports[type] ?? false;
                    const tint = {
                        attendance: 'border-green-100 from-green-50/40',
                        leaves: 'border-orange-100 from-orange-50/40',
                        overtime: 'border-cyan-100 from-cyan-50/40',
                        payroll: 'border-violet-100 from-violet-50/40',
                        employees: 'border-blue-100 from-blue-50/40',
                        custom_entities: 'border-teal-100 from-teal-50/40',
                    }[type] ?? 'border-border from-transparent';

                    return (
                        <div key={type} className={`rounded-lg border bg-gradient-to-br via-card to-card shadow-sm overflow-hidden ${tint}`}>
                            <div className={`flex items-center justify-between gap-4 bg-muted/30 px-4 py-3 ${isCollapsed ? '' : 'border-b'}`}>
                                <h3 className="font-semibold text-lg">{cfg.title}</h3>
                                <button
                                    type="button"
                                    onClick={() => toggleReportSection(type)}
                                    aria-expanded={!isCollapsed}
                                    aria-controls={`report-data-${type}`}
                                    aria-label={isCollapsed ? `Open ${cfg.title}` : `Close ${cfg.title}`}
                                    title={isCollapsed ? "Open data" : "Close data"}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {isCollapsed ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronUp className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {!isCollapsed && <div id={`report-data-${type}`} className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow>
                                            {cfg.headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading && (!data || data.length === 0) ? (
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
                                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${val === 'Present' ? 'bg-green-50 text-green-700' : val === 'Absent' ? 'bg-red-50 text-red-700' : val === 'On Leave' ? 'bg-blue-50 text-blue-700' : val === 'Day Off' ? 'bg-purple-50 text-purple-700' : 'bg-yellow-50 text-yellow-700'}`}>
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
                            </div>}
                        </div>
                    );
                })}
                {reportTypes.length === 0 && (
                    <div className="text-center p-12 bg-gradient-to-br from-teal-50/40 via-card to-card rounded-lg border border-teal-100 text-muted-foreground shadow-sm">
                        Select at least one report type above to view data.
                    </div>
                )}
            </div>
        </div>
    );
}
