"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { subjectsService } from "@/services/subjects.service";
import { schedulesService } from "@/services/schedules.service";

const SUBJECT_ICONS = {
  فنية: "🎨",
  رياضيات: "📐",
  رقمية: "💻",
  توحيد: "🕋",
  English: "🇬🇧",
  لغتي: "📖",
  بدنية: "⚽",
  تفسير: "📜",
  اجتماعيات: "🌍",
  حديث: "💬",
  علوم: "🔬",
};

const DAYS_ORDER = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function TeacherOnboardingModal({ isOpen, onComplete }) {
  const { user, completeProfile, refetchUser } = useAuth();
  const toast = useToast();

  // Mode: 'available' (claim ready timetable) | 'manual' (pick subjects manually)
  const [mode, setMode] = useState("available");

  // Available Timetables State
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [availableTimetables, setAvailableTimetables] = useState([]);
  const [availableWeek, setAvailableWeek] = useState(null);
  const [previewTimetable, setPreviewTimetable] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedTimetableToClaim, setSelectedTimetableToClaim] = useState(null);

  // Manual Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Load Available Timetables & Subjects on Open
  useEffect(() => {
    if (!isOpen) return;

    const fetchInitialData = async () => {
      try {
        setLoadingAvailable(true);
        setLoadingSubjects(true);

        const [availRes, subsRes] = await Promise.all([
          schedulesService.getAvailableTimetables().catch(() => ({ data: { timetables: [] } })),
          subjectsService.getAll({ isActive: true }).catch(() => ({ data: [] })),
        ]);

        const list = availRes.data?.timetables || [];
        setAvailableTimetables(list);
        setAvailableWeek(availRes.data?.week || null);
        setSubjects(subsRes.data || []);

        // If no available timetables exist, default to manual mode
        if (list.length === 0) {
          setMode("manual");
        } else {
          setMode("available");
        }
      } catch (err) {
        console.error("Error loading onboarding data:", err);
      } finally {
        setLoadingAvailable(false);
        setLoadingSubjects(false);
      }
    };

    fetchInitialData();
  }, [isOpen]);

  // Prefill user name & phone
  useEffect(() => {
    if (user) {
      if (user.name && user.name !== "معلم جديد") {
        setName(user.name);
      }
      if (user.phone) setPhone(user.phone);
      if (Array.isArray(user.subjects) && user.subjects.length > 0) {
        setSelectedSubjectIds(
          user.subjects.map((s) => (typeof s === "object" ? s._id : s)),
        );
      }
    }
  }, [user]);

  const toggleSubject = (subId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId)
        ? prev.filter((id) => id !== subId)
        : [...prev, subId],
    );
  };

  // 1. Claim Timetable Action
  const handleClaim = async () => {
    if (!selectedTimetableToClaim) return;
    setClaiming(true);
    try {
      const res = await schedulesService.claimTimetable({
        sourceTeacherId: selectedTimetableToClaim.teacherId,
        weekId: availableWeek?._id,
      });

      toast.success(res.message || "تم تعيين وتثبيت جدولك بنجاح 🎉");
      setConfirmModalOpen(false);
      if (refetchUser) await refetchUser();
      if (onComplete) {
        onComplete(res.data?.user || res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "فشل تعيين الجدول";
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  };

  // 2. Manual Complete Profile Submit
  const handleManualSubmit = async (e) => {
    e?.preventDefault?.();
    const cleanName = name.trim();

    if (!cleanName) {
      toast.error("يرجى كتابة اسمك الكريم لاستخدامه في النظام");
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast.error("يرجى اختيار مادة دراسية واحدة على الأقل من المواد التي تدرسها");
      return;
    }

    setSubmittingManual(true);
    try {
      const updatedUser = await completeProfile({
        name: cleanName,
        phone: phone.trim(),
        subjectIds: selectedSubjectIds,
      });

      toast.success(`أهلاً بك أ. ${updatedUser.name}! تم حفظ بياناتك بنجاح 🎉`);
      if (refetchUser) await refetchUser();
      if (onComplete) {
        onComplete(updatedUser);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ البيانات";
      toast.error(msg);
    } finally {
      setSubmittingManual(false);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-7 border border-gray-100 overflow-hidden relative max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="text-center pb-4 border-b border-gray-100 space-y-1.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl text-white mx-auto shadow-md shadow-blue-500/20">
            👨‍🏫
          </div>
          <h2 className="text-xl font-black text-gray-900">
            مرحباً بك يا معلم! كيف تود بدء جدولك؟
          </h2>
          <p className="text-xs text-gray-500 font-medium max-w-md mx-auto">
            اختر جدولك الجاهز المعد مسبقاً من المدرسة أو حدد موادك الدراسية للبدء.
          </p>

          {/* Mode Switch Tabs */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setMode("available");
                setPreviewTimetable(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === "available"
                  ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
              }`}
            >
              <span>📋</span> الجداول المتاحة في المدرسة ({availableTimetables.length})
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === "manual"
                  ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
              }`}
            >
              <span>✍️</span> إدخال وتحديد المواد يدوياً
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto py-4 flex-1 pe-1 space-y-4">
          
          {/* Email badge */}
          {user?.email && (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-700 font-bold">الحساب:</span>
                <span className="text-xs font-mono font-bold text-blue-950">
                  {user.email}
                </span>
              </div>
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                ✓ متصل عبر Google
              </span>
            </div>
          )}

          {/* TAB 1: Available Timetables Flow */}
          {mode === "available" && (
            <div className="space-y-3 animate-fade-in">
              {loadingAvailable ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-gray-400">جاري فحص الجداول المعدة في المدرسة...</p>
                </div>
              ) : previewTimetable ? (
                /* Preview Sub-view */
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTimetable(null)}
                        className="text-xs font-black text-emerald-800 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer border border-emerald-300"
                      >
                        <span>←</span> عودة للجداول
                      </button>
                      <span className="text-xs font-black text-emerald-950">
                        {previewTimetable.teacherName} ({previewTimetable.totalClasses} حصة)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTimetableToClaim(previewTimetable);
                        setConfirmModalOpen(true);
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>✓</span> تعيين هذا الجدول لحسابي
                    </button>
                  </div>

                  {/* Grid Preview Table */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                          <th className="p-2 text-center w-20 border-e border-gray-200">اليوم</th>
                          {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                            <th key={p} className="p-2 text-center border-e border-gray-200 last:border-e-0 min-w-[70px]">
                              {p}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const matrix = buildPreviewMatrix(previewTimetable.schedules);
                          return DAYS_ORDER.map((day) => (
                            <tr key={day} className="border-b border-gray-100 hover:bg-gray-50/50">
                              <td className="p-2 font-black text-gray-800 text-center bg-gray-50/60 border-e border-gray-200">
                                {day}
                              </td>
                              {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                                const cell = matrix[day][p];
                                return (
                                  <td
                                    key={p}
                                    className="p-1 text-center border-e border-gray-100 last:border-e-0"
                                  >
                                    {cell ? (
                                      <div
                                        className="p-1 rounded-lg border text-[10px] font-bold shadow-xs space-y-0.5"
                                        style={{
                                          backgroundColor: (cell.subject?.color || "#3b82f6") + "15",
                                          borderColor: (cell.subject?.color || "#3b82f6") + "40",
                                          color: cell.subject?.color || "#1e3a8a",
                                        }}
                                      >
                                        <div className="truncate font-black">{cell.className || "حصة"}</div>
                                        <div className="text-[9px] opacity-80 truncate">{cell.subject?.name || ""}</div>
                                      </div>
                                    ) : (
                                      <span className="text-gray-200 text-[10px] font-mono">—</span>
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
              ) : availableTimetables.length === 0 ? (
                /* No available timetables */
                <div className="py-8 text-center space-y-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-lg mx-auto border border-amber-200">
                    ℹ️
                  </div>
                  <h3 className="text-sm font-black text-gray-800">
                    لا توجد جداول غير مسندة في المدرسة حالياً
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    يمكنك الانتقال لتبويب "إدخال وتحديد المواد يدوياً" لإكمال ملفك والبدء.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    الانتقال لتحديد المواد يدويّاً ←
                  </button>
                </div>
              ) : (
                /* Timetables Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableTimetables.map((tt) => (
                    <div
                      key={tt.teacherId}
                      className="bg-white border-2 border-gray-200/90 hover:border-blue-500 hover:shadow-md rounded-2xl p-3.5 transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-black text-gray-900 group-hover:text-blue-700 transition-colors">
                            {tt.teacherName}
                          </h4>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-xs px-2 py-0.5 rounded-lg flex-shrink-0">
                            {tt.totalClasses} حصة
                          </span>
                        </div>

                        {/* Subjects */}
                        {tt.subjects && tt.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tt.subjects.map((sub) => (
                              <span
                                key={sub._id}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                                style={{
                                  backgroundColor: (sub.color || "#3b82f6") + "15",
                                  borderColor: (sub.color || "#3b82f6") + "30",
                                  color: sub.color || "#1e40af",
                                }}
                              >
                                {sub.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Classes */}
                        {tt.classNames && tt.classNames.length > 0 && (
                          <div className="mt-1.5 text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] font-bold text-gray-400">الفصول:</span>
                            {tt.classNames.map((c) => (
                              <span key={c} className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded text-[10px] font-semibold border border-gray-200">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewTimetable(tt)}
                          className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          👁️ معاينة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTimetableToClaim(tt);
                            setConfirmModalOpen(true);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer"
                        >
                          ✓ تعيين لي
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manual Flow */}
          {mode === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4 animate-fade-in">
              {/* Teacher Name */}
              <div>
                <label className="block text-xs font-black text-gray-800 mb-1.5">
                  اسمك الكامل (الذي سيظهر في الجداول والخطط){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أ. محمد عبدالمحسن العتيبي"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-bold text-gray-900"
                />
              </div>

              {/* Subjects Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-gray-800">
                    المواد التي تدرسها <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                    تم اختيار {selectedSubjectIds.length} مواد
                  </span>
                </div>

                {loadingSubjects ? (
                  <div className="p-4 text-center text-xs text-gray-400 font-bold animate-pulse">
                    جاري تحميل المواد الدراسية...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-1">
                    {subjects.map((sub) => {
                      const isSelected = selectedSubjectIds.includes(sub._id);
                      const icon = SUBJECT_ICONS[sub.name] || "📖";

                      return (
                        <button
                          type="button"
                          key={sub._id}
                          onClick={() => toggleSubject(sub._id)}
                          className={`p-2.5 rounded-xl border-2 text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/80 text-blue-950 font-black shadow-xs ring-2 ring-blue-400/20"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-lg">{icon}</span>
                            <span className="text-xs truncate">{sub.name}</span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 text-[10px] ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رقم الجوال (اختياري)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
                  dir="ltr"
                />
              </div>

              {/* Submit Manual */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingManual || selectedSubjectIds.length === 0 || !name.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingManual ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>تأكيد وحفظ والبدء 🚀</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Claiming */}
      {confirmModalOpen && selectedTimetableToClaim && (
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
                هل أنت متأكد من اختيار وتعيين جدول <span className="font-black text-emerald-800 font-mono">({selectedTimetableToClaim.teacherName})</span> بعدد <span className="font-black text-emerald-800">{selectedTimetableToClaim.totalClasses} حصة أسبوعياً</span>؟
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-right text-[11px] text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-1 text-emerald-950">
                <span>✓</span> سيتم ربط جميع الحصص والمواد بحسابك فوراً.
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
