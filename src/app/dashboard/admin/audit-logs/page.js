"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { auditLogsService } from "@/services/settings.service";
import { Skeleton } from "@/components/ui";

export default function AdminAuditLogsPage() {
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = async (pageNum = page) => {
    try {
      setLoading(true);
      const params = { page: pageNum, limit: 15 };
      if (actionFilter) params.action = actionFilter;
      if (moduleFilter) params.module = moduleFilter;
      if (search) params.search = search;

      const res = await auditLogsService.getAll(params);
      setLogs(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.pages || 1);
        setTotalCount(res.meta.total || 0);
      }
    } catch (err) {
      toast.error("فشل جلب سجل العمليات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, moduleFilter, search]);

  const getActionBadge = (action) => {
    const map = {
      CREATE: { bg: "bg-green-100 text-green-800", label: "إنشاء" },
      UPDATE: { bg: "bg-blue-100 text-blue-800", label: "تحديث" },
      DELETE: { bg: "bg-red-100 text-red-800", label: "حذف" },
      LOGIN: { bg: "bg-purple-100 text-purple-800", label: "دخول" },
      LOGOUT: { bg: "bg-gray-100 text-gray-800", label: "خروج" },
      COPY: { bg: "bg-amber-100 text-amber-800", label: "نسخ أسبوع" },
      TOGGLE_STATUS: {
        bg: "bg-indigo-100 text-indigo-800",
        label: "تغيير حالة",
      },
      RESET_PASSWORD: {
        bg: "bg-rose-100 text-rose-800",
        label: "تعيين كلمة مرور",
      },
    };
    const item = map[action] || {
      bg: "bg-gray-100 text-gray-800",
      label: action,
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.bg}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">
          سجل العمليات والتدقيق (Audit Logs)
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          متابعة وتوثيق جميع التعديلات والإجراءات المتخذة في النظام بالأوقات
          والمستخدمين وعناوين IP.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث في تفاصيل العملية أو اسم المستخدم..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pe-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>

          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">جميع أنواع الإجراءات</option>
            <option value="CREATE">إنشاء (CREATE)</option>
            <option value="UPDATE">تحديث (UPDATE)</option>
            <option value="DELETE">حذف (DELETE)</option>
            <option value="LOGIN">تسجيل دخول (LOGIN)</option>
            <option value="COPY">نسخ أسبوع (COPY)</option>
            <option value="TOGGLE_STATUS">تغيير حالة (TOGGLE_STATUS)</option>
            <option value="RESET_PASSWORD">
              تعيين كلمة مرور (RESET_PASSWORD)
            </option>
          </select>

          {/* Module filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">جميع الوحدات (Modules)</option>
            <option value="schedules">الجداول (schedules)</option>
            <option value="users">المستخدمين (users)</option>
            <option value="roles">الأدوار (roles)</option>
            <option value="subjects">المواد (subjects)</option>
            <option value="weeks">الأسابيع (weeks)</option>
            <option value="settings">الإعدادات (settings)</option>
            <option value="auth">المصادقة (auth)</option>
          </select>
        </div>

        <div className="text-xs text-gray-500 font-bold">
          إجمالي السجلات: <span className="text-blue-600">{totalCount}</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-xs text-gray-600 font-bold">
                <th className="px-6 py-4">نوع الإجراء</th>
                <th className="px-6 py-4">الوحدة</th>
                <th className="px-6 py-4">تفاصيل العملية</th>
                <th className="px-6 py-4">المستخدم المنفذ</th>
                <th className="px-6 py-4 text-center">عنوان IP</th>
                <th className="px-6 py-4 text-center">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    لا توجد سجلات عمليات مطابقة
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">{getActionBadge(log.action)}</td>

                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-700">
                      {log.module}
                    </td>

                    <td className="px-6 py-4 font-medium text-gray-900 max-w-md">
                      {log.description}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{log.userName}</p>
                      {log.userEmail && (
                        <p
                          className="text-[11px] text-gray-400 font-mono"
                          dir="ltr"
                        >
                          {log.userEmail}
                        </p>
                      )}
                    </td>

                    <td
                      className="px-6 py-4 text-center font-mono text-xs text-gray-500"
                      dir="ltr"
                    >
                      {log.ipAddress || "—"}
                    </td>

                    <td className="px-6 py-4 text-center font-mono text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("ar-SA", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => {
                const nextP = Math.max(page - 1, 1);
                setPage(nextP);
                fetchLogs(nextP);
              }}
              disabled={page <= 1}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-40"
            >
              الصفحة السابقة
            </button>

            <span className="text-xs text-gray-500 font-bold">
              صفحة {page} من {totalPages}
            </span>

            <button
              onClick={() => {
                const nextP = Math.min(page + 1, totalPages);
                setPage(nextP);
                fetchLogs(nextP);
              }}
              disabled={page >= totalPages}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-40"
            >
              الصفحة التالية
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
