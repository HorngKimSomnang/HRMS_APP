export const LIVE_DATA_CHANGED_EVENT = 'hrms:data-changed';
export const LIVE_DATA_STORAGE_KEY = 'hrms:last-data-change';

export interface LiveDataChange {
    method?: string;
    url?: string;
    resource?: string;
    changedAt: number;
}

export const resourceFromUrl = (url?: string) => {
    if (!url) return undefined;

    const path = url.split('?')[0].replace(/^https?:\/\/[^/]+/i, '');
    const segments = path.split('/').filter(Boolean);
    const apiIndex = segments.indexOf('api');
    const resource = segments[apiIndex >= 0 ? apiIndex + 1 : 0];
    const child = segments[apiIndex >= 0 ? apiIndex + 2 : 1];
    const grandchild = segments[apiIndex >= 0 ? apiIndex + 3 : 2];

    if (!resource) return undefined;
    if (resource === 'reports') {
        return ({
            attendance: 'attendance',
            leaves: 'leaves',
            overtime: 'overtimes',
            payroll: 'payslips',
            employees: 'employees',
            'custom-entities': 'entities',
        } as Record<string, string>)[child] ?? 'reports';
    }
    if (resource === 'employees' && grandchild === 'attendance') return 'attendance';
    if (resource === 'my') return child === 'contract' ? 'lifecycle' : 'entities';
    return resource;
};

export const affectedResources = (resource?: string): string[] => {
    if (!resource) return [];

    const affected = [resource, 'dashboard', 'notifications', 'audit-logs'];

    if (['attendance', 'leaves', 'overtimes', 'payslips', 'employees', 'entities', 'lifecycle'].includes(resource)) {
        affected.push('reports');
    }
    if (resource === 'employees') {
        affected.push('assets', 'tasks', 'lifecycle', 'payslips');
    }
    if (resource === 'shifts') affected.push('employees');
    if (resource === 'announcements') affected.push('holidays');
    if (resource === 'leave-types') affected.push('leaves');
    if (['users', 'profile'].includes(resource)) affected.push('admins');

    return [...new Set(affected)];
};

export const announceDataChange = (change: Omit<LiveDataChange, 'changedAt'>) => {
    if (typeof window === 'undefined') return;

    const detail: LiveDataChange = {
        ...change,
        resource: change.resource ?? resourceFromUrl(change.url),
        changedAt: Date.now(),
    };

    window.dispatchEvent(new CustomEvent(LIVE_DATA_CHANGED_EVENT, { detail }));

    // The storage event tells other open HRMS tabs in this browser to refresh.
    try {
        localStorage.setItem(LIVE_DATA_STORAGE_KEY, JSON.stringify(detail));
    } catch {
        // The current tab still received the event; storage may be unavailable
        // in a restricted/private browser context.
    }
};
