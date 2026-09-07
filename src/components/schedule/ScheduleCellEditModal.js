"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/constants";
import { schedulesService } from "@/services/schedules.service";

export default function ScheduleCellEditModal({
  isOpen,
  onClose,
  schedule,
  week,
  day,
  period,
  subjects = [],
  teachers = [],
  defaultClassName = "",
  onSave,
  onBulkFill,
  loading = false,
}) {
  const { user, hasPermission, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    subject: "",
    teacher: "",
    className: "",
    room: "",
    lessonTitle: "",
    homework: "",
    activities: "",
    notes: "",
  });

  const isSuperAdmin = isAdmin();
  const hasFullEdit = isSuperAdmin || hasPermission(PERMISSIONS.SCHEDULES_EDIT);
  const canEditTitle =
    hasFullEdit || hasPermission(PERMISSIONS.SCHEDULES_EDIT_TITLE);
  const canEditHomework =
    hasFullEdit || hasPermission(PERMISSIONS.SCHEDULES_EDIT_HOMEWORK);
  const canEditActivities =
    hasFullEdit || hasPermission(PERMISSIONS.SCHEDULES_EDIT_ACTIVITIES);
  const canEditNotes =
    hasFullEdit || hasPermission(PERMISSIONS.SCHEDULES_EDIT_NOTES);

  const availableSubjects = isSuperAdmin
    ? subjects
    : subjects.filter((s) =>
        (user?.subjects || []).some(
          (us) =>
            (us._id ? us._id.toString() : us.toString()) === s._id.toString(),
        ),
      );

  const [showWarningPrompt, setShowWarningPrompt] = useState(false);
  const [showBulkConfirmPrompt, setShowBulkConfirmPrompt] = useState(false);
  const [bulkFilling, setBulkFilling] = useState(false);
  const [bulkScope, setBulkScope] = useState("week"); // "week" | "day"

  // Helper to extract grade prefix from class names
  // e.g. "أول أول" -> "أول", "أول/2" -> "أول", "الصف الأول أ" -> "الصف الأول", "1/1" -> "1"
  const getGradePrefix = (className) => {
    if (!className) return "";
    const cleaned = className.trim();

    // "الصف الأول", "الصف الثاني", ...
    const fullMatch = cleaned.match(
      /^(الصف\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي\s+عشر|الثاني\s+عشر))/i
    );
    if (fullMatch) return fullMatch[1];

    // "أولى", "أول", "ثاني", "ثالث", "رابع", "خامس", "سادس", "سابع", "ثامن", "تاسع", "عاشر"
    const wordMatch = cleaned.match(
      /^(أولى|أول|ثانية|ثاني|ثالثة|ثالث|رابعة|رابع|خامسة|خامس|سادسة|سادس|سابعة|سابع|ثامنة|ثامن|تاسعة|تاسع|عاشرة|عاشر)/i
    );
    if (wordMatch) {
      const map = {
        "أولى": "أول",
        "ثانية": "ثاني",
        "ثالثة": "ثالث",
        "رابعة": "رابع",
        "خامسة": "خامس",
        "سادسة": "سادس",
      };
      return map[wordMatch[1]] || wordMatch[1];
    }

    // Numbers: "1/1", "1-A", "2/3" -> "1", "2"
    const numMatch = cleaned.match(/^(\d+)/);
    if (numMatch) return numMatch[1];

    const parts = cleaned.split(/[\s\/\-_]+/);
    if (parts.length > 1) return parts[0];

    return cleaned;
  };

  const gradePrefix = getGradePrefix(formData.className);

  useEffect(() => {
    setShowWarningPrompt(false);
    setShowBulkConfirmPrompt(false);
    setBulkFilling(false);
    if (schedule && typeof schedule === "object") {
      setFormData({
        subject: schedule.subject?._id || schedule.subject || "",
        teacher: schedule.teacher?._id || schedule.teacher || "",
        className: schedule.className || defaultClassName || "",
        room: schedule.room || "",
        lessonTitle: schedule.lessonTitle || "",
        homework: schedule.homework || "",
        activities: schedule.activities || "",
        notes: schedule.notes || "",
      });
    } else {
      const defaultSubject =
        availableSubjects.length > 0 ? availableSubjects[0]._id : "";
      setFormData({
        subject: defaultSubject,
        teacher: isSuperAdmin ? teachers[0]?._id || "" : user?._id || "",
        className: defaultClassName || "",
        room: "",
        lessonTitle: "",
        homework: "",
        activities: "",
        notes: "",
      });
    }
  }, [schedule, isOpen, defaultClassName]);

  const executeSave = () => {
    onSave({
      ...formData,
      week: week?._id,
      day,
      period,
      id: schedule?._id,
    });
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const isLessonEmpty =
      !formData.lessonTitle || formData.lessonTitle.trim() === "";
    const isHomeworkEmpty =
      !formData.homework || formData.homework.trim() === "";

    // إذا كان عنوان الدرس أو الواجب فارغاً ولم يتم تأكيد التحذير مسبقاً
    if ((isLessonEmpty || isHomeworkEmpty) && !showWarningPrompt) {
      setShowWarningPrompt(true);
      return;
    }

    // إذا كان الفصل يتبع صفاً (مثل أول، ثاني، ثالث...) ولم تظهر نافذة تأكيد الإملاء الجماعي
    if (
      schedule?._id &&
      gradePrefix &&
      (canEditTitle || canEditHomework) &&
      !showBulkConfirmPrompt
    ) {
      setShowBulkConfirmPrompt(true);
      return;
    }

    executeSave();
  };

  const handleSaveAnyway = () => {
    setShowWarningPrompt(false);
    if (
      schedule?._id &&
      gradePrefix &&
      (canEditTitle || canEditHomework) &&
      !showBulkConfirmPrompt
    ) {
      setShowBulkConfirmPrompt(true);
      return;
    }
    executeSave();
  };

  // إملاء وتطبيق تلقائي لجميع فصول نفس الصف
  const handleBulkFill = async () => {
    if (!schedule?._id) {
      executeSave();
      return;
    }
    setBulkFilling(true);
    try {
      const res = await schedulesService.bulkFillGrade({
        sourceScheduleId: schedule._id,
        lessonTitle: formData.lessonTitle,
        homework: formData.homework,
        activities: formData.activities,
        notes: formData.notes,
        scope: bulkScope,
      });
      setShowBulkConfirmPrompt(false);
      // Notify parent to update local state
      if (onBulkFill) onBulkFill(res.data?.schedules || []);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "فشل التطبيق الجماعي";
      // If error status 400 (e.g. no other classes found), save current schedule normally
      if (err.response?.status === 400) {
        executeSave();
      } else {
        alert(msg);
      }
    } finally {
      setBulkFilling(false);
    }
  };

  const missingFieldsNames = [];
  if (!formData.lessonTitle || formData.lessonTitle.trim() === "") {
    missingFieldsNames.push("عنوان وموضوع الدرس");
  }
  if (!formData.homework || formData.homework.trim() === "") {
    missingFieldsNames.push("الواجبات المنزلية");
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        schedule
          ? `تحضير وتعديل الحصة (${period}) - يوم ${day} ${schedule.className ? `(فصل ${schedule.className})` : ""}`
          : `إضافة حصة (${period}) - يوم ${day}`
      }
      size="lg"
      footer={
        <>
          {showBulkConfirmPrompt ? (
            /* Confirmation step footer */
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-2.5">
              <button
                type="button"
                onClick={() => setShowBulkConfirmPrompt(false)}
                disabled={bulkFilling}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                تراجع للتعديل
              </button>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={executeSave}
                  disabled={loading || bulkFilling}
                  className="px-4 py-2.5 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  حفظ لهذه الحصة فقط
                </button>
                <button
                  type="button"
                  onClick={handleBulkFill}
                  disabled={loading || bulkFilling}
                  className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {bulkFilling ? (
                    <>
                      <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                      <span>جاري التطبيق والحفظ...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>نعم، تطبيق وحفظ لجميع فصول ({gradePrefix})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : showWarningPrompt ? (
            /* Warning prompt footer */
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWarningPrompt(false)}
                  className="px-4 py-2.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all"
                >
                  ✏️ إكمال الحقول الآن
                </button>
                <button
                  type="button"
                  onClick={handleSaveAnyway}
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                >
                  حفظ على أي حال
                </button>
              </div>
            </div>
          ) : (
            /* Standard modal footer */
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التحضير</span>
                )}
              </button>
            </>
          )}
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bulk Confirmation Banner on Save */}
        {showBulkConfirmPrompt && (
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-300 rounded-2xl p-4 text-xs text-violet-950 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚡</span>
              <div className="flex-1 space-y-1">
                <p className="font-black text-violet-950 text-sm">
                  هل تريد تطبيق هذا التحضير على باقي فصول صف "{gradePrefix}"؟
                </p>
                <p className="font-medium text-violet-800 leading-relaxed">
                  سيتم حفظ وتطبيق <span className="font-black underline">عنوان الدرس والواجبات والأنشطة</span> من فصل{" "}
                  <span className="font-black bg-violet-200 text-violet-900 px-2 py-0.5 rounded-md">
                    {formData.className}
                  </span>{" "}
                  على باقي فصول صف "{gradePrefix}" في جدول هذا الأسبوع (مثل {gradePrefix} أول، {gradePrefix} ثاني، {gradePrefix} ثالث...).
                </p>
              </div>
            </div>

            {/* Scope selector tabs */}
            <div className="bg-white/90 p-2.5 rounded-xl border border-violet-200 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-violet-900 pr-1">
                نطاق التطبيق التلقائي:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBulkScope("week")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    bulkScope === "week"
                      ? "bg-violet-700 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🗓️ كامل الأسبوع
                </button>
                <button
                  type="button"
                  onClick={() => setBulkScope("day")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    bulkScope === "day"
                      ? "bg-violet-700 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  📅 يوم ${day} فقط
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Warning Banner if fields are empty */}
        {showWarningPrompt && (
          <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl text-amber-900 flex items-start gap-3 animate-bounce-short shadow-sm">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div className="space-y-1">
              <p className="text-xs font-black text-amber-950">
                تنبيه من النظام: تركت حقول أساسية فارغة!
              </p>
              <p className="text-xs font-medium text-amber-800 leading-relaxed">
                لم تقم بتعبئة{" "}
                <span className="font-bold underline">
                  {missingFieldsNames.join(" و ")}
                </span>
                . يوصى بإكمالها لتظهر خطتك كـ "مكتملة 100%" في لوحة المتابعة
                وتفادي إرسال تنبيهات من إدارة المدرسة.
              </p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
          <div>
            <span className="font-bold text-slate-900">اليوم:</span> {day}
          </div>
          <div>
            <span className="font-bold text-slate-900">الحصة:</span> الحصة{" "}
            {period}
          </div>
          {formData.className && (
            <div className="bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-lg font-bold">
              <span>الصف/الفصل:</span> {formData.className}
            </div>
          )}
          <div>
            <span className="font-bold text-slate-900">الأسبوع:</span>{" "}
            {week?.label}
          </div>
        </div>

        {/* Admin only: Class, Subject, Teacher and Room edit */}
        {isSuperAdmin ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم الفصل / الصف <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.className}
                onChange={(e) =>
                  setFormData({ ...formData, className: e.target.value })
                }
                required
                placeholder="مثال: ثاني ثاني / أول أول"
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                المادة الدراسية <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                required
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- اختر المادة --</option>
                {availableSubjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                المعلم المسند
              </label>
              <select
                value={formData.teacher}
                onChange={(e) =>
                  setFormData({ ...formData, teacher: e.target.value })
                }
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- اختر المعلم --</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    👨‍🏫 {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                القاعة / المعمل
              </label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) =>
                  setFormData({ ...formData, room: e.target.value })
                }
                placeholder="مثال: معمل الحاسب 1"
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        ) : null}

        {/* Lesson Title */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
            <span>عنوان وموضوع الدرس</span>
            {!canEditTitle && (
              <span className="text-xs text-amber-600 font-normal">
                قراءة فقط
              </span>
            )}
          </label>
          <input
            type="text"
            value={formData.lessonTitle}
            onChange={(e) =>
              setFormData({ ...formData, lessonTitle: e.target.value })
            }
            disabled={!canEditTitle}
            placeholder="مثال: ترتيب العمليات الحسابية والمعادلات"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400 font-medium"
          />
        </div>

        {/* Homework */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
            <span>الواجبات والمهام المنزلية</span>
            {!canEditHomework && (
              <span className="text-xs text-amber-600 font-normal">
                قراءة فقط
              </span>
            )}
          </label>
          <textarea
            rows={2}
            value={formData.homework}
            onChange={(e) =>
              setFormData({ ...formData, homework: e.target.value })
            }
            disabled={!canEditHomework}
            placeholder="مثال: حل تدريبات الكتاب ص 35 الفقرات (1، 2، 3)"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400"
          />
        </div>

        {/* Activities */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
            <span>الأنشطة الصفية والتطبيقات</span>
            {!canEditActivities && (
              <span className="text-xs text-amber-600 font-normal">
                قراءة فقط
              </span>
            )}
          </label>
          <textarea
            rows={2}
            value={formData.activities}
            onChange={(e) =>
              setFormData({ ...formData, activities: e.target.value })
            }
            disabled={!canEditActivities}
            placeholder="مثال: تطبيق عملي على الأجهزة في معمل الحاسب"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
            <span>الملاحظات</span>
            {!canEditNotes && (
              <span className="text-xs text-amber-600 font-normal">
                قراءة فقط
              </span>
            )}
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            disabled={!canEditNotes}
            placeholder="مثال: إحضار كتاب التمارين للحصة القادمة"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400"
          />
        </div>
      </form>
    </Modal>
  );
}
