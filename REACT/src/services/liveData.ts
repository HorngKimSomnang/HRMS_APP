export const LIVE_DATA_CHANGED_EVENT = 'hrms:data-changed';
export const LIVE_DATA_STORAGE_KEY = 'hrms:last-data-change';

export interface LiveDataChange {
    method?: string;
    url?: string;
    changedAt: number;
}

export const announceDataChange = (change: Omit<LiveDataChange, 'changedAt'>) => {
    if (typeof window === 'undefined') return;

    const detail: LiveDataChange = {
        ...change,
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
