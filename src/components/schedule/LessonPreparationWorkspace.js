"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService } from "@/services/schedules.service";
import { getLogoUrl, getClassBadgeStyle } from "@/lib/utils";
import SingleLessonPlanModal from "@/components/schedule/SingleLessonPlanModal";

export default function LessonPreparationWorkspace({
  week,
  weeks = [],
  onSelectWeek,
  schedules = [],
  settings,
  subjects = [],
  onRefresh,
}) {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [searchTerm, setSearchTerm] = useState("");

  // Local state for inline editable cell values: { [scheduleId]: { lessonTitle, warmUp, vocabulary, teachingAids, objectives, homework, activities, notes } }
  const [localEdits, setLocalEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);
  const [savedRowSuccess, setSavedRowSuccess] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Single Lesson Plan Modal state
  const [activePlanModalSchedule, setActivePlanModalSchedule] = useState(null);

  const printContainerId = "lesson-preparation-print-workspace";

  const daysList = settings?.workDays || [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
  ];
  const periodsCount = settings?.periodsCount || 6;
  const periodsList = Array.from({ length: periodsCount }, (_, i) => i + 1);

  // Calculate formatted date for day
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

    const startDayIndex = start.getDay();
    const targetDayIndex = dayNames.indexOf(dayName);
    if (targetDayIndex === -1) return "";

    let diff = targetDayIndex - startDayIndex;
    if (diff < 0) diff += 7;

    const targetDate = new Date(start);
    targetDate.setDate(start.getDate() + diff);

    return targetDate.toLocaleDateString("ar-SA", {
      month: "numeric",
      day: "numeric",
    });
  };

  // Distinct classes summary dynamically derived from active teacher schedules
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
          withObjectives: 0,
        };
      }
      classMap[cName].count += 1;
      if (s.lessonTitle && s.lessonTitle.trim())
        classMap[cName].withLesson += 1;
      if (s.objectives && s.objectives.trim())
        classMap[cName].withObjectives += 1;
    });
    return Object.values(classMap);
  }, [schedules]);

  // Filter schedules based on Class, Day, and Search Term
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedClass && (s.className || "").trim() !== selectedClass.trim()) {
        return false;
      }
      if (selectedDay && s.day !== selectedDay) {
        return false;
      }
      if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const title = (s.lessonTitle || "").toLowerCase();
        const obj = (s.objectives || "").toLowerCase();
        const cName = (s.className || "").toLowerCase();
        const sName = (typeof s.subject === "object" ? s.subject?.name : s.subject || "").toLowerCase();
        return title.includes(q) || obj.includes(q) || cName.includes(q) || sName.includes(q);
      }
      return true;
    });
  }, [schedules, selectedClass, selectedDay, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = schedules.length;
    const withLesson = schedules.filter((s) => s.lessonTitle?.trim()).length;
    const withObjectives = schedules.filter((s) => s.objectives?.trim()).length;
    const withWarmUp = schedules.filter((s) => s.warmUp?.trim()).length;
    const withHomework = schedules.filter((s) => s.homework?.trim()).length;
    const fullyPrepared = schedules.filter(
      (s) => s.lessonTitle?.trim() && s.objectives?.trim() && (s.activities?.trim() || s.homework?.trim())
    ).length;

    const percentage = total > 0 ? Math.round((withLesson / total) * 100) : 0;

    return {
      total,
      withLesson,
      withObjectives,
      withWarmUp,
      withHomework,
      fullyPrepared,
      unplanned: Math.max(0, total - withLesson),
      percentage,
    };
  }, [schedules]);

  // Get effective field value (local edit if exists, else original schedule value)
  const getFieldValue = (schedule, field) => {
    if (!schedule) return "";
    if (
      localEdits[schedule._id] &&
      localEdits[schedule._id][field] !== undefined
    ) {
      return localEdits[schedule._id][field];
    }
    return schedule[field] || "";
  };

  // Handle local change in a field
  const handleFieldChange = (scheduleId, field, value) => {
    setLocalEdits((prev) => ({
      ...prev,
      [scheduleId]: {
        ...(prev[scheduleId] || {}),
        [field]: value,
      },
    }));
  };

  // Save a single schedule's preparation
  const handleSaveSingleSchedule = async (schedule) => {
    if (!schedule || !schedule._id) return;
    const edits = localEdits[schedule._id];
    if (!edits || Object.keys(edits).length === 0) {
      toast.info("لم تقم بتغيير أي بيانات للحفظ");
      return;
    }

    setSavingRowId(schedule._id);
    try {
      await schedulesService.update(schedule._id, edits);

      setLocalEdits((prev) => {
        const next = { ...prev };
        delete next[schedule._id];
        return next;
      });

      setSavedRowSuccess((prev) => ({ ...prev, [schedule._id]: true }));
      setTimeout(() => {
        setSavedRowSuccess((prev) => ({ ...prev, [schedule._id]: false }));
      }, 3000);

      toast.success("تم حفظ تحضير الحصة بنجاح ✅");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Save schedule preparation error:", err);
      toast.error(err.response?.data?.message || "فشل حفظ تحضير الحصة");
    } finally {
      setSavingRowId(null);
    }
  };

  // Bulk Save all modified preparations
  const handleBulkSave = async () => {
    const editKeys = Object.keys(localEdits);
    if (editKeys.length === 0) {
      toast.info("لا توجد تعديلات معلقة للحفظ");
      return;
    }

    const updates = editKeys.map((id) => ({
      id,
      ...localEdits[id],
    }));

    setBulkSaving(true);
    try {
      await schedulesService.bulkUpdateLessons(updates);
      setLocalEdits({});
      toast.success(`تم حفظ جميع التحضيرات (${updates.length} حصة) بنجاح 🎉`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Bulk save error:", err);
      toast.error(err.response?.data?.message || "فشل الحفظ الجماعي للتحضيرات");
    } finally {
      setBulkSaving(false);
    }
  };

  // Duplicate preparation to all other periods of the same class or subject
  const handleDuplicateToClass = (sourceSchedule) => {
    if (!sourceSchedule || !sourceSchedule.className) {
      toast.error("لا يوجد فصل محدد لنسخ التحضير إليه");
      return;
    }

    const currentValues = {
      lessonTitle: getFieldValue(sourceSchedule, "lessonTitle"),
      warmUp: getFieldValue(sourceSchedule, "warmUp"),
      vocabulary: getFieldValue(sourceSchedule, "vocabulary"),
      teachingAids: getFieldValue(sourceSchedule, "teachingAids"),
      objectives: getFieldValue(sourceSchedule, "objectives"),
      activities: getFieldValue(sourceSchedule, "activities"),
      homework: getFieldValue(sourceSchedule, "homework"),
      notes: getFieldValue(sourceSchedule, "notes"),
    };

    if (!currentValues.lessonTitle) {
      toast.error("يرجى إدخال عنوان الدرس أولاً قبل النسخ");
      return;
    }

    let copiedCount = 0;
    const newEdits = { ...localEdits };

    schedules.forEach((item) => {
      if (
        item._id !== sourceSchedule._id &&
        item.className === sourceSchedule.className
      ) {
        newEdits[item._id] = {
          ...(newEdits[item._id] || {}),
          ...currentValues,
        };
        copiedCount++;
      }
    });

    if (copiedCount === 0) {
      toast.info(`لا توجد حصص أخرى مسجلة لفصل (${sourceSchedule.className})`);
      return;
    }

    setLocalEdits(newEdits);
    toast.success(
      `تم نسخ التحضير لـ (${copiedCount}) حصص في فصل ${sourceSchedule.className} ⚡ (اضغط حفظ الكل لاعتمادها)`
    );
  };

  // Print preparation workspace
  const handlePrint = () => {
    const element = document.getElementById(printContainerId);
    if (!element) return;

    const styleSheets = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join("\n");
        } catch {
          return sheet.href ? `@import url('${sheet.href}');` : "";
        }
      })
      .join("\n");

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>دفتر تحضير الدروس — ${week?.label || "الأسبوع الدراسي"}</title>
        <style>
          ${styleSheets}
          @page { size: A4 landscape; margin: 8mm; }
          * { box-sizing: border-box; }
          body { background: #fff; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; }
          button, .no-print, .no-export { display: none !important; }
        </style>
      </head>
      <body>
        <div id="print-root">${element.outerHTML}</div>
        <script>
          window.onload = function () {
            window.print();
            window.onafterprint = function () { window.close(); };
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export full PDF (Continuous full-width)
  const handleExportPDF = async (mode = "fit") => {
    const element = document.getElementById(printContainerId);
    if (!element) return;

    setExporting(true);
    try {
      const imgData = await toJpeg(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2.2,
        quality: 0.96,
        style: {
          fontFamily: "'Tajawal', 'Cairo', sans-serif",
          minWidth: "1100px",
          width: "1100px",
        },
        filter: (node) => !node.classList?.contains("no-export") && !node.classList?.contains("no-print"),
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      if (mode === "fit") {
        const pdfWidthMm = 297; // Landscape A4 width
        const pdfHeightMm = (img.height / img.width) * pdfWidthMm;

        const pdf = new jsPDF({
          orientation: pdfHeightMm > pdfWidthMm ? "portrait" : "landscape",
          unit: "mm",
          format: [pdfWidthMm, pdfHeightMm],
        });

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");
        pdf.save(`دفتر_تحضير_${week?.label || "الأسبوع"}_${Date.now()}.pdf`);
        toast.success("تم تصدير دفتر التحضير كملف PDF عالي الدقة بنجاح 📄✨");
      } else {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 6;
        const printWidth = pdfWidth - margin * 2;
        const printHeight = pdfHeight - margin * 2;
        const pxPerMm = img.width / printWidth;
        const pageSlicePxHeight = printHeight * pxPerMm;

        const sliceCanvas = document.createElement("canvas");
        const sliceCtx = sliceCanvas.getContext("2d");

        let currentYPx = 0;
        let pageIndex = 0;

        while (currentYPx < img.height) {
          if (pageIndex > 0) pdf.addPage("a4", "landscape");
          const remainingPxHeight = img.height - currentYPx;
          const currentSlicePxHeight = Math.min(pageSlicePxHeight, remainingPxHeight);

          sliceCanvas.width = img.width;
          sliceCanvas.height = currentSlicePxHeight;
          sliceCtx.fillStyle = "#ffffff";
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sliceCtx.drawImage(img, 0, currentYPx, img.width, currentSlicePxHeight, 0, 0, img.width, currentSlicePxHeight);

          const sliceDataUrl = sliceCanvas.toDataURL("image/jpeg", 0.95);
          const sliceMmHeight = currentSlicePxHeight / pxPerMm;
          pdf.addImage(sliceDataUrl, "JPEG", margin, margin, printWidth, sliceMmHeight);

          currentYPx += pageSlicePxHeight;
          pageIndex++;
        }

        pdf.save(`دفتر_تحضير_مقسم_A4_${week?.label || "الأسبوع"}_${Date.now()}.pdf`);
        toast.success("تم تصدير دفتر التحضير كملف PDF مقسم لصفحات A4 بنجاح 📑");
      }
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("حدث خطأ أثناء تصدير ملف PDF");
    } finally {
      setExporting(false);
    }
  };

  // Export PNG
  const handleExportPNG = async () => {
    const element = document.getElementById(printContainerId);
    if (!element) return;

    setExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2.5,
        style: {
          fontFamily: "'Tajawal', 'Cairo', sans-serif",
          minWidth: "1100px",
          width: "1100px",
        },
        filter: (node) => !node.classList?.contains("no-export") && !node.classList?.contains("no-print"),
      });

      const link = document.createElement("a");
      link.download = `دفتر_تحضير_${week?.label || "الأسبوع"}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("تم تصدير دفتر التحضير كصورة PNG عالية الدقة بنجاح 🖼️");
    } catch (err) {
      console.error("PNG export error:", err);
      toast.error("حدث خطأ أثناء تصدير الصورة");
    } finally {
      setExporting(false);
    }
  };

  const unsavedCount = Object.keys(localEdits).length;

  return (
    <div className="space-y-6">
      {/* 1) Top Sticky Action Bar & Stats */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-blue-50 text-blue-700 text-xl font-bold">
                📝
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  دفتر تحضير الدروس والخطط الأسبوعية
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  إعداد وتنظيم وتوثيق تحضير الحصص اليومية لكل فصل مع الطباعة والتصدير المعتمد
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {unsavedCount > 0 && (
              <button
                type="button"
                onClick={handleBulkSave}
                disabled={bulkSaving}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer animate-pulse"
              >
                <span>💾</span>
                <span>
                  {bulkSaving ? "جاري الحفظ..." : `حفظ التعديلات (${unsavedCount})`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleExportPDF("fit")}
              disabled={exporting}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="تصدير دفتر التحضير كاملاً PDF"
            >
              <span>📄</span>
              <span>{exporting ? "جاري..." : "تصدير PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPNG}
              disabled={exporting}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="تصدير كصورة عريضة"
            >
              <span>🖼️</span>
              <span>تصدير PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              title="طباعة دفتر التحضير الرسمي"
            >
              <span>🖨️</span>
              <span>طباعة الدفتر</span>
            </button>
          </div>
        </div>

        {/* Progress & Quick Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-slate-500 font-bold block">إجمالي الحصص</span>
            <span className="text-lg font-black text-slate-900">{stats.total} حصة</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-blue-700 font-bold block">مكتملة العنوان والدرس</span>
            <span className="text-lg font-black text-blue-950">
              {stats.withLesson} / {stats.total}
            </span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-emerald-700 font-bold block">مكتملة الأهداف ونواتج التعلم</span>
            <span className="text-lg font-black text-emerald-950">{stats.withObjectives}</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-amber-700 font-bold block">حصص قيد التحضير</span>
            <span className="text-lg font-black text-amber-950">{stats.unplanned}</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-gradient-to-l from-slate-900 to-indigo-950 text-white rounded-2xl p-3 flex flex-col justify-center items-center">
            <div className="flex items-center justify-between w-full text-xs font-bold mb-1">
              <span>نسبة إنجاز التحضير</span>
              <span className="text-amber-300 font-black">{stats.percentage}%</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2) Filters & View Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4 no-print">
        {/* Class Filter Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>🏫</span>
              <span>تصفية حسب الفصل الدراسي:</span>
            </span>
            {selectedClass && (
              <button
                type="button"
                onClick={() => setSelectedClass("")}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
              >
                إلغاء التصفية (عرض جميع الفصول)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedClass("")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex-shrink-0 ${
                !selectedClass
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              جميع الفصول ({schedules.length})
            </button>

            {classesSummary.map((cls) => {
              const isSelected = selectedClass === cls.name;
              const style = getClassBadgeStyle(cls.name);

              return (
                <button
                  key={cls.name}
                  type="button"
                  onClick={() => setSelectedClass(cls.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 border ${
                    isSelected
                      ? `${style.solid} shadow-sm scale-105`
                      : `${style.bg} ${style.text} ${style.border} hover:shadow-xs`
                  }`}
                >
                  <span>فصل: {cls.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-white border border-slate-200 text-slate-700"
                    }`}
                  >
                    {cls.withLesson}/{cls.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Filters & View Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Day Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-slate-500 ml-1 shrink-0">اليوم:</span>
            <button
              type="button"
              onClick={() => setSelectedDay("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                !selectedDay ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              الكل
            </button>
            {daysList.map((day) => {
              const isDaySelected = selectedDay === day;
              const dayDate = getDayDateFormatted(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    isDaySelected ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{day}</span>
                  {dayDate && <span className="text-[10px] opacity-75 font-medium">({dayDate})</span>}
                </button>
              );
            })}
          </div>

          {/* View Mode & Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="relative flex-1 sm:w-48">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في الدروس..."
                className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🗂️ بطاقات التحضير
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📊 دفتر التحضير
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3) Main Printable & Interactive Workspace Container */}
      <div
        id={printContainerId}
        className="bg-white rounded-3xl border border-slate-300 shadow-sm p-4 sm:p-7 space-y-6"
        style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
      >
        {/* Printable Official Header */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center md:text-right">
            <div className="text-xs text-slate-700 space-y-1 font-medium leading-relaxed">
              <p className="font-bold text-slate-900 text-sm">المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>{settings?.ministryHeader || "الإدارة العامة للتعليم"}</p>
              <p className="font-bold text-slate-800">{settings?.schoolName || "مدرسة المستقبل"}</p>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                سجل ودفتر تحضير الدروس الأسبوعي
              </h2>
              <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs sm:text-sm font-bold px-4 py-1 rounded-full shadow-xs">
                <span>المعلم: {user?.name || "معلم المادة"}</span>
                <span>•</span>
                <span>{week?.label || "الأسبوع الدراسي"}</span>
                {selectedClass && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300">فصل: {selectedClass}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {settings?.academicYear || "1447-1448هـ"} — {settings?.term || "الفصل الدراسي الأول"}
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end justify-center gap-1.5">
              {settings?.logo ? (
                <img
                  src={getLogoUrl(settings.logo)}
                  alt="شعار المدرسة"
                  className="h-14 w-auto object-contain"
                />
              ) : (
                <div className="text-3xl">🏫</div>
              )}
              <div className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                إجمالي حصص الأسبوع: {filteredSchedules.length}
              </div>
            </div>
          </div>
        </div>

        {/* Zero Results State */}
        {filteredSchedules.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-300 space-y-3">
            <span className="text-4xl block">🔍</span>
            <h3 className="text-base font-bold text-slate-800">لا توجد حصص مطابقة لمعايير البحث والتصفية</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              تأكد من اختيار الأسبوع الصحيح، أو قم بإلغاء التصفية لعرض جميع حصص الأسبوع المسندة لك في الجدول.
            </p>
            {(selectedClass || selectedDay || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClass("");
                  setSelectedDay("");
                  setSearchTerm("");
                }}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-blue-700 cursor-pointer"
              >
                إعادة ضبط جميع الفلاتر
              </button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          /* ========================================================================= */
          /* CARDS VIEW: Rich Interactive Preparation Cards                             */
          /* ========================================================================= */
          <div className="space-y-6">
            {filteredSchedules.map((schedule, idx) => {
              const isDirty = Boolean(localEdits[schedule._id]);
              const isSaved = Boolean(savedRowSuccess[schedule._id]);
              const isSaving = savingRowId === schedule._id;
              const classStyle = getClassBadgeStyle(schedule.className);
              const dayDateFormatted = getDayDateFormatted(schedule.day);
              const hasFullPrep = Boolean(
                getFieldValue(schedule, "lessonTitle") &&
                getFieldValue(schedule, "objectives") &&
                (getFieldValue(schedule, "activities") || getFieldValue(schedule, "homework"))
              );

              return (
                <div
                  key={schedule._id || idx}
                  className={`rounded-3xl border transition-all overflow-hidden ${
                    isDirty
                      ? "bg-amber-50/40 border-amber-300 ring-2 ring-amber-300/60 shadow-md"
                      : isSaved
                      ? "bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-300/60 shadow-md"
                      : "bg-white border-slate-300 shadow-xs hover:shadow-md"
                  }`}
                >
                  {/* Card Top Header */}
                  <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Day & Period Badge */}
                      <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1 rounded-xl text-xs font-black">
                        <span>📅 {schedule.day}</span>
                        {dayDateFormatted && <span className="text-blue-200">({dayDateFormatted})</span>}
                        <span className="text-blue-300">•</span>
                        <span className="text-amber-300">الحصة {schedule.period}</span>
                      </div>

                      {/* Class Badge */}
                      {schedule.className && (
                        <span className={`text-xs font-black px-3 py-1 rounded-xl shadow-xs border ${classStyle.badge}`}>
                          فصل: {schedule.className}
                        </span>
                      )}

                      {/* Subject */}
                      <span className="text-xs font-bold text-white bg-blue-600/80 px-2.5 py-1 rounded-xl">
                        {typeof schedule.subject === "object" ? schedule.subject?.name : schedule.subject || "المادة"}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                          hasFullPrep
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                            : getFieldValue(schedule, "lessonTitle")
                            ? "bg-blue-500/20 text-blue-300 border border-blue-400/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                        }`}
                      >
                        {hasFullPrep ? "✅ مكتمل التحضير" : getFieldValue(schedule, "lessonTitle") ? "📖 قيد الاستكمال" : "⭕ لم يُحضر"}
                      </span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-1.5 no-print">
                      {/* Duplicate to other classes */}
                      {schedule.className && (
                        <button
                          type="button"
                          onClick={() => handleDuplicateToClass(schedule)}
                          className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                          title="نسخ نفس خطة الدرس لباقي حصص هذا الفصل"
                        >
                          <span>⚡</span>
                          <span className="hidden sm:inline">نسخ لباقي الفصول</span>
                        </button>
                      )}

                      {/* View Single Plan Modal */}
                      <button
                        type="button"
                        onClick={() => setActivePlanModalSchedule(schedule)}
                        className="inline-flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        title="معاينة وطباعة بطاقة الدرس المنفردة"
                      >
                        <span>🔍</span>
                        <span className="hidden sm:inline">بطاقة الحصة</span>
                      </button>

                      {/* Single Save Button */}
                      <button
                        type="button"
                        onClick={() => handleSaveSingleSchedule(schedule)}
                        disabled={isSaving || !isDirty}
                        className={`inline-flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          isDirty
                            ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-sm animate-bounce"
                            : "bg-slate-800 text-slate-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <span>💾</span>
                        <span>{isSaving ? "حفظ..." : isSaved ? "✓ تم" : "حفظ"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Preparation Fields */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Row 1: Lesson Title (Main Topic) */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span className="text-blue-600">📖</span>
                        <span>عنوان الدرس والموضوع:</span>
                      </label>
                      <input
                        type="text"
                        value={getFieldValue(schedule, "lessonTitle")}
                        onChange={(e) => handleFieldChange(schedule._id, "lessonTitle", e.target.value)}
                        placeholder="اكتب عنوان وموضوع الدرس الرئيسي..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                      />
                    </div>

                    {/* Row 2: Objectives (أهداف الدرس ونواتج التعلم) */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span className="text-emerald-600">🎯</span>
                        <span>أهداف الدرس ونواتج التعلم المستهدفة:</span>
                      </label>
                      <textarea
                        rows={2}
                        value={getFieldValue(schedule, "objectives")}
                        onChange={(e) => handleFieldChange(schedule._id, "objectives", e.target.value)}
                        placeholder="1. أن يتعرف الطالب على... 2. أن يستنتج الطالب..."
                        className="w-full px-3.5 py-2 text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all leading-relaxed"
                      />
                    </div>

                    {/* Row 3: Grid 2 Columns: Warm-up (التهيئة) & Vocabulary (المفردات) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-indigo-600">🚀</span>
                          <span>التهيئة للحصة والتمهيد:</span>
                        </label>
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "warmUp")}
                          onChange={(e) => handleFieldChange(schedule._id, "warmUp", e.target.value)}
                          placeholder="طرح سؤال مثير للتفكير، عرض مقطع مرئي، ربط بالدرس السابق..."
                          className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-purple-600">🔤</span>
                          <span>مفردات ومفاهيم الدرس:</span>
                        </label>
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "vocabulary")}
                          onChange={(e) => handleFieldChange(schedule._id, "vocabulary", e.target.value)}
                          placeholder="المصطلحات والمفاهيم الجديدة التي سيتعلمها الطلاب..."
                          className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 4: Grid 2 Columns: Teaching Aids (الوسائل) & Class Activities (الأنشطة) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-teal-600">🛠️</span>
                          <span>الوسائل التعليمية ومصادر التعلم:</span>
                        </label>
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "teachingAids")}
                          onChange={(e) => handleFieldChange(schedule._id, "teachingAids", e.target.value)}
                          placeholder="السبورة الذكية، الكتاب المدرسي، منصة مدرستي، مجسمات، عروض PowerPoint..."
                          className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-amber-600">🧩</span>
                          <span>النشاط الصفي واستراتيجيات التدريس:</span>
                        </label>
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "activities")}
                          onChange={(e) => handleFieldChange(schedule._id, "activities", e.target.value)}
                          placeholder="التعلم التعاوني، حل المشكلات، العصف الذهني، تطبيق نشاط ص 30..."
                          className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 5: Grid 2 Columns: Homework (الواجب) & Teacher Notes (الملاحظات) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <span className="text-blue-600">📝</span>
                          <span>الواجب المنزلي والمهمات الأدائية:</span>
                        </label>
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "homework")}
                          onChange={(e) => handleFieldChange(schedule._id, "homework", e.target.value)}
                          placeholder="حل تمارين ص 35 رقم 1 و 2، مهمة أدائية، تقرير قصير..."
                          className="w-full px-3 py-2 text-xs text-slate-900 bg-blue-50/30 focus:bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-slate-500">💬</span>
                          <span>ملاحظات المعلم والتأمل الذاتي:</span>
                        </label>
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "notes")}
                          onChange={(e) => handleFieldChange(schedule._id, "notes", e.target.value)}
                          placeholder="ملاحظات حول مستوى استيعاب الطلاب أو التعديل للحصة القادمة..."
                          className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400/40 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* TABLE VIEW: Official Ministry-style Preparation Register                  */
          /* ========================================================================= */
          <div className="overflow-x-auto rounded-2xl border border-slate-300">
            <table className="w-full text-right border-collapse min-w-[1050px] text-xs">
              <thead>
                <tr className="bg-slate-950 text-white text-xs">
                  <th className="border border-slate-700 p-2.5 text-center w-28 font-bold">اليوم والتاريخ</th>
                  <th className="border border-slate-700 p-2 text-center w-14 font-bold">الحصة</th>
                  <th className="border border-slate-700 p-2 text-center w-24 font-bold">الفصل</th>
                  <th className="border border-slate-700 p-2.5 w-32 font-bold">المادة</th>
                  <th className="border border-slate-700 p-2.5 font-bold min-w-[160px]">عنوان الدرس</th>
                  <th className="border border-slate-700 p-2.5 font-bold min-w-[180px]">أهداف الدرس ونواتج التعلم</th>
                  <th className="border border-slate-700 p-2.5 font-bold min-w-[140px]">التهيئة والتمهيد</th>
                  <th className="border border-slate-700 p-2.5 font-bold min-w-[130px]">الوسائل التعليمية</th>
                  <th className="border border-slate-700 p-2.5 font-bold min-w-[140px]">الأنشطة والواجبات</th>
                  <th className="border border-slate-700 p-2 text-center w-20 font-bold no-export no-print">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredSchedules.map((schedule, idx) => {
                  const dayDateFormatted = getDayDateFormatted(schedule.day);
                  const isDirty = Boolean(localEdits[schedule._id]);
                  const isSaved = Boolean(savedRowSuccess[schedule._id]);

                  return (
                    <tr
                      key={schedule._id || idx}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isDirty ? "bg-amber-50/50" : isSaved ? "bg-emerald-50/50" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                      }`}
                    >
                      {/* Day & Date */}
                      <td className="border border-slate-300 p-2 text-center font-bold align-middle bg-slate-100/50">
                        <div>{schedule.day}</div>
                        {dayDateFormatted && <div className="text-[10px] text-slate-500 font-semibold">{dayDateFormatted}</div>}
                      </td>

                      {/* Period */}
                      <td className="border border-slate-300 p-2 text-center align-middle">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black inline-flex items-center justify-center text-xs">
                          {schedule.period}
                        </span>
                      </td>

                      {/* Class */}
                      <td className="border border-slate-300 p-2 text-center align-middle">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${getClassBadgeStyle(schedule.className).badge}`}>
                          {schedule.className || "عام"}
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="border border-slate-300 p-2 align-middle font-bold">
                        {typeof schedule.subject === "object" ? schedule.subject?.name : schedule.subject || "—"}
                      </td>

                      {/* Lesson Title */}
                      <td className="border border-slate-300 p-1.5 align-middle">
                        <input
                          type="text"
                          value={getFieldValue(schedule, "lessonTitle")}
                          onChange={(e) => handleFieldChange(schedule._id, "lessonTitle", e.target.value)}
                          placeholder="عنوان الدرس..."
                          className="w-full p-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Objectives */}
                      <td className="border border-slate-300 p-1.5 align-middle">
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "objectives")}
                          onChange={(e) => handleFieldChange(schedule._id, "objectives", e.target.value)}
                          placeholder="أهداف الدرس..."
                          className="w-full p-1.5 text-[11px] text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Warm-up & Vocabulary */}
                      <td className="border border-slate-300 p-1.5 align-middle">
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "warmUp")}
                          onChange={(e) => handleFieldChange(schedule._id, "warmUp", e.target.value)}
                          placeholder="التهيئة للحصة..."
                          className="w-full p-1.5 text-[11px] text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Teaching Aids */}
                      <td className="border border-slate-300 p-1.5 align-middle">
                        <textarea
                          rows={2}
                          value={getFieldValue(schedule, "teachingAids")}
                          onChange={(e) => handleFieldChange(schedule._id, "teachingAids", e.target.value)}
                          placeholder="الوسائل التعليمية..."
                          className="w-full p-1.5 text-[11px] text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </td>

                      {/* Activities & Homework */}
                      <td className="border border-slate-300 p-1.5 align-middle space-y-1">
                        <input
                          type="text"
                          value={getFieldValue(schedule, "activities")}
                          onChange={(e) => handleFieldChange(schedule._id, "activities", e.target.value)}
                          placeholder="النشاط الصفي..."
                          className="w-full p-1 text-[11px] text-slate-800 bg-white border border-slate-200 rounded focus:outline-none"
                        />
                        <input
                          type="text"
                          value={getFieldValue(schedule, "homework")}
                          onChange={(e) => handleFieldChange(schedule._id, "homework", e.target.value)}
                          placeholder="الواجب المنزلي..."
                          className="w-full p-1 text-[11px] text-blue-900 bg-blue-50/50 border border-blue-200 rounded focus:outline-none"
                        />
                      </td>

                      {/* Row Actions */}
                      <td className="border border-slate-300 p-1.5 text-center align-middle no-export no-print">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveSingleSchedule(schedule)}
                            disabled={!isDirty}
                            className={`p-1.5 rounded-lg text-xs font-bold w-full cursor-pointer ${
                              isDirty
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                                : "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
                            }`}
                            title="حفظ تعديلات هذا السطر"
                          >
                            💾 حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => setActivePlanModalSchedule(schedule)}
                            className="p-1 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 w-full cursor-pointer"
                            title="معاينة وطباعة بطاقة الدرس"
                          >
                            🔍 معاينة
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Signatures for Official Register */}
        <div className="border-t-2 border-slate-300 pt-6 grid grid-cols-3 gap-4 text-center text-xs text-slate-700 font-medium">
          <div>
            <p className="text-slate-500 mb-6">معلم المادة</p>
            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
              {user?.name || "أ. ____________"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-6">وكيل الشؤون التعليمية / المشرف</p>
            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
              {settings?.academicAdvisorName || "أ. ____________"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-6">مدير المدرسة</p>
            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
              {settings?.principalName || "أ. ____________"}
            </p>
          </div>
        </div>
      </div>

      {/* Single Lesson Plan Modal */}
      {activePlanModalSchedule && (
        <SingleLessonPlanModal
          isOpen={Boolean(activePlanModalSchedule)}
          onClose={() => setActivePlanModalSchedule(null)}
          schedule={activePlanModalSchedule}
          week={week}
          settings={settings}
        />
      )}
    </div>
  );
}
