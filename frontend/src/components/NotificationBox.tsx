import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Mail, MailOpen, Check } from 'lucide-react';
import { notificationsApi, Notification } from '../api/client';
import { useTranslation } from 'react-i18next';

export default function NotificationBox() {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // 点击外部关闭下拉框
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 加载数据
    const loadNotifications = async () => {
        try {
            const [listRes, countRes] = await Promise.all([
                notificationsApi.getAll(),
                notificationsApi.getUnreadCount(),
            ]);
            setNotifications(listRes.data);
            setUnreadCount(countRes.data.count);
        } catch (error) {
            console.error('Failed to load notifications', error);
        }
    };

    useEffect(() => {
        loadNotifications();
        // 轮询 (简单实现)
        const timer = setInterval(loadNotifications, 30000);
        return () => clearInterval(timer);
    }, []);

    const handleMarkAsRead = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const handleClickNotification = async (notification: Notification) => {
        if (!notification.is_read) {
            await handleMarkAsRead({ stopPropagation: () => { } } as any, notification.id);
        }
        setIsOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) loadNotifications();
                }}
                className="relative p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-300"
                aria-label="通知"
            >
                <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-purple-600" />
                            {t('notification.title')}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-purple-600 hover:text-purple-700 font-medium hover:underline flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                {t('notification.mark_all_read')}
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
                                <MailOpen className="w-12 h-12 text-gray-200" />
                                <p>{t('notification.empty')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleClickNotification(notification)}
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative ${!notification.is_read ? 'bg-purple-50/30' : ''
                                            }`}
                                    >
                                        {!notification.is_read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 opacity-50" />
                                        )}
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <p className={`text-sm ${!notification.is_read ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                                                    {notification.content}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-2">
                                                    <span>{new Date(notification.created_at).toLocaleString()}</span>
                                                    {/* {!notification.is_read && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px]">NEW</span>
                            )} */}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <button
                                                    onClick={(e) => handleMarkAsRead(e, notification.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-purple-100 text-purple-600 rounded-full transition-all"
                                                    title={t('notification.mark_read')}
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {notifications.length > 0 && (
                        <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                            <span className="text-xs text-gray-400">{t('notification.recent_hint')}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
