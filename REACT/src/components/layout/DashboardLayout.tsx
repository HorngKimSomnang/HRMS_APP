import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface NotificationItem {
    id: string;
    type?: string;
    data?: {
        type?: string;
        message?: string;
        action_url?: string;
        entity_slug?: string;
        [key: string]: unknown;
    };
    read_at: string | null;
    created_at: string;
}

const getNotificationPath = (notification: NotificationItem): string => {
    const actionUrl = notification.data?.action_url;
    if (typeof actionUrl === 'string' && actionUrl.startsWith('/') && !actionUrl.startsWith('//')) {
        return actionUrl;
    }

    const notificationType = (notification.data?.type || notification.type || '').toLowerCase();

    if (notificationType.includes('custom_entity_record')) {
        const slug = notification.data?.entity_slug;
        return typeof slug === 'string' && slug ? `/entities/${encodeURIComponent(slug)}` : '/entities';
    }

    if (notificationType.includes('attendance') || notificationType.includes('clocked') || notificationType.includes('clock_out')) {
        return '/attendance';
    }

    if (notificationType.includes('leave')) return '/leaves';
    if (notificationType.includes('task')) return '/tasks';
    if (notificationType.includes('document')) return '/documents';
    if (notificationType.includes('announcement') || notificationType.includes('holiday')) return '/notices';
    if (notificationType.includes('overtime')) return '/overtime';
    if (notificationType.includes('payslip') || notificationType.includes('payroll')) return '/payroll';
    if (notificationType.includes('contract')) return '/lifecycle';
    if (notificationType.includes('report')) return '/reports';

    return '/dashboard';
};

export default function DashboardLayout() {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const knownNotificationIds = useRef<Set<string>>(new Set());
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            const incomingData = res.data.data?.notifications || [];
            const serverUnreadCount = res.data.data?.unread_count ?? 0;

            let hasNew = false;
            let latestMessage = "";

            // If it's not the first load and we already have known IDs...
            if (knownNotificationIds.current.size > 0) {
                for (const item of incomingData) {
                    if (!knownNotificationIds.current.has(item.id)) {
                        hasNew = true;
                        latestMessage = item.data?.message || "New notification received";
                        break;
                    }
                }
            }

            // Update the set of known IDs so we don't trigger again for these
            const currentIds = new Set<string>();
            incomingData.forEach((item: NotificationItem) => currentIds.add(item.id));
            knownNotificationIds.current = currentIds;

            setNotifications(incomingData);
            setUnreadCount(serverUnreadCount);

            // Show Toast Alert if there's a new notification
            if (hasNew) {
                setToastMessage(latestMessage);
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => setToastMessage(null), 5000);
            }

        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    }, []);

    useEffect(() => {
        // Initial fetch (deferred to a macrotask so state updates stay async),
        // then poll for new notifications every 15 seconds
        const initialFetchId = setTimeout(fetchNotifications, 0);
        const intervalId = setInterval(fetchNotifications, 15000);

        // Close dropdown on click outside
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            clearTimeout(initialFetchId);
            clearInterval(intervalId);
            document.removeEventListener("mousedown", handleClickOutside);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [fetchNotifications]);

    const markAsRead = async () => {
        try {
            await api.post('/notifications/mark-read');
            // Optimistically clear the badge immediately
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const openNotification = (notification: NotificationItem) => {
        const wasUnread = !notification.read_at;

        setShowNotifications(false);

        if (wasUnread) {
            setNotifications(prev => prev.map(item => (
                item.id === notification.id
                    ? { ...item, read_at: new Date().toISOString() }
                    : item
            )));
            setUnreadCount(prev => Math.max(0, prev - 1));

            void api.post(`/notifications/${notification.id}/mark-read`).catch((error) => {
                console.error("Failed to mark notification as read", error);
                void fetchNotifications();
            });
        }

        navigate(getNotificationPath(notification));
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'km' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    // unreadCount is now managed via state from the API

    return (
        <div className="flex h-screen w-full overflow-hidden bg-blue-50/60">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden relative print:overflow-visible">
                <header className="flex h-14 items-center gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-white/80 backdrop-blur-lg px-6 lg:h-[60px] justify-between z-10 sticky top-0 print:hidden">
                    <div className="flex-1">
                        {/* Breadcrumbs or Search */}
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={toggleLanguage} className="bg-secondary/20 border border-secondary/50 px-3 py-1.5 rounded-md text-sm hover:bg-secondary/40 transition-colors font-medium">
                            {i18n.language === 'en' ? '🇰🇭 ខ្មែរ' : '🇬🇧 EN'}
                        </button>

                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative"
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-background text-white text-[10px] font-bold flex items-center justify-center">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 mt-2 w-80 rounded-md border bg-card shadow-lg z-50"
                                >
                                    <div className="p-4 border-b bg-muted/30">
                                        <h4 className="text-sm font-semibold">Notifications</h4>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 flex flex-col items-center justify-center text-center text-sm text-muted-foreground">
                                                <Bell className="h-8 w-8 mb-2 opacity-20" />
                                                No new notifications
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {notifications.map((n) => {
                                                    const isUnread = !n.read_at;
                                                    return (
                                                        <button
                                                            key={n.id}
                                                            type="button"
                                                            onClick={() => openNotification(n)}
                                                            className={`block w-full p-4 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary transition-colors cursor-pointer ${isUnread ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}`}
                                                            aria-label={`Open notification: ${n.data?.message || 'Notification'}`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                {isUnread && (
                                                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                                                )}
                                                                {!isUnread && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                                                                <div className="text-sm flex-1">
                                                                    <p className={`${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>
                                                                        {n.data?.message || "Notification"}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {notifications.length > 0 && (
                                        <div className="p-3 border-t bg-muted/50 text-center">
                                            <button
                                                onClick={markAsRead}
                                                className="text-sm font-medium text-primary hover:underline"
                                            >
                                                Mark all as read
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-br from-blue-50/70 via-slate-50 to-blue-50/40">
                    <Outlet />
                </main>

                {/* Custom Alert Toast Popup */}
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="fixed bottom-6 right-6 bg-blue-600 text-white shadow-2xl rounded-xl p-4 flex items-center gap-4 z-50 border border-blue-500/50"
                        >
                            <div className="bg-white/20 p-2 rounded-full h-10 w-10 flex items-center justify-center shrink-0">
                                <Bell className="h-5 w-5 animate-bounce" />
                            </div>
                            <div className="min-w-[200px]">
                                <h4 className="font-semibold text-sm">New Alert!</h4>
                                <p className="text-sm text-blue-100">{toastMessage}</p>
                            </div>
                            <button 
                                onClick={() => setToastMessage(null)}
                                className="ml-2 text-blue-200 hover:text-white transition-colors"
                            >
                                &times;
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
