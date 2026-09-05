"use client";

import { useState, useEffect, useRef } from "react";
import { notificationsService } from "@/services/notifications.service";
import { useToast } from "@/contexts/ToastContext";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const toast = useToast();

  const fetchNotifications = async () => {
    try {
      const res = await notificationsService.getMyNotifications({ limit: 15 });
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // silently fail polling
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, isAlreadyRead) => {
    if (isAlreadyRead) return;
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("تم تحديد جميع الإشعارات كمقروءة");
    } catch (err) {
      toast.error("فشل تحديث الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "الآن";
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer"
        aria-label="التنبيهات"
        title="التنبيهات والإشعارات"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-[11px] font-black text-white bg-red-600 rounded-full shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden transform transition-all">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900">
                التنبيهات والإشعارات
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors cursor-pointer"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-xs font-bold text-gray-700">لا توجد أي تنبيهات حالياً</p>
                <p className="text-[11px] text-gray-400 mt-0.5">خطتك الأسبوعية والتحضيرات تسير على ما يرام!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleMarkAsRead(n._id, n.isRead)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    !n.isRead
                      ? "bg-blue-50/70 hover:bg-blue-100/50"
                      : "hover:bg-gray-50 opacity-80"
                  }`}
                >
                  <div className="text-lg flex-shrink-0 mt-0.5">
                    {n.type === "WARNING"
                      ? "⚠️"
                      : n.type === "SUCCESS"
                      ? "✅"
                      : n.type === "INFO"
                      ? "ℹ️"
                      : "🔔"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          !n.isRead ? "text-slate-900 font-black" : "text-gray-700"
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed break-words">
                      {n.message}
                    </p>

                    {n.week?.label && (
                      <span className="inline-block mt-1.5 text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                        📅 {n.week.label}
                      </span>
                    )}
                  </div>

                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
