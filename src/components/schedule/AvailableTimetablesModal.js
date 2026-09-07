"use client";

import { useState, useEffect } from "react";
import { schedulesService } from "@/services/schedules.service";
import { useToast } from "@/contexts/ToastContext";

const DAYS_ORDER = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function AvailableTimetablesModal({
  isOpen,
  onClose,
  onClaimed,
  showCancel = true,
}) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [timetables, setTimetables] = useState([]);
  const [week, setWeek] = useState(null);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [previewTimetable, setPreviewTimetable] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Load available timetables
  const loadAvailableTimetables = async () => {
    try {
      setLoading(true);
      const res = await schedulesService.getAvailableTimetables();
      setTimetables(res.data?.timetables || []);
      setWeek(res.data?.week || null);
    } catch (err) {
      console.error("Error fetching available timetables:", err);
      toast.error("فشل تحميل قائمة الجداول المتاحة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAvailableTimetables();
      setPreviewTimetable(null);
      setSelectedTimetable(null);
    }
  }, [isOpen]);

  const handleSelectToClaim = (tt) => {
    setSelectedTimetable(tt);
    setConfirmModalOpen(true);
  };

  const handleConfirmClaim = async () => {
    if (!selectedTimetable) return;
    setClaiming(true);
    try {
      const res = await schedulesService.claimTimetable({
        sourceTeacherId: selectedTimetable.teacherId,
        weekId: week?._id,
      });

      toast.success(res.message || "تم تعيين الجدول لحسابك بنجاح 🎉");
      setConfirmModalOpen(false);
      if (onClaimed) {
        onClaimed(res.data);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "فشل تعيين الجدول المختار";
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  // Build grid matrix for preview
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-7 border border-gray-100 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center text-2xl text-white shadow-md shadow-teal-500/20 flex-shrink-0">
              📋
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
                الجداول المدرسية المتاحة للاختيار
                {week?.label && (
                  <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100 hidden sm:inline-block">
                    {week.label}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                اختر جدول الحصص الذي أعدته إدارة المدرسة لمادتك وفصولك لربطه بحسابك فوراً.
              </p>
            </div>
          </div>

          {showCancel && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto py-4 flex-1 pe-1 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-400">
                جاري فحص وجلب الجداول المتاحة في المدرسة...
              </p>
            </div>
          ) : previewTimetable ? (
            /* Timetable Preview View */
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTimetable(null)}
                    className="text-xs font-black text-emerald-800 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer border border-emerald-300"
                  >
                    <span>←</span> عودة للقائمة
                  </button>
                  <span className="text-xs font-black text-emerald-950">
                    معاينة: {previewTimetable.teacherName} ({previewTimetable.totalClasses} حصة)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectToClaim(previewTimetable)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>✓</span> اختيار هذا الجدول
                </button>
              </div>

              {/* Mini Preview Matrix Grid */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                      <th className="p-2.5 text-center w-24 border-e border-gray-200">
                        اليوم
                      </th>
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                        <th
                          key={p}
                          className="p-2 text-center border-e border-gray-200 last:border-e-0 min-w-[75px]"
                        >
                          الحصة {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const matrix = buildPreviewMatrix(previewTimetable.schedules);
                      return DAYS_ORDER.map((day) => (
                        <tr
                          key={day}
                          className="border-b border-gray-100 hover:bg-gray-50/50"
                        >
                          <td className="p-2.5 font-black text-gray-800 text-center bg-gray-50/60 border-e border-gray-200">
                            {day}
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                            const cell = matrix[day][p];
                            return (
                              <td
                                key={p}
                                className="p-1.5 text-center border-e border-gray-100 last:border-e-0"
                              >
                                {cell ? (
                                  <div
                                    className="p-1.5 rounded-xl border text-[11px] font-bold shadow-xs space-y-0.5"
                                    style={{
                                      backgroundColor: (cell.subject?.color || "#3b82f6") + "15",
                                      borderColor: (cell.subject?.color || "#3b82f6") + "40",
                                      color: cell.subject?.color || "#1e3a8a",
                                    }}
                                  >
                                    <div className="truncate font-black">
                                      {cell.className || "حصة"}
                                    </div>
                                    <div className="text-[10px] opacity-80 truncate">
                                      {cell.subject?.name || ""}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-200 text-[10px] font-mono">
                                    —
                                  </span>
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
          ) : timetables.length === 0 ? (
            /* Empty State */
            <div className="py-10 text-center space-y-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-xl mx-auto border border-amber-200">
                ⚠️
              </div>
              <h3 className="text-sm font-black text-gray-800">
                لا توجد جداول شاغرة أو غير مسندة حالياً
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                إذا كانت إدارة المدرسة قد أعدت جدولك بالفعل، يرجى التأكد من مسؤولي الجدول المدرسي لتعيين الجدول لحسابك، أو يمكنك إكمال ملفك وتحديد المواد لإنشاء خطتك مباشرة.
              </p>
            </div>
          ) : (
            /* Timetables Cards List */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-600 px-1">
                <span>
                  تم العثور على {timetables.length} جدول متاح في المدرسة:
                </span>
                <span className="text-gray-400 text-[11px]">
                  اضغط على أي جدول للمعاينة أو التعيين
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {timetables.map((tt) => (
                  <div
                    key={tt.teacherId}
                    className="bg-white border-2 border-gray-200/90 hover:border-emerald-500 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      {/* Top Row: Name & Total Classes */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {tt.teacherName}
                          </h4>
                          {tt.teacherEmail && (
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate max-w-[200px]">
                              {tt.teacherEmail}
                            </p>
                          )}
                        </div>

                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-xs px-2.5 py-1 rounded-xl flex-shrink-0">
                          {tt.totalClasses} حصة
                        </span>
                      </div>

                      {/* Subjects */}
                      {tt.subjects && tt.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {tt.subjects.map((sub) => (
                            <span
                              key={sub._id}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1"
                              style={{
                                backgroundColor: (sub.color || "#3b82f6") + "15",
                                borderColor: (sub.color || "#3b82f6") + "30",
                                color: sub.color || "#1e40af",
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  backgroundColor: sub.color || "#3b82f6",
                                }}
                              />
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Classes Taught */}
                      {tt.classNames && tt.classNames.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-gray-400">
                            الفصول:
                          </span>
                          {tt.classNames.map((cName) => (
                            <span
                              key={cName}
                              className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-gray-200"
                            >
                              {cName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTimetable(tt)}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        👁️ معاينة الجدول
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectToClaim(tt)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow transition-all flex items-center gap-1 cursor-pointer"
                      >
                        ✓ اختيار وتعيين لي
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={loadAvailableTimetables}
            disabled={loading}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
          >
            <span>🔄</span> تحديث القائمة
          </button>

          {showCancel && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && selectedTimetable && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 text-center animate-scale-up">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
              🎯
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900">
                تأكيد اختيار الجدول المدرسي
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                هل أنت متأكد من تعيين جدول{" "}
                <span className="font-black text-emerald-800 font-mono">
                  ({selectedTimetable.teacherName})
                </span>{" "}
                بعدد{" "}
                <span className="font-black text-emerald-800">
                  {selectedTimetable.totalClasses} حصة أسبوعياً
                </span>{" "}
                لحسابك؟
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-right text-[11px] text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <span>💡</span> ماذا سيحدث بعد التأكيد؟
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-800">
                <li>سيتم نقل جميع الحصص التابعة لهذا الجدول لحسابك فوراً.</li>
                <li>ستتم إضافة مواد الجدول لملفك الشخصي.</li>
                <li>لن يتمكن أي معلم آخر من اختيار هذا الجدول.</li>
              </ul>
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
                onClick={handleConfirmClaim}
                disabled={claiming}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {claiming ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>تأكيد وتعيين الجدول 🚀</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
