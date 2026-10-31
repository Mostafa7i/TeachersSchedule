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

  const [isCustomTeacher, setIsCustomTeacher] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    teacher: "",
    customTeacherName: "",
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
  const [bulkFilling, setBulkFilling] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Helper to extract grade prefix from class names
  // e.g. "أول أول" -> "أول", "أول/2" -> "أول", "الصف الأول أ" -> "الصف الأول", "1/1" -> "1"
  const getGradePrefix = (className) => {
    if (!className) return "";
    const cleaned = className.trim();

    // "الصف الأول", "الصف الثاني", ...
    const fullMatch = cleaned.match(
      /^(الصف\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي\s+عشر|الثاني\s+عشر))/i,
    );
    if (fullMatch) return fullMatch[1];

    // "أولى", "أول", "ثاني", "ثالث", "رابع", "خامس", "سادس", "سابع", "ثامن", "تاسع", "عاشر"
    const wordMatch = cleaned.match(
      /^(أولى|أول|ثانية|ثاني|ثالثة|ثالث|رابعة|رابع|خامسة|خامس|سادسة|سادس|سابعة|سابع|ثامنة|ثامن|تاسعة|تاسع|عاشرة|عاشر)/i,
    );
    if (wordMatch) {
      const map = {
        أولى: "أول",
        ثانية: "ثاني",
        ثالثة: "ثالث",
        رابعة: "رابع",
        خامسة: "خامس",
        سادسة: "سادس",
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
    setShowBulkConfirm(false);
    if (schedule) {
      const customName =
        schedule.customTeacherName ||
        (schedule.teacher?.isCustom ? schedule.teacher.name : "") ||
        (schedule.teacher &&
        typeof schedule.teacher === "object" &&
        !schedule.teacher._id
          ? schedule.teacher.name
          : "") ||
        "";
      const hasCustom = Boolean(
        customName &&
          (!schedule.teacher ||
            schedule.teacher.isCustom ||
            !schedule.teacher._id),
      );
      setIsCustomTeacher(hasCustom);

      setFormData({
        subject: schedule.subject?._id || schedule.subject || "",
        teacher: hasCustom
          ? ""
          : schedule.teacher?._id || schedule.teacher || "",
        customTeacherName: customName,
        className: schedule.className || defaultClassName || "",
        room: schedule.room || "",
        lessonTitle: schedule.lessonTitle || "",
        homework: schedule.homework || "",
        activities: schedule.activities || "",
        notes: schedule.notes || "",
      });
    } else {
      setIsCustomTeacher(false);
      const defaultSubject =
        availableSubjects.length > 0 ? availableSubjects[0]._id : "";
      setFormData({
        subject: defaultSubject,
        teacher: isSuperAdmin ? teachers[0]?._id || "" : user?._id || "",
        customTeacherName: "",
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
      teacher: isCustomTeacher ? null : formData.teacher || null,
      customTeacherName: isCustomTeacher
        ? formData.customTeacherName.trim()
        : "",
      week: week?._id,
      day,
      period,
      id: schedule?._id,
    });
  };

  const shouldPromptForPreparationBroadcast = Boolean(
    schedule?._id &&
    formData.className?.trim() &&
    gradePrefix &&
    (canEditTitle || canEditHomework || canEditActivities || canEditNotes) &&
    [
      formData.lessonTitle,
      formData.homework,
      formData.activities,
      formData.notes,
    ].some((value) => value?.trim()),
  );

  const saveWithOptionalBroadcast = () => {
    if (shouldPromptForPreparationBroadcast) {
      setShowBulkConfirm(true);
      return;
    }

    executeSave();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const isLessonEmpty =
      !formData.lessonTitle || formData.lessonTitle.trim() === "";
    const isHomeworkEmpty =
      !formData.homework || formData.homework.trim() === "";

    // إذا كان عنوان الدرس أو الواجب فارغاً ولم يتم تأكيد التحذير مسبقاً
    if ((isLessonEmpty || isHomeworkEmpty) && !showWarningPrompt) {
      setShowWarningPrompt(true);
      return;
    }

    saveWithOptionalBroadcast();
  };

  // تعميم بيانات التحضير المكتوبة لكل فصول نفس الصف
  const handleBulkFill = async () => {
    if (!schedule?._id) return;
    setBulkFilling(true);
    try {
      const res = await schedulesService.bulkFillGrade({
        sourceScheduleId: schedule._id,
        lessonTitle: formData.lessonTitle,
        homework: formData.homework,
        activities: formData.activities,
        notes: formData.notes,
      });
      if (onBulkFill) onBulkFill(res.data?.schedules || []);
      setShowBulkConfirm(false);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "فشل تعميم بيانات التحضير";
      alert(msg);
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
    <>
      <Modal
        isOpen={isOpen && !showBulkConfirm}
        onClose={onClose}
        title={
          schedule
            ? `تعديل بيانات وخطة الحصة (${period}) - يوم ${day} ${schedule.className ? `(فصل ${schedule.className})` : ""}`
            : `إضافة حصة (${period}) - يوم ${day}`
        }
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>

            {showWarningPrompt ? (
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
                  onClick={saveWithOptionalBroadcast}
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                >
                  حفظ على أي حال
                </button>
              </div>
            ) : (
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
                  <span>حفظ الخطة</span>
                )}
              </button>
            )}
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    المعلم المسند
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isCustomTeacher;
                      setIsCustomTeacher(next);
                      if (next) {
                        setFormData((prev) => ({ ...prev, teacher: "" }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          customTeacherName: "",
                        }));
                      }
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    {isCustomTeacher
                      ? "← اختيار من المسجلين"
                      : "✍️ كتابة معلم بديل"}
                  </button>
                </div>

                {isCustomTeacher ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={formData.customTeacherName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customTeacherName: e.target.value,
                          teacher: "",
                        })
                      }
                      placeholder="اكتب اسم المعلم (مثال: أ. محمد بديل)"
                      className="w-full px-3 py-2 text-xs font-bold bg-amber-50/70 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-amber-700 font-semibold">
                      💡 معلم منتدب أو غير مسجل في الحسابات
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.teacher}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomTeacher(true);
                        setFormData({
                          ...formData,
                          teacher: "",
                          customTeacherName: "",
                        });
                      } else {
                        setFormData({
                          ...formData,
                          teacher: e.target.value,
                          customTeacherName: "",
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- اختر المعلم --</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        👨‍🏫 {t.name}
                      </option>
                    ))}
                    <option value="__custom__">
                      ✍️ كتابة اسم معلم آخر غير مسجل...
                    </option>
                  </select>
                )}
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
      <Modal
        isOpen={isOpen && showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        title="تعميم بيانات الدرس والواجب"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowBulkConfirm(false)}
              disabled={bulkFilling}
              className="px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              رجوع للتعديل
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBulkConfirm(false);
                executeSave();
              }}
              disabled={bulkFilling}
              className="px-4 py-2.5 text-sm font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              لا، لهذه الحصة فقط
            </button>
            <button
              type="button"
              onClick={handleBulkFill}
              disabled={bulkFilling}
              className="px-4 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {bulkFilling && (
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
              )}
              {bulkFilling ? "جاري التعميم..." : "نعم، عمّم الخطة"}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
          <span className="text-2xl shrink-0">📚</span>
          <p>
            هل تريد تعميم بيانات الخطة والدرس على جميع فصول صف{" "}
            <span className="font-black text-violet-900">"{gradePrefix}"</span>{" "}
            مثل "{formData.className}"؟ سيتم تحديث{" "}
            <strong>كل الحقول المكتوبة</strong> — عنوان الدرس والواجبات والأنشطة
            والملاحظات — في حصص المادة نفسها خلال هذا الأسبوع.
          </p>
        </div>
      </Modal>
    </>
  );
}
