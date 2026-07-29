import { useEffect, useRef } from 'react';
import {
    LIVE_DATA_CHANGED_EVENT,
    LIVE_DATA_STORAGE_KEY,
} from '@/services/liveData';

interface LiveRefreshOptions {
    pollInterval?: number;
}

type RefreshCallback = () => void | Promise<void>;

/**
 * Keeps the active screen synchronized without resetting its filters or forms.
 * Local mutations refresh immediately; changes from Flutter/another browser are
 * discovered by lightweight polling while this tab is visible.
 */
export function useLiveRefresh(
    refresh: RefreshCallback,
    { pollInterval = 10_000 }: LiveRefreshOptions = {},
) {
    const refreshRef = useRef(refresh);
    const isRefreshingRef = useRef(false);

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

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') scheduleRefresh(0);
        };
        const handleStorage = (event: StorageEvent) => {
            if (event.key === LIVE_DATA_STORAGE_KEY) scheduleRefresh();
        };
        const handleDataChange = () => scheduleRefresh();

        window.addEventListener(LIVE_DATA_CHANGED_EVENT, handleDataChange);
        window.addEventListener('focus', handleVisibility);
        window.addEventListener('storage', handleStorage);
        document.addEventListener('visibilitychange', handleVisibility);

        const intervalId = pollInterval > 0
            ? window.setInterval(() => void runRefresh(), pollInterval)
            : undefined;

        return () => {
            if (debounceId) clearTimeout(debounceId);
            if (intervalId) window.clearInterval(intervalId);
            window.removeEventListener(LIVE_DATA_CHANGED_EVENT, handleDataChange);
            window.removeEventListener('focus', handleVisibility);
            window.removeEventListener('storage', handleStorage);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [pollInterval]);
}
