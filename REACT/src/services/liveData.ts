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

    if (!resource) return undefined;
    if (resource === 'my') return 'entities';
    return resource;
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
