"use client";

import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { getClassBadgeStyle } from "@/lib/utils";
import { schedulesService } from "@/services/schedules.service";
import { Copy, CheckCircle2, Layers, AlertCircle, X, Sparkles, BookOpen, Calendar, HelpCircle } from "lucide-react";

// Standard Saudi school week days
const DEFAULT_DAYS_ORDER = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export const getClassCategory = (className) => {
  if (!className) return "";
  const cleaned = String(className).trim().replace(/[ًٌٍَُِّْـ]/g, "");

  if (
    /أول|اول|1/.test(cleaned) &&
    (/الصف\s*(ال)?أول|الصف\s*(ال)?اول|^(ال)?أول|^(ال)?اول|1[\/\-\s]/.test(cleaned) ||
      cleaned.startsWith("1") ||
      cleaned.startsWith("أول") ||
      cleaned.startsWith("اول"))
  ) {
    return "أول";
  }
  if (
    /ثان|2/.test(cleaned) &&
    (/الصف\s*(ال)?ثان|^(ال)?ثان|2[\/\-\s]/.test(cleaned) ||
      cleaned.startsWith("2") ||
      cleaned.startsWith("ثاني") ||
      cleaned.startsWith("ثان"))
  ) {
    return "ثاني";
  }
  if (
    /ثالث|3/.test(cleaned) &&
    (/الصف\s*(ال)?ثالث|^(ال)?ثالث|3[\/\-\s]/.test(cleaned) ||
      cleaned.startsWith("3") ||
      cleaned.startsWith("ثالث"))
  ) {
    return "ثالث";
  }
  if (/رابع|4/.test(cleaned)) return "رابع";
  if (/خامس|5/.test(cleaned)) return "خامس";
  if (/سادس|6/.test(cleaned)) return "سادس";

  const tokens = cleaned
    .split(/[\s\/\-_]+/)
    .filter((t) => t && t !== "الصف" && t !== "صف");
  if (tokens.length > 0) {
    return tokens[0].replace(/^ال/, "");
  }
  return cleaned;
};

export const isSameSubject = (cellA, cellB) => {
  if (!cellA?.subject || !cellB?.subject) return true;
  const idA = cellA.subject?._id ? String(cellA.subject._id) : String(cellA.subject);
  const idB = cellB.subject?._id ? String(cellB.subject._id) : String(cellB.subject);
  if (idA && idB && idA === idB) return true;

  const nameA = typeof cellA.subject === "object" ? cellA.subject.name : String(cellA.subject);
  const nameB = typeof cellB.subject === "object" ? cellB.subject.name : String(cellB.subject);
  if (nameA && nameB && nameA.trim() === nameB.trim()) return true;

  return false;
};

