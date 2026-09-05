"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usersService } from "@/services/users.service";
import { subjectsService } from "@/services/subjects.service";
import { weeksService, schedulesService } from "@/services/schedules.service";
import { auditLogsService } from "@/services/settings.service";
import { Skeleton } from "@/components/ui";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    teachersCount: 0,
    subjectsCount: 0,
    weeksCount: 0,
    schedulesCount: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [teachersRes, subjectsRes, weeksRes, currentWeekRes, logsRes] =
          await Promise.all([
            usersService.getTeachers(),
            subjectsService.getAll(),
            weeksService.getAll(),
            weeksService.getCurrent(),
            auditLogsService.getAll({ limit: 6 }),
          ]);

        const currWk = currentWeekRes.data;
        let schedCount = 0;
        if (currWk) {
          const schedRes = await schedulesService.getByWeek(currWk._id);
          schedCount = schedRes.data?.schedules?.length || 0;
        }

        setStats({
          teachersCount: teachersRes.data?.length || 0,
          subjectsCount: subjectsRes.data?.length || 0,
          weeksCount: weeksRes.data?.length || 0,
          schedulesCount: schedCount,
        });

        setCurrentWeek(currWk);
        setRecentLogs(logsRes.data || []);
      } catch (err) {
        console.error("Error fetching admin dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getActionBadge = (action) => {
    const map = {
      CREATE: { bg: "bg-green-100 text-green-800", label: "إنشاء" },
      UPDATE: { bg: "bg-blue-100 text-blue-800", label: "تحديث" },
      DELETE: { bg: "bg-red-100 text-red-800", label: "حذف" },
      LOGIN: { bg: "bg-purple-100 text-purple-800", label: "دخول" },
      COPY: { bg: "bg-amber-100 text-amber-800", label: "نسخ" },
      TOGGLE_STATUS: { bg: "bg-indigo-100 text-indigo-800", label: "حالة" },
      RESET_PASSWORD: { bg: "bg-rose-100 text-rose-800", label: "كلمة مرور" },
    };
    const item = map[action] || {
      bg: "bg-gray-100 text-gray-800",
      label: action,
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${item.bg}`}
      >
        {item.label}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-200 mb-3">
            <span>✨ لوحة الإدارة والتحكم الشاملة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">
            مرحباً بك، {user?.name || "مدير النظام"} 👋
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            متابعة شاملة للجداول الأسبوعية، المعلمين، المواد الدراسية، وإدارة
            صلاحيات النظام.
          </p>
        </div>
        <div className="absolute left-4 -bottom-6 opacity-10 text-9xl select-none pointer-events-none">
          📊
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Teachers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500">
              المعلمين المسجلين
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
              👨‍🏫
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-3xl font-extrabold text-gray-900">
              {stats.teachersCount}
            </p>
          )}
          <Link
            href="/dashboard/admin/users"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
          >
            إدارة المعلمين ←
          </Link>
        </div>

        {/* Subjects */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500">
              المواد الدراسية
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              📚
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-3xl font-extrabold text-gray-900">
              {stats.subjectsCount}
            </p>
          )}
          <Link
            href="/dashboard/admin/subjects"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 mt-2 inline-flex items-center gap-1"
          >
            إدارة المواد ←
          </Link>
        </div>

        {/* Weeks */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500">
              الأسابيع الدراسية
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
              📅
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-3xl font-extrabold text-gray-900">
              {stats.weeksCount}
            </p>
          )}
          <Link
            href="/dashboard/admin/weeks"
            className="text-xs font-semibold text-amber-600 hover:text-amber-800 mt-2 inline-flex items-center gap-1"
          >
            إدارة الأسابيع ←
          </Link>
        </div>

        {/* Current Week Schedules */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500">
              حصص الأسبوع الحالي
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
              🗓️
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-3xl font-extrabold text-gray-900">
              {stats.schedulesCount}
            </p>
          )}
          <Link
            href="/dashboard/admin/schedules"
            className="text-xs font-semibold text-purple-600 hover:text-purple-800 mt-2 inline-flex items-center gap-1"
          >
            عرض الجدول الأسبوعي ←
          </Link>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          إجراءات سريعة
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/dashboard/admin/schedules"
            className="p-4 rounded-xl bg-blue-50/60 hover:bg-blue-100/80 border border-blue-100 text-blue-900 text-center transition-all group"
          >
            <span className="text-2xl block mb-1">🗓️</span>
            <span className="text-xs font-bold group-hover:text-blue-800">
              إدارة الجداول الأسبوعية
            </span>
          </Link>

          <Link
            href="/dashboard/admin/users"
            className="p-4 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-100 text-emerald-900 text-center transition-all group"
          >
            <span className="text-2xl block mb-1">👤</span>
            <span className="text-xs font-bold group-hover:text-emerald-800">
              إضافة معلم أو مستخدم
            </span>
          </Link>

          <Link
            href="/dashboard/admin/roles"
            className="p-4 rounded-xl bg-purple-50/60 hover:bg-purple-100/80 border border-purple-100 text-purple-900 text-center transition-all group"
          >
            <span className="text-2xl block mb-1">🔐</span>
            <span className="text-xs font-bold group-hover:text-purple-800">
              الأدوار والصلاحيات
            </span>
          </Link>

          <Link
            href="/dashboard/admin/settings"
            className="p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200 text-slate-900 text-center transition-all group"
          >
            <span className="text-2xl block mb-1">🏫</span>
            <span className="text-xs font-bold group-hover:text-slate-800">
              إعدادات وشعار المدرسة
            </span>
          </Link>
        </div>
      </div>

      {/* Recent Audit Logs & System Activity */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">
            آخر العمليات والتحديثات (Audit Logs)
          </h3>
          <Link
            href="/dashboard/admin/audit-logs"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            عرض السجل الكامل ←
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            لا توجد عمليات مسجلة حتى الآن
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentLogs.map((log) => (
              <div
                key={log._id}
                className="py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {getActionBadge(log.action)}
                  <div className="truncate">
                    <p className="font-semibold text-gray-800 truncate">
                      {log.description}
                    </p>
                    <p className="text-gray-400 text-[11px] truncate">
                      بواسطة: {log.userName} ({log.userRole || "مستخدم"})
                    </p>
                  </div>
                </div>
                <span className="text-gray-400 font-mono text-[11px] flex-shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
