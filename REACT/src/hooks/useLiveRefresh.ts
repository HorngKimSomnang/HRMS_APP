import { useEffect, useMemo, useRef } from 'react';
import api from '@/services/api';
import {
    LIVE_DATA_CHANGED_EVENT,
    LIVE_DATA_STORAGE_KEY,
    type LiveDataChange,
} from '@/services/liveData';

interface LiveRefreshOptions {
    pollInterval?: number;
    resources?: string | string[];
}

type RefreshCallback = () => void | Promise<void>;

/**
 * Keeps the active screen synchronized without resetting its filters or forms.
 * Local mutations refresh immediately; changes from Flutter/another browser are
 * discovered by lightweight polling while this tab is visible.
 */
const inferredResources = () => {
    const page = window.location.pathname.split('/').filter(Boolean)[0] ?? '';

    return [({
        admins: 'users',
        holidays: 'announcements',
        notices: 'announcements',
        overtime: 'overtimes',
        payroll: 'payslips',
    } as Record<string, string>)[page] ?? page];
};

const affectsResource = (change: LiveDataChange, watchedResources: string[]) => {
    const resource = change.resource;
    if (!resource) return true;
    if (watchedResources.includes(resource)) return true;

    if (watchedResources.some((watched) => ['dashboard', 'notifications', 'audit-logs'].includes(watched))) {
        return true;
    }

    if (
        watchedResources.includes('reports')
        && ['attendance', 'leaves', 'overtimes', 'payslips', 'employees', 'entities', 'lifecycle'].includes(resource)
    ) {
        return true;
    }

    if (resource === 'employees' && watchedResources.some((watched) =>
        ['assets', 'tasks', 'lifecycle', 'payslips'].includes(watched)
    )) {
        return true;
    }

    return (
        (resource === 'shifts' && watchedResources.includes('employees'))
        || (resource === 'leave-types' && watchedResources.includes('leaves'))
        || (resource === 'announcements' && watchedResources.includes('holidays'))
        || (['users', 'profile'].includes(resource) && watchedResources.includes('admins'))
    );
};

export function useLiveRefresh(
    refresh: RefreshCallback,
    { pollInterval = 5_000, resources }: LiveRefreshOptions = {},
) {
    const refreshRef = useRef(refresh);
    const isRefreshingRef = useRef(false);
    const isCheckingRef = useRef(false);
    const versionsRef = useRef<Record<string, string> | null>(null);
    const resourceKey = Array.isArray(resources) ? resources.join(',') : resources;
    const watchedResources = useMemo(
        () => (resourceKey ? resourceKey.split(',').map((item) => item.trim()).filter(Boolean) : inferredResources()),
        [resourceKey],
    );
    const watchedKey = watchedResources.join(',');

    useEffect(() => {
        refreshRef.current = refresh;
    }, [refresh]);

    useEffect(() => {
        let debounceId: ReturnType<typeof setTimeout> | undefined;

        const runRefresh = async () => {
            if (document.visibilityState === 'hidden' || isRefreshingRef.current) {
                return;
            }

            isRefreshingRef.current = true;
            try {
                await refreshRef.current();
            } catch (error) {
                console.error('Live data refresh failed', error);
            } finally {
                isRefreshingRef.current = false;
            }
        };

        const scheduleRefresh = (delay = 150) => {
            if (debounceId) clearTimeout(debounceId);
            debounceId = setTimeout(() => void runRefresh(), delay);
        };

        const checkForChanges = async () => {
            if (
                document.visibilityState === 'hidden'
                || isCheckingRef.current
                || watchedResources.length === 0
            ) {
                return;
            }

            isCheckingRef.current = true;
            try {
                const response = await api.get('/data-versions', {
                    params: { resources: watchedKey },
                    headers: { 'Cache-Control': 'no-cache' },
                });
                const nextVersions = response.data?.resources ?? {};
                const previousVersions = versionsRef.current;
                versionsRef.current = nextVersions;

                if (
                    previousVersions
                    && watchedResources.some((resource) => previousVersions[resource] !== nextVersions[resource])
                ) {
                    await runRefresh();
                }
            } catch (error) {
                // Keep the screen usable if the lightweight live check is unavailable.
                console.error('Live data version check failed', error);
            } finally {
                isCheckingRef.current = false;
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') void checkForChanges();
        };
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== LIVE_DATA_STORAGE_KEY) return;

            try {
                const change = JSON.parse(event.newValue ?? '{}') as LiveDataChange;
                if (affectsResource(change, watchedResources)) {
                    versionsRef.current = null;
                    scheduleRefresh();
                }
            } catch {
                versionsRef.current = null;
                scheduleRefresh();
            }
        };
        const handleDataChange = (event: Event) => {
            const change = (event as CustomEvent<LiveDataChange>).detail;
            if (!change || affectsResource(change, watchedResources)) {
                versionsRef.current = null;
                scheduleRefresh();
            }
        };

        window.addEventListener(LIVE_DATA_CHANGED_EVENT, handleDataChange);
        window.addEventListener('focus', handleVisibility);
        window.addEventListener('storage', handleStorage);
        document.addEventListener('visibilitychange', handleVisibility);

        const intervalId = pollInterval > 0
            ? window.setInterval(() => void checkForChanges(), pollInterval)
            : undefined;

        void checkForChanges();

        return () => {
            if (debounceId) clearTimeout(debounceId);
            if (intervalId) window.clearInterval(intervalId);
            window.removeEventListener(LIVE_DATA_CHANGED_EVENT, handleDataChange);
            window.removeEventListener('focus', handleVisibility);
            window.removeEventListener('storage', handleStorage);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [pollInterval, watchedKey, watchedResources]);
}
