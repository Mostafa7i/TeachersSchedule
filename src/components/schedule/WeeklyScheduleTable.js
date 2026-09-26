"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { PERMISSIONS } from "@/constants";
import { getLogoUrl, getClassBadgeStyle } from "@/lib/utils";
import { schedulesService } from "@/services/schedules.service";
import { Lock } from "lucide-react";

const isBlank = (value) => !value || String(value).trim() === "";
const getClassCategory = (className) =>
  String(className || "")
    .trim()
    .split(/\s+/)[0]
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/^ال/, "");

export default function WeeklyScheduleTable({
  week,
  schedules = [],
  settings,
  subjects = [],
  selectedClass = "",
  onSelectClass,
  onEditCell,
  onSaveCell,
  onBulkSave,
  onShareClass,
  readOnly = false,
  teacherHighlight = null,
  enableInlineEdit = true,
}) {
  const { user, hasPermission, isAdmin } = useAuth();
  const toast = useToast();

  const [mobileLayout, setMobileLayout] = useState("cards"); // "cards" | "table"
  const [selectedMobileDay, setSelectedMobileDay] = useState("");

  // Local state for inline editable cell values: { [scheduleId]: { lessonTitle, homework, activities, notes } }
  const [localEdits, setLocalEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);
  const [savedRowSuccess, setSavedRowSuccess] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const autoSaveTimers = useRef({});

  const isSuperAdmin = isAdmin();
  const canEditAny = isSuperAdmin || hasPermission(PERMISSIONS.SCHEDULES_EDIT);
  const canEditGranular =
    hasPermission(PERMISSIONS.SCHEDULES_EDIT_TITLE) ||
    hasPermission(PERMISSIONS.SCHEDULES_EDIT_HOMEWORK) ||
    hasPermission(PERMISSIONS.SCHEDULES_EDIT_ACTIVITIES) ||
    hasPermission(PERMISSIONS.SCHEDULES_EDIT_NOTES);

  const daysList = settings?.workDays || [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
  ];
  const periodsCount = settings?.periodsCount || 6;
  const periodsList = Array.from({ length: periodsCount }, (_, i) => i + 1);

  // Keep the selected mobile day valid when work-day settings load or change.
  useEffect(() => {
    setSelectedMobileDay((currentDay) =>
      currentDay && daysList.includes(currentDay)
        ? currentDay
        : daysList[0] || "",
    );
  }, [daysList.join("|")]);

  // Filter schedules if a specific class is selected
  const activeSchedules = useMemo(() => {
    if (!selectedClass) return schedules;
    return schedules.filter(
      (s) => (s.className || "").trim() === selectedClass.trim(),
    );
  }, [schedules, selectedClass]);

  // Group schedules by day and period
  const scheduleMatrix = useMemo(() => {
    const matrix = {};
    daysList.forEach((day) => {
      matrix[day] = {};
      periodsList.forEach((p) => {
        matrix[day][p] = [];
      });
    });

    activeSchedules.forEach((item) => {
      if (matrix[item.day] && matrix[item.day][item.period] !== undefined) {
        matrix[item.day][item.period].push(item);
      }
    });

    return matrix;
  }, [activeSchedules, daysList, periodsList]);

  // Distinct classes summary dynamically derived from active schedules
  const classesSummary = useMemo(() => {
    const classMap = {};
    schedules.forEach((s) => {
      const cName = (s.className || "").trim();
      if (!cName) return;
      if (!classMap[cName]) {
        classMap[cName] = {
          name: cName,
          count: 0,
          withLesson: 0,
          withHomework: 0,
        };
      }
      classMap[cName].count += 1;
      if (s.lessonTitle && s.lessonTitle.trim())
        classMap[cName].withLesson += 1;
      if (s.homework && s.homework.trim()) classMap[cName].withHomework += 1;
    });
    return Object.values(classMap);
  }, [schedules]);

  const scheduleStats = useMemo(() => {
    const totalSlots = daysList.length * periodsList.length;
    const filledSlots = activeSchedules.length;
    const lessonCount = activeSchedules.filter(
      (item) => item.lessonTitle && String(item.lessonTitle).trim(),
    ).length;
    const homeworkCount = activeSchedules.filter(
      (item) => item.homework && String(item.homework).trim(),
    ).length;
    return {
      totalSlots,
      filledSlots,
      emptySlots: Math.max(totalSlots - filledSlots, 0),
      lessonCount,
      homeworkCount,
    };
  }, [activeSchedules, daysList.length, periodsList.length]);

  // Calculate day dates relative to week start date
  const getDayDateFormatted = (dayName) => {
    if (!week?.startDate) return "";
    const dayNames = [
      "الأحد",
      "الإثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    const rawStartDate = String(week.startDate);
    const start = /^\d{4}-\d{2}-\d{2}$/.test(rawStartDate)
      ? new Date(`${rawStartDate}T00:00:00`)
      : new Date(rawStartDate);
    if (Number.isNaN(start.getTime())) return "";
    const startIdx = start.getDay();
    const targetIdx = dayNames.indexOf(dayName);
    if (targetIdx === -1) return "";

    let diff = targetIdx - startIdx;
    if (diff < 0) diff += 7;

    const targetDate = new Date(start);
    targetDate.setDate(start.getDate() + diff);

    return targetDate.toLocaleDateString("ar-SA", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  // Check if current user can edit this specific cell
  const checkCanEditCell = (cellData) => {
    if (readOnly) return false;
    if (canEditAny) return true;

    // If teacher: check if cell is assigned to teacher or matches their subjects
    if (cellData) {
      if (
        cellData.teacher &&
        user?._id &&
        (cellData.teacher._id || cellData.teacher).toString() ===
          user._id.toString()
      ) {
        return true;
      }
      if (canEditGranular && cellData.subject) {
        const cellSubjectId = cellData.subject._id
          ? cellData.subject._id.toString()
          : cellData.subject.toString();
        const userSubjectIds = (user?.subjects || []).map((s) =>
          s._id ? s._id.toString() : s.toString(),
        );
        return userSubjectIds.includes(cellSubjectId);
      }
    }

    return false;
  };

  const isTeacherSubject = (cellData) => {
    if (!cellData || !cellData.subject || !user) return false;
    const cellSubjectId = cellData.subject._id
      ? cellData.subject._id.toString()
      : cellData.subject.toString();
    const userSubjectIds = (user.subjects || []).map((s) =>
      s._id ? s._id.toString() : s.toString(),
    );
    return userSubjectIds.includes(cellSubjectId);
  };

  // Helper to get current cell value (either modified locally or from database record)
  const getCellValue = (cell, field) => {
    if (!cell || !cell._id) return "";
    if (localEdits[cell._id] && localEdits[cell._id][field] !== undefined) {
      return localEdits[cell._id][field];
    }
    return cell[field] || "";
  };

  // Handle local inline edit changes. Saving is debounced so typing stays smooth
  // while each row is persisted automatically after the user pauses.
  const handleInputChange = (cellId, field, value) => {
    setLocalEdits((prev) => ({
      ...prev,
      [cellId]: {
        ...(prev[cellId] || {}),
        [field]: value,
      },
    }));
  };

  // Auto-save each changed row after a short pause in typing.
  useEffect(() => {
    if (readOnly || !enableInlineEdit) return undefined;

    Object.keys(localEdits).forEach((cellId) => {
      if (autoSaveTimers.current[cellId]) {
        clearTimeout(autoSaveTimers.current[cellId]);
      }

      if (savingRowId === cellId) return;

      autoSaveTimers.current[cellId] = setTimeout(() => {
        const currentCell = schedules.find((item) => item._id === cellId);
        if (currentCell && checkCanEditCell(currentCell)) {
          handleSaveRow(currentCell);
        }
        delete autoSaveTimers.current[cellId];
      }, 850);
    });

    return () => {
      Object.values(autoSaveTimers.current).forEach(clearTimeout);
    };
  }, [localEdits, readOnly, enableInlineEdit, schedules, savingRowId]);

  useEffect(
    () => () => {
      Object.values(autoSaveTimers.current).forEach(clearTimeout);
    },
    [],
  );

  // Copy the complete weekly plan to every class in the same category.
  const handleCopyClassData = async (sourceCell) => {
    if (!sourceCell?._id || !sourceCell.className) return;
    const category = getClassCategory(sourceCell.className);
    const sortRows = (rows) =>
      [...rows].sort((a, b) => {
        const dayDifference = daysList.indexOf(a.day) - daysList.indexOf(b.day);
        return dayDifference || Number(a.period || 0) - Number(b.period || 0);
      });
    const sourceRows = sortRows(
      schedules.filter(
        (item) => (item.className || "").trim() === sourceCell.className.trim(),
      ),
    );
    const peerClassNames = [
      ...new Set(
        schedules
          .filter(
            (item) =>
              item._id !== sourceCell._id &&
              getClassCategory(item.className) === category,
          )
          .map((item) => (item.className || "").trim())
          .filter(Boolean),
      ),
    ];
    if (sourceRows.length === 0 || peerClassNames.length === 0) {
      toast.info("لا توجد فصول أخرى من نفس الفئة لنسخ الخطة إليها");
      return;
    }

    const updates = peerClassNames.flatMap((className) => {
      const targetRows = sortRows(
        schedules.filter((item) => (item.className || "").trim() === className),
      );
      return targetRows.slice(0, sourceRows.length).map((target, index) => {
        const source = sourceRows[index];
        return {
          id: target._id,
          lessonTitle: getCellValue(source, "lessonTitle"),
          homework: getCellValue(source, "homework"),
          activities: getCellValue(source, "activities"),
          notes: getCellValue(source, "notes"),
        };
      });
    });

    try {
      setBulkSaving(true);
      if (onBulkSave) await onBulkSave(updates);
      else await schedulesService.bulkUpdateLessons(updates);
      toast.success(
        `تم نسخ خطة ${sourceCell.className} إلى ${peerClassNames.length} فصول من فئة ${category} ✅`,
      );
    } catch (error) {
      console.error("Error copying class data:", error);
      toast.error("فشل نسخ بيانات الفصل للفصول من نفس الفئة");
    } finally {
      setBulkSaving(false);
    }
  };

  // Save a single row inline
  const handleSaveRow = async (cell) => {
    if (!cell || !cell._id) return;
    const edits = localEdits[cell._id];
    if (!edits || savingRowId === cell._id) {
      toast.info("لم يتم إجراء أي تعديل جديد على هذه الحصة");
      return;
    }

    // Freeze the exact edit set used by this request. The user may continue
    // typing while the request is in flight; newer values must never be erased
    // when this older request completes.
    const savedEditsSnapshot = { ...edits };

    const payload = {
      id: cell._id,
      lessonTitle:
        savedEditsSnapshot.lessonTitle !== undefined
          ? savedEditsSnapshot.lessonTitle
          : cell.lessonTitle || "",
      homework:
        savedEditsSnapshot.homework !== undefined
          ? savedEditsSnapshot.homework
          : cell.homework || "",
      activities:
        savedEditsSnapshot.activities !== undefined
          ? savedEditsSnapshot.activities
          : cell.activities || "",
      notes:
        savedEditsSnapshot.notes !== undefined
          ? savedEditsSnapshot.notes
          : cell.notes || "",
    };

    setSavingRowId(cell._id);
    try {
      if (onSaveCell) {
        await onSaveCell(payload);
      } else {
        await schedulesService.update(cell._id, payload);
      }

      // Mark success feedback for 2 seconds
      setSavedRowSuccess((prev) => ({ ...prev, [cell._id]: true }));
      setTimeout(() => {
        setSavedRowSuccess((prev) => {
          const next = { ...prev };
          delete next[cell._id];
          return next;
        });
      }, 2500);

      // Clean only values that are still equal to the request snapshot.
      // Values typed while saving remain dirty and will be saved afterwards.
      setLocalEdits((prev) => {
        const next = { ...prev };
        const currentEdits = next[cell._id];
        if (!currentEdits) return next;

        const remainingEdits = { ...currentEdits };
        Object.entries(savedEditsSnapshot).forEach(([field, value]) => {
          if (remainingEdits[field] === value) {
            delete remainingEdits[field];
          }
        });

        if (Object.keys(remainingEdits).length > 0) {
          next[cell._id] = remainingEdits;
        } else {
          delete next[cell._id];
        }
        return next;
      });

      toast.success("تم حفظ الخطة بنجاح ✅");
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل حفظ الخطة");
    } finally {
      setSavingRowId(null);
    }
  };

  // Save all modified rows at once
  const unsavedCount = Object.keys(localEdits).length;

  const handleSaveAll = async () => {
    if (unsavedCount === 0) {
      toast.info("لا توجد تعديلات غير محفوظة");
      return;
    }

    const updates = Object.entries(localEdits).map(([id, values]) => {
      const original = schedules.find((s) => s._id === id) || {};
      return {
        id,
        lessonTitle:
          values.lessonTitle !== undefined
            ? values.lessonTitle
            : original.lessonTitle || "",
        homework:
          values.homework !== undefined
            ? values.homework
            : original.homework || "",
        activities:
          values.activities !== undefined
            ? values.activities
            : original.activities || "",
        notes: values.notes !== undefined ? values.notes : original.notes || "",
      };
    });

    setBulkSaving(true);
    try {
      if (onBulkSave) {
        await onBulkSave(updates);
      } else {
        await schedulesService.bulkUpdateLessons(updates);
      }

      setLocalEdits({});
      toast.success(`تم حفظ جميع التعديلات (${updates.length} حصة) بنجاح 🎉`);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل حفظ التعديلات الجماعية");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div
      id="weekly-schedule-print-container"
      className="relative bg-white rounded-4xl shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)] border border-slate-200 overflow-hidden p-3 sm:p-5 lg:p-7 space-y-5 sm:space-y-6 w-full max-w-full"
    >
      {/* 1) School Header & Visual Branding */}
      <div className="relative border-b-2 border-slate-900 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center md:text-right">
          {/* Ministry / Department info */}
          <div className="text-xs text-slate-600 space-y-1 font-medium leading-relaxed">
            <p className="font-bold text-sm text-green-700">
              المملكة العربية السعودية
            </p>
            <p>{settings?.ministryHeader || "الإدارة العامة للتعليم"}</p>
          </div>

          {/* School Name & Title */}
          <div className="text-center space-y-1.5">
            <h2 className="sm:text-2xl font-black text-slate-900 tracking-tight">
              {settings?.schoolName || "مدرسة الشروق التربية"}
            </h2>
            <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-slate-900 text-white text-xs sm:text-sm font-bold px-2 py-1.5 rounded-full shadow-xs">
              <span>الخطة والجدول الدراسي الأسبوعي</span>
              {selectedClass ? (
                <>
                  <span className="text-blue-300">•</span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-black shadow-xs ${getClassBadgeStyle(selectedClass).solid}`}
                  >
                    فصل: {selectedClass}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-blue-300">•</span>
                  <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    جميع الفصول
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
              {settings?.academicYear || "1447-1448هـ"} —{" "}
              {settings?.term || "الفصل الدراسي الأول"}
            </p>

            {selectedClass && onShareClass && (
              <div className="pt-1 no-print no-export">
                <button
                  type="button"
                  onClick={() => onShareClass(selectedClass)}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-1 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <span>📲</span>
                  <span>مشاركة جدول {selectedClass} عبر واتساب</span>
                </button>
              </div>
            )}
          </div>

          {/* Logo & Week Info */}
          <div className="flex flex-col items-center md:items-end justify-center gap-2">
            {settings?.logo ? (
              <img
                src={getLogoUrl(settings.logo)}
                alt="School Logo"
                className="h-14 w-auto object-contain"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-lg shadow-xs">
                🏫
              </div>
            )}
            <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              {week?.label || "الأسبوع الدراسي"}
            </div>
          </div>
        </div>
      </div>

      {unsavedCount > 0 && !readOnly && (
        <div
          className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-2xl flex items-center gap-2 no-print no-export"
          role="status"
          aria-live="polite"
        >
          <span className="text-base">☁️</span>
          <span className="text-xs sm:text-sm font-bold">
            يتم حفظ التعديلات تلقائيًا بعد الانتهاء من الكتابة...
          </span>
        </div>
      )}

      {/* 2) Summary Banner when "All Classes" is selected with Distinct Class Colors */}
      {!selectedClass && classesSummary.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-3 no-print no-export">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>📊</span>
              <span>فصول المدرسة المسجلة لهذا الأسبوع:</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">
              إجمالي الفصول: {classesSummary.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {classesSummary.map((cls) => {
              const style = getClassBadgeStyle(cls.name);
              return (
                <button
                  key={cls.name}
                  type="button"
                  onClick={() => onSelectClass && onSelectClass(cls.name)}
                  className={`p-2 rounded-2xl border text-right transition-all group cursor-pointer hover:shadow-md ${style.bg} ${style.border}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-black text-[11px] ${style.text}`}>
                      {cls.name}
                    </span>
                    <span
                      className={`text-[8px] font-bold p-1 rounded-full ${style.badge}`}
                    >
                      {cls.count} حصة
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-600 font-medium">
                    الخطة:{" "}
                    <strong className="text-emerald-700 font-black">
                      {cls.withLesson}
                    </strong>{" "}
                    / {cls.count}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View Switcher Controls on Mobile */}
      <div className="flex md:hidden items-center justify-between bg-slate-900 p-1.5 rounded-2xl text-xs no-print no-export shadow-sm">
        <span className="font-bold text-white/80 px-2">طريقة العرض</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMobileLayout("cards")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${mobileLayout === "cards" ? "bg-white text-slate-900 shadow-sm" : "text-white/70 hover:text-white"}`}
          >
            📱 بطاقات سهلة
          </button>
          <button
            type="button"
            onClick={() => setMobileLayout("table")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${mobileLayout === "table" ? "bg-white text-slate-900 shadow-sm" : "text-white/70 hover:text-white"}`}
          >
            📊 جدول كامل
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE CARDS VIEW: Direct Inline Inputs on Phone                          */}
      {/* ========================================================================= */}
      <div
        className={`schedule-mobile-cards-container no-export ${
          mobileLayout === "cards" ? "block md:hidden space-y-3.5" : "hidden"
        }`}
      >
        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {daysList.map((day) => {
            const isSel = (selectedMobileDay || daysList[0]) === day;
            const entriesCount = periodsList.reduce(
              (acc, p) => acc + (scheduleMatrix[day]?.[p]?.length || 0),
              0,
            );
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedMobileDay(day)}
                className={`shrink-0 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSel
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{day}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSel ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"}`}
                >
                  {entriesCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Day Banner */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700">
          <span>
            📅 خطة حصص يوم {selectedMobileDay || daysList[0]} (
            {getDayDateFormatted(selectedMobileDay || daysList[0])})
          </span>
        </div>

        {/* Period Cards with Direct Inline Inputs */}
        <div className="space-y-3">
          {periodsList.map((period) => {
            const currentDay = selectedMobileDay || daysList[0];
            const cellEntries = scheduleMatrix[currentDay]?.[period] || [];

            if (cellEntries.length === 0) {
              return (
                <div
                  key={period}
                  className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-500"
                >
                  <div>
                    <span className="font-bold block text-slate-700">
                      الحصة {period}
                    </span>
                    <span>لا توجد حصة مسندة</span>
                  </div>
                  {isSuperAdmin && onEditCell && (
                    <button
                      type="button"
                      onClick={() =>
                        onEditCell(null, currentDay, period, selectedClass)
                      }
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-blue-700"
                      title="إضافة حصة وتحديد المادة والمدرس والفصل"
                    >
                      <span>＋</span>
                      <span>إضافة حصة</span>
                    </button>
                  )}
                </div>
              );
            }

            return cellEntries.map((cell, entryIdx) => {
              const canEdit =
                checkCanEditCell(cell) && !readOnly && enableInlineEdit;
              const lockedCell = !canEdit;
              const isDirty = Boolean(localEdits[cell._id]);
              const isSaved = Boolean(savedRowSuccess[cell._id]);
              const isSaving = savingRowId === cell._id;
              const classStyle = getClassBadgeStyle(cell.className);

              return (
                <div
                  key={cell._id || `${period}-${entryIdx}`}
                  className={`p-4 rounded-3xl border shadow-xs transition-all space-y-3 ${
                    lockedCell
                      ? "bg-slate-100 border-slate-300 text-slate-700"
                      : isDirty
                        ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300"
                        : isSaved
                          ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300"
                          : "bg-white border-gray-200"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                        {period}
                      </span>
                      {cell.className && (
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${classStyle.badge}`}
                        >
                          {cell.className}
                        </span>
                      )}
                      <span className="font-bold text-xs text-slate-800">
                        {typeof cell.subject === "object"
                          ? cell.subject?.name || "المادة"
                          : cell.subject || "المادة"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSuperAdmin && onEditCell && (
                        <button
                          type="button"
                          onClick={() =>
                            onEditCell(
                              cell,
                              currentDay,
                              period,
                              cell.className || selectedClass,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700 transition hover:bg-blue-100"
                          title="تعديل المادة والمدرس والفصل والقاعة"
                        >
                          <span>✎</span>
                          <span>تعديل بيانات الحصة</span>
                        </button>
                      )}
                      {cell.teacher?.name && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          👨‍🏫 {cell.teacher.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {cell.className && canEdit && (
                    <button
                      type="button"
                      disabled={bulkSaving}
                      onClick={() =>
                        handleCopyClassData(cell, currentDay, period)
                      }
                      className="no-print inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-black text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                      title="نسخ كل بيانات الفصل للفصول من نفس الفئة"
                    >
                      <span aria-hidden="true">⧉</span>
                      {bulkSaving
                        ? "جارٍ النسخ..."
                        : "نسخ كل بيانات الفصل للفئة"}
                    </button>
                  )}

                  {/* Inline Form Fields */}
                  <div className="space-y-2.5">
                    {/* Lesson Title */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <span>📖</span>
                          <span>عنوان وموضوع الدرس:</span>
                        </label>
                      </div>
                      {canEdit ? (
                        <input
                          type="text"
                          value={getCellValue(cell, "lessonTitle")}
                          onChange={(e) =>
                            handleInputChange(
                              cell._id,
                              "lessonTitle",
                              e.target.value,
                            )
                          }
                          placeholder="اكتب عنوان وموضوع الدرس هنا..."
                          className={`w-full min-h-13 px-3 py-3 text-xs font-semibold text-slate-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all ${isBlank(getCellValue(cell, "lessonTitle")) ? "bg-red-50 border-red-300 placeholder:text-red-400" : "bg-white border-gray-200"}`}
                        />
                      ) : (
                        <p
                          className={`text-xs font-bold p-2 border rounded-xl ${
                            isBlank(cell.lessonTitle)
                              ? "bg-red-50 border-red-300 text-red-700"
                              : "bg-slate-200/80 border-slate-300 text-slate-900"
                          }`}
                        >
                          {isBlank(cell.lessonTitle) ? (
                            <span className="text-red-600 italic font-bold">
                              ⚠ لم يُسجل عنوان الدرس
                            </span>
                          ) : (
                            cell.lessonTitle
                          )}
                        </p>
                      )}
                    </div>

                    {/* Homework & Activities */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <span>📝</span>
                          <span>الواجبات والأنشطة:</span>
                        </label>
                      </div>
                      {canEdit ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={getCellValue(cell, "homework")}
                            onChange={(e) =>
                              handleInputChange(
                                cell._id,
                                "homework",
                                e.target.value,
                              )
                            }
                            placeholder="الواجب المنزلي (مثال: صـ 25 تمرين 3)"
                            className={`w-full min-h-[52px] px-3 py-3 text-xs text-slate-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all ${isBlank(getCellValue(cell, "homework")) ? "bg-red-50 border-red-300 placeholder:text-red-400" : "bg-white border-gray-200"}`}
                          />
                          <input
                            type="text"
                            value={getCellValue(cell, "activities")}
                            onChange={(e) =>
                              handleInputChange(
                                cell._id,
                                "activities",
                                e.target.value,
                              )
                            }
                            placeholder="الأنشطة الصفية (اختياري)"
                            className="w-full min-h-[52px] px-3 py-3 text-xs text-slate-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
                          />
                        </div>
                      ) : (
                        <p
                          className={`text-xs p-2 border rounded-xl ${
                            isBlank(cell.homework)
                              ? "bg-red-50 border-red-300 text-red-700 font-bold"
                              : "bg-slate-200/80 border-slate-300 text-slate-800"
                          }`}
                        >
                          {isBlank(cell.homework) ? (
                            <span className="text-red-700 font-bold">
                              ⚠ الواجب غير مسجل
                            </span>
                          ) : (
                            `واجب: ${cell.homework}`
                          )}
                          {cell.activities ? ` | نشاط: ${cell.activities}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Auto-save status */}
                  <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-bold" aria-live="polite">
                      {isSaving ? (
                        <span className="text-blue-600">
                          ⏳ جارٍ الحفظ تلقائيًا...
                        </span>
                      ) : isDirty ? (
                        <span className="text-amber-600">
                          ● سيتم الحفظ تلقائيًا
                        </span>
                      ) : isSaved ? (
                        <span className="text-emerald-600">
                          ✓ تم الحفظ تلقائيًا
                        </span>
                      ) : (
                        <span className="text-slate-400">محفوظ تلقائيًا</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP / TABLE VIEW: Direct Inline Table Inputs                         */}
      {/* ========================================================================= */}
      <div
        className={`schedule-desktop-table-container ${
          mobileLayout === "table" ? "block" : "hidden md:block"
        }`}
      >
        <div className="overflow-x-auto schedule-table-wrap rounded-2xl border border-slate-300">
          <table className="w-full text-right border-separate border-spacing-0 min-w-[980px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-950 text-white text-xs sm:text-sm">
                <th className="border border-slate-700 p-2 w-32 text-center font-bold">
                  اليوم والتاريخ
                </th>
                <th className="border border-slate-700 px-2 py-3 w-14 text-center font-bold">
                  الحصة
                </th>
                {!selectedClass && (
                  <th className="border border-slate-700 p-2 w-28 font-bold text-center">
                    الفصل
                  </th>
                )}
                <th className="border border-slate-700 p-2 w-40 font-bold">
                  المادة والمعلم
                </th>
                <th className="border border-slate-700 p-2 font-bold min-w-[260px]">
                  عنوان الدرس والموضوع
                </th>
                <th className="border border-slate-700 p-2 font-bold min-w-[220px]">
                  الواجبات والأنشطة
                </th>
                <th className="border border-slate-700 p-2 w-36 font-bold">
                  الملاحظات
                </th>
                <th className="border border-slate-700 p-2 w-28 text-center font-bold no-export no-print">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm text-slate-800">
              {daysList.map((day, dayIndex) => {
                const dayDateFormatted = getDayDateFormatted(day);
                const dayBg =
                  dayIndex % 2 === 0 ? "bg-white" : "bg-slate-100/70";

                return periodsList.map((period, periodIndex) => {
                  const cellEntries = scheduleMatrix[day]?.[period] || [];
                  const cell = cellEntries[0] || null;
                  const canEdit = checkCanEditCell(cell) && !readOnly;
                  const dayBorderTop =
                    dayIndex > 0 && periodIndex === 0
                      ? "!border-t-[4px] !border-t-slate-900 day-separator-border"
                      : "";
                  const dayBorderBottom =
                    dayIndex < daysList.length - 1 &&
                    periodIndex === periodsCount - 1
                      ? "!border-b-[3px] !border-b-slate-900"
                      : "";
                  const daySeparation =
                    `${dayBorderTop} ${dayBorderBottom}`.trim();
                  const isMySubject = isTeacherSubject(cell);
                  const isDirty = cell && Boolean(localEdits[cell._id]);
                  const isSaved = cell && Boolean(savedRowSuccess[cell._id]);
                  const isSaving = cell && savingRowId === cell._id;

                  return (
                    <tr
                      key={`${day}-${period}`}
                      className={`${dayBg} hover:bg-amber-100/40 transition-colors ${!canEdit ? "bg-slate-100/90 text-slate-700" : ""} ${
                        isDirty
                          ? "bg-amber-50/70"
                          : isSaved
                            ? "bg-emerald-50/70"
                            : isMySubject
                              ? "bg-blue-50/40"
                              : "hover:bg-blue-50/20"
                      }`}
                    >
                      {/* Day Column with RowSpan (only on first period of each day) */}
                      {periodIndex === 0 && (
                        <td
                          rowSpan={periodsCount}
                          className={`border border-slate-400 p-3 text-center align-middle font-bold text-white border-r-4 ${
                            dayIndex > 0
                              ? "!border-t-[4px] !border-t-slate-900 day-separator-border"
                              : ""
                          } ${
                            dayIndex % 2 === 0
                              ? "bg-slate-900 border-r-blue-500"
                              : "bg-slate-950 border-r-indigo-500"
                          }`}
                        >
                          <div className="text-base font-black tracking-wide">
                            {day}
                          </div>
                          <div className="text-xs text-blue-200 font-bold mt-1 bg-white/10 px-2 py-0.5 rounded-md inline-block">
                            {dayDateFormatted}
                          </div>
                        </td>
                      )}

                      {/* Period Number */}
                      <td
                        className={`border border-slate-300 px-2 py-2.5 text-center font-bold text-slate-700 bg-slate-100/60 align-middle ${daySeparation}`}
                      >
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-800 text-white text-xs font-black shadow-xs">
                          {period}
                        </span>
                      </td>

                      {/* Class Column if in "All Classes" View with Distinct Colors */}
                      {!selectedClass && (
                        <td
                          className={`border border-slate-300 p-2 text-center align-middle ${daySeparation}`}
                        >
                          {cellEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {cellEntries.map((c, i) => {
                                const cStyle = getClassBadgeStyle(c.className);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() =>
                                      c.className &&
                                      onSelectClass &&
                                      onSelectClass(c.className)
                                    }
                                    className={`inline-block font-black px-2.5 py-1 rounded-lg text-xs cursor-pointer border shadow-xs transition-all hover:scale-105 ${cStyle.badge}`}
                                    title="عرض خطة هذا الفصل"
                                  >
                                    {c.className || "عام"}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs italic">
                              —
                            </span>
                          )}
                        </td>
                      )}

                      {/* Subject & Teacher */}
                      <td
                        className={`border border-slate-300 p-2.5 align-middle ${!canEdit ? "bg-slate-100/90" : ""} ${daySeparation}`}
                      >
                        {cell?.subject ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    cell.subject.color || "#3b82f6",
                                }}
                              />
                              <span className="font-bold text-slate-900">
                                {typeof cell.subject === "object"
                                  ? cell.subject?.name || "المادة"
                                  : cell.subject}
                              </span>
                            </div>
                            {cell.teacher?.name && (
                              <p className="text-xs text-slate-500 font-medium">
                                👨‍🏫 {cell.teacher.name}
                              </p>
                            )}
                            {cell.className && selectedClass && (
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${getClassBadgeStyle(cell.className).badge}`}
                              >
                                {cell.className}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            — (حصة غير محددة)
                          </span>
                        )}
                      </td>

                      {/* Lesson Title — Direct Inline Input */}
                      <td
                        className={`border border-slate-300 p-0 align-middle ${!canEdit ? "bg-slate-100/90" : ""} ${cell && isBlank(getCellValue(cell, "lessonTitle")) ? "bg-red-50/70" : ""} ${daySeparation}`}
                      >
                        {cell ? (
                          canEdit && enableInlineEdit ? (
                            <div className="relative group h-full min-h-[92px]">
                              <input
                                type="text"
                                value={getCellValue(cell, "lessonTitle")}
                                onChange={(e) =>
                                  handleInputChange(
                                    cell._id,
                                    "lessonTitle",
                                    e.target.value,
                                  )
                                }
                                placeholder="اكتب عنوان الدرس والموضوع..."
                                className={`w-full h-full min-h-[92px] px-3 py-3 text-xs font-semibold text-slate-900 border-0 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-blue-50/20 transition-all ${isBlank(getCellValue(cell, "lessonTitle")) ? "bg-red-50 placeholder:text-red-400" : "bg-white"}`}
                              />
                            </div>
                          ) : (
                            <p className="text-slate-900 font-bold leading-relaxed px-1">
                              {cell.lessonTitle || (
                                <span className="text-slate-300 text-xs italic font-normal">
                                  لم يُسجل الدرس بعد
                                </span>
                              )}
                            </p>
                          )
                        ) : (
                          <span className="text-slate-300 text-xs italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* Homework & Activities — Direct Inline Input */}
                      <td
                        className={`border border-slate-300 p-0 align-middle ${!canEdit ? "bg-slate-100/90" : ""} ${cell && isBlank(getCellValue(cell, "homework")) ? "bg-red-50/70" : ""} ${daySeparation}`}
                      >
                        {cell ? (
                          canEdit && enableInlineEdit ? (
                            <div className="space-y-1 relative group h-full min-h-[92px] p-1.5">
                              <div className="flex items-center">
                                <span
                                  className={`text-xs font-bold p-1 rounded ${
                                    isBlank(getCellValue(cell, "homework"))
                                      ? "bg-red-100 text-red-700"
                                      : "bg-sky-300/20 text-blue-500"
                                  }`}
                                >
                                  {isBlank(getCellValue(cell, "homework"))
                                    ? "⚠ الواجب فارغ:"
                                    : "الواجب:"}
                                </span>
                                <input
                                  type="text"
                                  value={getCellValue(cell, "homework")}
                                  onChange={(e) =>
                                    handleInputChange(
                                      cell._id,
                                      "homework",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="الواجب المنزلي..."
                                  className={`w-full min-h-10.5 px-3 py-2.5 text-xs text-slate-900 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-blue-50/20 transition-all ${isBlank(getCellValue(cell, "homework")) ? "!bg-red-50 !border !border-red-400 placeholder:text-red-500" : "bg-white"}`}
                                />
                              </div>
                              <div className="flex items-center">
                                <span className="text-xs text-green-500 font-bold bg-green-300/20 p-1 rounded">
                                  نشاط{" "}
                                </span>
                                <input
                                  type="text"
                                  value={getCellValue(cell, "activities")}
                                  onChange={(e) =>
                                    handleInputChange(
                                      cell._id,
                                      "activities",
                                      e.target.value,
                                    )
                                  }
                                  placeholder={
                                    cell.activities
                                      ? "الأنشطة الصفية..."
                                      : "لا يوجد"
                                  }
                                  className="w-full min-h-[42px] px-3 py-2.5 text-[11px] text-slate-700 bg-white border-0 rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:bg-emerald-50/20 transition-all"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {isBlank(cell.homework) ? (
                                <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-300 px-2 py-1.5 rounded-lg">
                                  ⚠ الواجب غير مسجل
                                </div>
                              ) : (
                                <div className="text-xs text-slate-800">
                                  <span className="font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded text-[11px] ml-1">
                                    واجب:
                                  </span>
                                  <span>{cell.homework}</span>
                                </div>
                              )}
                              {cell.activities && (
                                <div className="text-xs text-slate-800">
                                  <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px] ml-1">
                                    نشاط:
                                  </span>
                                  <span>{cell.activities}</span>
                                </div>
                              )}
                              {cell.homework && !cell.activities && (
                                <span className="text-slate-300 text-xs italic">
                                  لا يوجد نشاط
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-slate-300 text-xs italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td
                        className={`border border-slate-300 p-0 align-middle ${!canEdit ? "bg-slate-100/90" : ""} ${daySeparation}`}
                      >
                        {cell ? (
                          canEdit && enableInlineEdit ? (
                            <div>
                              <input
                                type="text"
                                value={getCellValue(cell, "notes")}
                                onChange={(e) =>
                                  handleInputChange(
                                    cell._id,
                                    "notes",
                                    e.target.value,
                                  )
                                }
                                placeholder="ملاحظات..."
                                className="w-full min-h-[92px] px-3 py-3 text-xs text-slate-900 bg-white border-0 rounded-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-amber-50/20 transition-all"
                              />
                            </div>
                          ) : cell.notes ? (
                            <p className="text-xs text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 font-medium">
                              {cell.notes}
                            </p>
                          ) : (
                            <span className="text-slate-300 text-xs italic">
                              —
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 text-xs italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* Auto-save status */}
                      <td
                        className={`border border-slate-300 p-2 text-center align-middle no-export no-print ${daySeparation}`}
                      >
                        {cell ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className="text-[10px] font-bold"
                              aria-live="polite"
                            >
                              {isSaving ? (
                                <span className="text-blue-700">⏳ حفظ...</span>
                              ) : isDirty ? (
                                <span className="text-amber-700">
                                  ● تلقائيًا
                                </span>
                              ) : isSaved ? (
                                <span className="text-emerald-700">
                                  ✓ محفوظ
                                </span>
                              ) : (
                                <span className="text-slate-400">محفوظ</span>
                              )}
                            </span>
                            {cell.className && canEdit && (
                              <button
                                type="button"
                                disabled={bulkSaving}
                                onClick={() =>
                                  handleCopyClassData(cell, day, period)
                                }
                                className="no-print inline-flex items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                                title="نسخ كل بيانات الفصل للفصول من نفس الفئة"
                              >
                                <span aria-hidden="true">⧉</span>
                                <span>
                                  {bulkSaving ? "جارٍ النسخ" : "نسخ للفئة"}
                                </span>
                              </button>
                            )}
                            {isSuperAdmin && onEditCell && (
                              <button
                                type="button"
                                onClick={() =>
                                  onEditCell(
                                    cell,
                                    day,
                                    period,
                                    cell.className || selectedClass,
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-black text-white shadow-sm transition hover:bg-blue-700"
                                title="تعديل المادة والمدرس والفصل والقاعة"
                              >
                                <span>✎</span>
                                <span>تعديل</span>
                              </button>
                            )}
                          </div>
                        ) : isSuperAdmin && onEditCell ? (
                          <button
                            type="button"
                            onClick={() =>
                              onEditCell(null, day, period, selectedClass)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black text-white shadow-sm transition hover:bg-blue-700"
                            title="إضافة حصة وتحديد المادة والمدرس والفصل"
                          >
                            <span>＋</span>
                            <span>إضافة</span>
                          </button>
                        ) : (
                          <p
                            className="flex justify-center text-amber-500 hover:animate-spin"
                            title="مغلق وغير مسند لك"
                          >
                            <Lock size={20} />
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3) Table Footer Signatures (For Official Print) */}
      <div className="mt-8 pt-5 border-t-2 border-slate-900/80 grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-xs text-slate-700 font-semibold">
        <div>
          <p className="text-slate-500 font-normal mb-6">وكيل المدرسة</p>
          <p className="font-bold text-slate-900">
            {settings?.academicAdvisorName || "أ. فهد الشمري"}
          </p>
        </div>
        <div className="hidden md:block">
          <p className="text-slate-500 font-normal mb-6">ختم المدرسة الرسمي</p>
          <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full mx-auto" />
        </div>
        <div>
          <p className="text-slate-500 font-normal mb-6">مدير المدرسة</p>
          <p className="font-bold text-slate-900">
            {settings?.principalName || "أ. عبدالعزيز الراجحي"}
          </p>
        </div>
      </div>
    </div>
  );
}
