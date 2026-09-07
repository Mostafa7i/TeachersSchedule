"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { Skeleton, ErrorBoundary } from "@/components/ui";

const DAYS_ORDER = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function TeacherAvailableTimetablesPage() {
  const { user, refetchUser } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [timetables, setTimetables] = useState([]);
  const [week, setWeek] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTimetable, setPreviewTimetable] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState(null);

  const fetchAvailableTimetables = async () => {
    try {
      setLoading(true);
      const res = await schedulesService.getAvailableTimetables();
      setTimetables(res.data?.timetables || []);
      setWeek(res.data?.week || null);
    } catch (err) {
      toast.error("فشل جلب قائمة الجداول المتاحة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableTimetables();
  }, []);

  const handleClaim = async () => {
    if (!selectedTimetable) return;
    setClaiming(true);
    try {
      const res = await schedulesService.claimTimetable({
        sourceTeacherId: selectedTimetable.teacherId,
        weekId: week?._id,
      });

      toast.success(res.message || "تم تعيين وتثبيت جدولك بنجاح 🎉");
      setConfirmModalOpen(false);
      if (refetchUser) await refetchUser();
      // Reload available list
      await fetchAvailableTimetables();
      setPreviewTimetable(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل تعيين الجدول المختار");
    } finally {
      setClaiming(false);
    }
  };

  const filteredTimetables = timetables.filter((tt) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = tt.teacherName?.toLowerCase().includes(query);
    const subMatch = tt.subjects?.some((s) => s.name?.toLowerCase().includes(query));
    const classMatch = tt.classNames?.some((c) => c.toLowerCase().includes(query));
    return nameMatch || subMatch || classMatch;
  });

  const buildPreviewMatrix = (schedules) => {
    const matrix = {};
    DAYS_ORDER.forEach((day) => {
      matrix[day] = {};
      for (let p = 1; p <= 7; p++) {
        matrix[day][p] = null;
      }
    });

    (schedules || []).forEach((s) => {
      if (matrix[s.day] && matrix[s.day][s.period] !== undefined) {
        matrix[s.day][s.period] = s;
      }
    });

    return matrix;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-semibold">
            <span>📋 الجداول المتاحة في المدرسة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            الجداول المدرسية المتاحة للاختيار
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 font-medium leading-relaxed">
            استعرض جداول الحصص التي جهزتها إدارة المدرسة، واختر جدول مادتك وفصولك لربطه بحسابك فوراً والبدء في تعبئة التحضير الأسبوعي.
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/15 text-center">
          <div>
            <span className="text-3xl font-black block text-emerald-300">
              {timetables.length}
            </span>
            <span className="text-xs text-emerald-100 font-semibold">
              جداول شاغرة ومتاحة
            </span>
          </div>
          {week?.label && (
            <>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <span className="text-xs font-black block text-white font-mono">
                  {week.label}
                </span>
                <span className="text-[11px] text-emerald-200">
                  الأسبوع النشط
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المادة، الفصل، أو اسم المعلم..."
            className="w-full px-4 py-2.5 pe-10 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white font-semibold text-gray-800"
          />
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        <button
          type="button"
          onClick={fetchAvailableTimetables}
          disabled={loading}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>🔄</span>
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Main Content */}
      <ErrorBoundary title="تعذر عرض الجداول المتاحة">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : previewTimetable ? (
          /* Detailed Timetable Preview Grid */
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewTimetable(null)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span> عودة للقائمة
                </button>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    معاينة: {previewTimetable.teacherName}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    عدد الحصص الأسبوعية: <span className="font-bold text-emerald-700">{previewTimetable.totalClasses} حصة</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTimetable(previewTimetable);
                  setConfirmModalOpen(true);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>✓</span>
                <span>اختيار وتعيين هذا الجدول لحسابي الآن</span>
              </button>
            </div>

            {/* Grid Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                    <th className="p-3 text-center w-28 border-e border-gray-200">اليوم</th>
                    {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                      <th key={p} className="p-2.5 text-center border-e border-gray-200 last:border-e-0 min-w-[100px]">
                        الحصة {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const matrix = buildPreviewMatrix(previewTimetable.schedules);
                    return DAYS_ORDER.map((day) => (
                      <tr key={day} className="border-b border-gray-100 hover:bg-gray-50/60">
                        <td className="p-3 font-black text-gray-900 text-center bg-gray-50/70 border-e border-gray-200">
                          {day}
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                          const cell = matrix[day][p];
                          return (
                            <td key={p} className="p-2 text-center border-e border-gray-100 last:border-e-0">
                              {cell ? (
                                <div
                                  className="p-2.5 rounded-xl border text-xs font-bold shadow-xs space-y-1"
                                  style={{
                                    backgroundColor: (cell.subject?.color || "#3b82f6") + "15",
                                    borderColor: (cell.subject?.color || "#3b82f6") + "40",
                                    color: cell.subject?.color || "#1e3a8a",
                                  }}
                                >
                                  <div className="truncate font-black">{cell.className || "حصة"}</div>
                                  <div className="text-[11px] opacity-85 truncate">{cell.subject?.name || ""}</div>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-xs font-mono">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredTimetables.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-amber-200">
              📋
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-black text-gray-900">
                {searchQuery ? "لا توجد نتائج مطابقة لبحثك" : "لا توجد جداول شاغرة ومتاحة حالياً"}
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                {searchQuery
                  ? "جرب البحث بكلمات أخرى أو امسح شريط البحث."
                  : "إذا كانت إدارة المدرسة قد أعدت جدولك، يمكنك التواصل مع مسؤول النظام لتأكيد تعيين الجدول."}
              </p>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                مسح البحث
              </button>
            )}
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTimetables.map((tt) => (
              <div
                key={tt.teacherId}
                className="bg-white border-2 border-gray-100 hover:border-emerald-500 hover:shadow-lg rounded-3xl p-5 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {tt.teacherName}
                      </h3>
                      {tt.teacherEmail && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {tt.teacherEmail}
                        </p>
                      )}
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-xs px-3 py-1 rounded-xl flex-shrink-0">
                      {tt.totalClasses} حصة
                    </span>
                  </div>

                  {/* Subjects */}
                  {tt.subjects && tt.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tt.subjects.map((sub) => (
                        <span
                          key={sub._id}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5"
                          style={{
                            backgroundColor: (sub.color || "#3b82f6") + "15",
                            borderColor: (sub.color || "#3b82f6") + "30",
                            color: sub.color || "#1e40af",
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: sub.color || "#3b82f6" }}
                          />
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Classes */}
                  {tt.classNames && tt.classNames.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-bold text-gray-400 mb-1">الفصول المسندة:</p>
                      <div className="flex flex-wrap gap-1">
                        {tt.classNames.map((c) => (
                          <span key={c} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs font-bold border border-gray-200">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTimetable(tt)}
                    className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    👁️ معاينة الجدول
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTimetable(tt);
                      setConfirmModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow transition-all text-center cursor-pointer"
                  >
                    ✓ اختيار وتعيين لي
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ErrorBoundary>

      {/* Confirmation Modal */}
      {confirmModalOpen && selectedTimetable && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 text-center animate-scale-up">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
              🎯
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900">
                تأكيد تعيين الجدول لحسابك
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                هل أنت متأكد من اختيار وتعيين جدول <span className="font-black text-emerald-800 font-mono">({selectedTimetable.teacherName})</span> بعدد <span className="font-black text-emerald-800">{selectedTimetable.totalClasses} حصة أسبوعياً</span>؟
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-right text-[11px] text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-1 text-emerald-950">
                <span>✓</span> سيتم نقل جميع الحصص والمواد بحسابك فوراً.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={claiming}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {claiming ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>تأكيد والبدء 🚀</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