export default function CopyClassDataModal({
  isOpen,
  onClose,
  sourceCell,
  schedules = [],
  localEdits = {},
  onBulkSave,
  onLocalEditsCleared,
  daysList = DEFAULT_DAYS_ORDER,
}) {
  const toast = useToast();
  const [copyMode, setCopyMode] = useState("single_lesson"); // 'single_lesson' | 'full_week'
  const [selectedSlotIds, setSelectedSlotIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // Helper to extract the freshest cell values (considering unsaved active local edits)
  const getCellValue = (cell, field) => {
    if (!cell || !cell._id) return "";
    if (localEdits[cell._id] && localEdits[cell._id][field] !== undefined) {
      return localEdits[cell._id][field];
    }
    return cell[field] || "";
  };

  const category = useMemo(() => {
    return sourceCell ? getClassCategory(sourceCell.className) : "";
  }, [sourceCell]);

  const subjectName = useMemo(() => {
    if (!sourceCell?.subject) return "المادة";
    return typeof sourceCell.subject === "object"
      ? sourceCell.subject.name || "المادة"
      : String(sourceCell.subject);
  }, [sourceCell]);

  // Sort schedule slots chronologically
  const sortScheduleSlots = (slots) =>
    [...slots].sort((a, b) => {
      const dayDiff = daysList.indexOf(a.day) - daysList.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return Number(a.period || 0) - Number(b.period || 0);
    });

  // Source class slots across the entire week
  const sourceClassSlots = useMemo(() => {
    if (!sourceCell || !sourceCell.className) return [];
    return sortScheduleSlots(
      schedules.filter(
        (item) =>
          (item.className || "").trim() === sourceCell.className.trim() &&
          isSameSubject(item, sourceCell),
      ),
    );
  }, [sourceCell, schedules]);

  // Find index of sourceCell in source class weekly schedule (0 = 1st lesson of week, 1 = 2nd lesson, etc.)
  const sourceLessonIndex = useMemo(() => {
    if (!sourceCell || sourceClassSlots.length === 0) return 0;
    const idx = sourceClassSlots.findIndex((s) => s._id === sourceCell._id);
    return idx >= 0 ? idx : 0;
  }, [sourceCell, sourceClassSlots]);

  // Find ALL peer slots belonging to the same category and subject
  const peerSlotsGrouped = useMemo(() => {
    if (!sourceCell || !category) return [];

    // Filter schedules for the same category and subject
    const matchingSchedules = schedules.filter(
      (item) =>
        getClassCategory(item.className) === category &&
        isSameSubject(item, sourceCell),
    );

    // Group by className
    const byClass = {};
    matchingSchedules.forEach((item) => {
      const cName = (item.className || "").trim();
      if (!cName) return;
      if (!byClass[cName]) byClass[cName] = [];
      byClass[cName].push(item);
    });

    const groups = [];
    Object.keys(byClass)
      .sort()
      .forEach((cName) => {
        const sortedSlots = sortScheduleSlots(byClass[cName]);
        const slotsWithOrder = sortedSlots.map((slot, index) => ({
          ...slot,
          orderIndex: index,
          isSourceCell: slot._id === sourceCell._id,
          isSourceClass: cName === (sourceCell.className || "").trim(),
          isCorrespondingLesson: index === sourceLessonIndex,
        }));
        groups.push({
          className: cName,
          isSourceClass: cName === (sourceCell.className || "").trim(),
          slots: slotsWithOrder,
        });
      });

    return groups;
  }, [sourceCell, category, schedules, sourceLessonIndex]);

  // Flat list of all target peer slots (excluding sourceCell itself)
  const allTargetSlots = useMemo(() => {
    return peerSlotsGrouped
      .flatMap((group) => group.slots)
      .filter((slot) => slot._id !== sourceCell?._id);
  }, [peerSlotsGrouped, sourceCell]);

  // Auto-initialize selected target slots whenever sourceCell or modal opens
  useEffect(() => {
    if (!isOpen || !sourceCell) return;

    if (copyMode === "single_lesson") {
      // By default in single_lesson mode:
      // Select corresponding lesson index across peer classes (e.g. lesson 1 in peer classes)
      // and peer slots in peer classes
      const defaultIds = new Set();
      allTargetSlots.forEach((slot) => {
        // If it's a peer class: select corresponding slot index if available, or first slot
        if (!slot.isSourceClass) {
          if (slot.isCorrespondingLesson) {
            defaultIds.add(slot._id);
          }
        }
      });

      // If no corresponding slot found (e.g. peer class only has 1 period on another day), select all peer classes slots
      if (defaultIds.size === 0) {
        allTargetSlots.forEach((slot) => {
          if (!slot.isSourceClass) defaultIds.add(slot._id);
        });
      }

      setSelectedSlotIds(defaultIds);
    } else {
      // In full_week mode: select all slots of all other classes in the category
      const defaultIds = new Set();
      allTargetSlots.forEach((slot) => {
        if (!slot.isSourceClass) {
          defaultIds.add(slot._id);
        }
      });
      setSelectedSlotIds(defaultIds);
    }
  }, [isOpen, sourceCell, copyMode, allTargetSlots]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !sourceCell) return null;

  const sourceData = {
    lessonTitle: getCellValue(sourceCell, "lessonTitle"),
    homework: getCellValue(sourceCell, "homework"),
    activities: getCellValue(sourceCell, "activities"),
    notes: getCellValue(sourceCell, "notes"),
  };

  const handleToggleSlot = (slotId) => {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedSlotIds(new Set(allTargetSlots.map((s) => s._id)));
  };

  const handleSelectCorrespondingOnly = () => {
    const next = new Set();
    allTargetSlots.forEach((slot) => {
      if (!slot.isSourceClass && slot.isCorrespondingLesson) {
        next.add(slot._id);
      }
    });
    setSelectedSlotIds(next);
  };

  const handleClearSelection = () => {
    setSelectedSlotIds(new Set());
  };

  // Perform the copy operation
  const handleConfirmCopy = async () => {
    if (selectedSlotIds.size === 0) {
      toast.info("يرجى اختيار حصة واحدة على الأقل لنسخ البيانات إليها");
      return;
    }

    setSaving(true);
    try {
      let updates = [];

      if (copyMode === "single_lesson") {
        // Copy sourceCell's current data to all selected slots
        updates = Array.from(selectedSlotIds).map((id) => ({
          id,
          lessonTitle: sourceData.lessonTitle,
          homework: sourceData.homework,
          activities: sourceData.activities,
          notes: sourceData.notes,
        }));
      } else {
        // Full weekly sequence mapping:
        // For each class group, map sourceClassSlots[index] to targetSlot[index]
        const sourceSlots = sourceClassSlots;
        updates = allTargetSlots
          .filter((slot) => selectedSlotIds.has(slot._id))
          .map((slot) => {
            // Find corresponding source slot by orderIndex, or fallback to the closest / last available
            const sourceIndex = Math.min(slot.orderIndex, Math.max(0, sourceSlots.length - 1));
            const source = sourceSlots[sourceIndex] || sourceCell;

            return {
              id: slot._id,
              lessonTitle: getCellValue(source, "lessonTitle"),
              homework: getCellValue(source, "homework"),
              activities: getCellValue(source, "activities"),
              notes: getCellValue(source, "notes"),
            };
          });
      }

      // If sourceCell had unsaved local edits, include it too so it gets persisted at the same time
      if (localEdits[sourceCell._id]) {
        updates.push({
          id: sourceCell._id,
          lessonTitle: sourceData.lessonTitle,
          homework: sourceData.homework,
          activities: sourceData.activities,
          notes: sourceData.notes,
        });
      }

      if (onBulkSave) {
        await onBulkSave(updates);
      } else {
        await schedulesService.bulkUpdateLessons(updates);
      }

      if (onLocalEditsCleared) {
        const updatedIds = updates.map((u) => u.id);
        onLocalEditsCleared(updatedIds);
      }

      toast.success(
        `تم نسخ بيانات التحضير بنجاح إلى ${selectedSlotIds.size} حصة في فئة (${category}) 🎉`,
      );
      onClose();
    } catch (err) {
      console.error("Copy class data error:", err);
      toast.error(
        err.response?.data?.message || "فشل نسخ البيانات للفصول، يرجى المحاولة لاحقاً",
      );
    } finally {
      setSaving(false);
    }
  };

  const sourceClassBadge = getClassBadgeStyle(sourceCell.className);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-right"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-l from-indigo-900 via-blue-900 to-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-indigo-300 ring-1 ring-white/20">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <h2 id="copy-modal-title" className="text-base font-black sm:text-lg">
                نسخ تحضير الفصل لفصول فئة ({category || "المرحلة"})
              </h2>
              <p className="text-xs text-indigo-200 font-medium">
                مادة: <strong className="text-white">{subjectName}</strong> • تخصيص ونقل بيانات الدرس بضغطة واحدة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-800">
          {/* Source Slot Card Preview */}
          <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-900">
                <span>📍</span>
                <span>الحصة المصدر (التي سيتم النسخ منها):</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${sourceClassBadge.badge}`}>
                  {sourceCell.className}
                </span>
                <span className="rounded-lg bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                  {sourceCell.day} • الحصة {sourceCell.period}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-white p-2.5 border border-indigo-100/80 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">📖 عنوان وموضوع الدرس:</span>
                <p className="font-black text-slate-900 truncate" title={sourceData.lessonTitle}>
                  {sourceData.lessonTitle || <span className="text-red-500 italic">⚠ لم يتم كتابة عنوان الدرس بعد</span>}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-indigo-100/80 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">📝 الواجب والأنشطة:</span>
                <p className="font-semibold text-slate-700 truncate" title={sourceData.homework || sourceData.activities}>
                  {sourceData.homework ? `الواجب: ${sourceData.homework}` : sourceData.activities ? `الأنشطة: ${sourceData.activities}` : <span className="text-slate-400 italic">فارغ</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Copy Mode Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>⚙️</span>
              <span>طريقة النسخ:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCopyMode("single_lesson")}
                className={`flex flex-col items-start p-3 rounded-2xl border-2 text-right transition ${
                  copyMode === "single_lesson"
                    ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${copyMode === "single_lesson" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-400"}`}>
                    {copyMode === "single_lesson" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span>نسخ هذا الدرس فقط (الموصى به)</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">
                  نسخ محتوى هذه الحصة المحددة فقط إلى الحصص المختارة أدناه من فصول فئة {category}.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCopyMode("full_week")}
                className={`flex flex-col items-start p-3 rounded-2xl border-2 text-right transition ${
                  copyMode === "full_week"
                    ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${copyMode === "full_week" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-400"}`}>
                    {copyMode === "full_week" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span>نسخ الخطة الأسبوعية الكاملة للفصل</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">
                  نسخ تسلسل جميع حصص {sourceCell.className} (حصة 1 ← حصة 1، حصة 2 ← حصة 2...) إلى باقي فصول الفئة.
                </p>
              </button>
            </div>
          </div>

          {/* Target Slots Selection List */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>🎯</span>
                <span>الحصص المستهدفة في فصول فئة ({category}) ({selectedSlotIds.size} محددة):</span>
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                {copyMode === "single_lesson" && (
                  <button
                    type="button"
                    onClick={handleSelectCorrespondingOnly}
                    className="text-blue-700 hover:text-blue-900 hover:underline px-1.5 py-0.5 rounded-md bg-blue-50"
                  >
                    الحصص المناظرة فقط
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-slate-700 hover:text-slate-900 hover:underline px-1.5 py-0.5 rounded-md bg-slate-100"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-red-700 hover:text-red-900 hover:underline px-1.5 py-0.5 rounded-md bg-red-50"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {peerSlotsGrouped.length === 0 || allTargetSlots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-center text-xs font-bold text-amber-900">
                ⚠️ لا توجد فصول أخرى مسندة لك في الجدول من فئة ({category}) لمادة {subjectName}.
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {peerSlotsGrouped.map((group) => {
                  const classBadge = getClassBadgeStyle(group.className);
                  return (
                    <div key={group.className} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${classBadge.badge}`}>
                            {group.className}
                          </span>
                          {group.isSourceClass && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              (الفصل المصدر)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">
                          {group.slots.length} حصة في الأسبوع
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.slots.map((slot) => {
                          const isSelected = selectedSlotIds.has(slot._id);
                          const isSource = slot.isSourceCell;
                          const currentTitle = getCellValue(slot, "lessonTitle");

                          if (isSource) {
                            return (
                              <div
                                key={slot._id}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-200 bg-indigo-100/60 text-xs text-indigo-900 opacity-80"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold">{slot.day} - الحصة {slot.period}</span>
                                  <span className="text-[10px] font-semibold bg-white/70 px-1.5 py-0.5 rounded-md">
                                    حصة {slot.orderIndex + 1}
                                  </span>
                                </div>
                                <span className="text-[10px] font-black text-indigo-800">الحصة الحالية 📍</span>
                              </div>
                            );
                          }

                          return (
                            <label
                              key={slot._id}
                              className={`flex items-start justify-between p-2.5 rounded-xl border cursor-pointer transition select-none ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50/90 shadow-xs"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSlot(slot._id)}
                                  className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900">{slot.day} - الحصة {slot.period}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700">
                                      حصة {slot.orderIndex + 1} بالأسبوع
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate max-w-[180px]">
                                    {currentTitle ? `الحالي: ${currentTitle}` : <span className="text-slate-400 italic">بدون عنوان حالياً</span>}
                                  </p>
                                </div>
                              </div>

                              {slot.isCorrespondingLesson && copyMode === "single_lesson" && (
                                <span className="text-[9px] font-black text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded-md shrink-0">
                                  مناظرة ✨
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirmCopy}
            disabled={saving || selectedSlotIds.size === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="h-4 w-4" />
            <span>
              {saving
                ? "جارٍ النسخ والحفظ..."
                : `تأكيد ونسخ البيانات (${selectedSlotIds.size} حصة) ⧉`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
