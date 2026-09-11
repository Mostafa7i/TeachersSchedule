"use client";

import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import { useToast } from "@/contexts/ToastContext";
import { getLogoUrl } from "@/lib/utils";

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────

const ARABIC_DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const PERIOD_COLORS = [
  {
    bg: "bg-blue-500",
    text: "text-white",
    light: "bg-blue-50",
    border: "border-blue-200",
    dot: "#3b82f6",
  },
  {
    bg: "bg-emerald-500",
    text: "text-white",
    light: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "#10b981",
  },
  {
    bg: "bg-violet-500",
    text: "text-white",
    light: "bg-violet-50",
    border: "border-violet-200",
    dot: "#8b5cf6",
  },
  {
    bg: "bg-amber-500",
    text: "text-white",
    light: "bg-amber-50",
    border: "border-amber-200",
    dot: "#f59e0b",
  },
  {
    bg: "bg-rose-500",
    text: "text-white",
    light: "bg-rose-50",
    border: "border-rose-200",
    dot: "#f43f5e",
  },
  {
    bg: "bg-cyan-500",
    text: "text-white",
    light: "bg-cyan-50",
    border: "border-cyan-200",
    dot: "#06b6d4",
  },
  {
    bg: "bg-indigo-500",
    text: "text-white",
    light: "bg-indigo-50",
    border: "border-indigo-200",
    dot: "#6366f1",
  },
  {
    bg: "bg-teal-500",
    text: "text-white",
    light: "bg-teal-50",
    border: "border-teal-200",
    dot: "#14b8a6",
  },
];

function getDayDate(dayName, weekStartDate) {
  if (!weekStartDate) return "";
  const start = new Date(weekStartDate);
  const startIdx = start.getDay();
  const targetIdx = ARABIC_DAYS.indexOf(dayName);
  if (targetIdx === -1) return "";
  let diff = targetIdx - startIdx;
  if (diff < 0) diff += 7;
  const d = new Date(start);
  d.setDate(start.getDate() + diff);
  return d.toLocaleDateString("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Sub-component: Single class schedule card (the printable/shareable part)
// ───────────────────────────────────────────────────────────────────────────────

function ClassScheduleCard({ className, week, schedules, settings, cardId }) {
  const workDays = settings?.workDays || [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
  ];
  const periodsCount = settings?.periodsCount || 6;
  const periods = Array.from({ length: periodsCount }, (_, i) => i + 1);

  // Build matrix: day → period → schedule entry
  const matrix = {};
  workDays.forEach((day) => {
    matrix[day] = {};
    periods.forEach((p) => {
      matrix[day][p] = null;
    });
  });
  schedules.forEach((s) => {
    if (matrix[s.day] !== undefined) {
      matrix[s.day][s.period] = s;
    }
  });

  const completedCount = schedules.filter((s) => s.lessonTitle?.trim()).length;
  const totalCount = schedules.length;

  return (
    <div
      id={cardId}
      dir="rtl"
      style={{
        fontFamily: "'Tajawal', 'Cairo', 'Noto Sans Arabic', sans-serif",
      }}
      className="bg-white w-full overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-700 text-white px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          {/* Right: school info */}
          <div className="text-right space-y-1">
            <p className="text-blue-200 text-xs font-medium">
              المملكة العربية السعودية • وزارة التعليم
            </p>
            <h1 className="text-xl font-black leading-tight">
              {settings?.schoolName || "مدرسة المستقبل"}
            </h1>
            <p className="text-blue-200 text-xs">
              {settings?.academicYear || "1447-1448هـ"} —{" "}
              {settings?.term || "الفصل الدراسي الأول"}
            </p>
          </div>

          {/* Center: class badge */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
              {settings?.logo ? (
                <img
                  src={getLogoUrl(settings.logo)}
                  alt="شعار"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <span className="text-3xl">🏫</span>
              )}
            </div>
          </div>

          {/* Left: week & class */}
          <div className="text-left space-y-1.5">
            <div className="bg-amber-400 text-slate-900 text-sm font-black px-4 py-1.5 rounded-xl text-center shadow">
              فصل: {className}
            </div>
            <div className="bg-white/15 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-lg text-center">
              {week?.label || "الأسبوع الدراسي"}
            </div>
          </div>
        </div>

        {/* Title bar */}
        <div className="mt-4 text-center">
          <h2 className="text-base font-extrabold tracking-wide text-blue-100">
            📋 الخطة والجدول الدراسي الأسبوعي
          </h2>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="bg-slate-800 text-white px-6 py-2.5 flex items-center justify-between text-xs font-semibold">
        <span>
          📅{" "}
          {week?.startDate
            ? new Date(week.startDate).toLocaleDateString("ar-SA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </span>
        <div className="flex items-center gap-4">
          <span>
            إجمالي الحصص:{" "}
            <strong className="text-amber-300">{totalCount}</strong>
          </span>
          <span>
            مكتملة الخطة:{" "}
            <strong className="text-emerald-400">
              {completedCount}/{totalCount}
            </strong>
          </span>
        </div>
        <span>
          📅{" "}
          {week?.endDate
            ? new Date(week.endDate).toLocaleDateString("ar-SA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>

      {/* ── Schedule grid: one column per day ── */}
      <div className="p-4 space-y-3">
        {workDays.map((day, dayIdx) => {
          const daySchedules = periods.map((p) => matrix[day]?.[p] || null);
          const hasAny = daySchedules.some(Boolean);
          const dayDate = getDayDate(day, week?.startDate);

          return (
            <div
              key={day}
              className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
            >
              {/* Day header */}
              <div
                className={`px-4 py-2.5 flex items-center justify-between ${dayIdx % 2 === 0 ? "bg-slate-800" : "bg-blue-700"} text-white`}
              >
                <div>
                  <span className="font-black text-sm">{day}</span>
                  {dayDate && (
                    <span className="text-xs text-white/70 mr-2">
                      {dayDate}
                    </span>
                  )}
                </div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {daySchedules.filter(Boolean).length} حصة
                </span>
              </div>

              {/* Periods for this day */}
              {!hasAny ? (
                <div className="px-4 py-3 text-center text-slate-400 text-xs italic bg-slate-50">
                  لا توجد حصص مسجلة لهذا اليوم
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {periods.map((period) => {
                    const cell = matrix[day]?.[period];
                    const color =
                      PERIOD_COLORS[(period - 1) % PERIOD_COLORS.length];
                    const hasLesson = cell?.lessonTitle?.trim();
                    const hasHomework = cell?.homework?.trim();

                    return (
                      <div
                        key={period}
                        className={`flex items-stretch gap-0 ${!cell ? "opacity-40" : ""}`}
                      >
                        {/* Period number badge */}
                        <div
                          className={`${color.bg} ${color.text} flex flex-col items-center justify-center px-3 py-2 shrink-0 min-w-[48px]`}
                        >
                          <span className="text-lg font-black leading-none">
                            {period}
                          </span>
                          <span className="text-[9px] opacity-80 font-semibold">
                            حصة
                          </span>
                        </div>

                        {/* Content */}
                        {cell ? (
                          <div className="flex-1 px-3 py-2.5 bg-white">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                                  style={{
                                    backgroundColor:
                                      cell.subject?.color || color.dot,
                                  }}
                                />
                                <span className="font-black text-slate-900 text-sm">
                                  {cell.subject?.name || "مادة غير محددة"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasLesson && hasHomework ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    ✅ مكتمل
                                  </span>
                                ) : hasLesson ? (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                    📖 درس فقط
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                    ⚠️ بدون خطة
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Teacher */}
                            {cell.teacher?.name && (
                              <p className="text-xs text-slate-500 mb-1 font-medium">
                                👨‍🏫 {cell.teacher.name}
                                {cell.room && (
                                  <span className="mr-2 text-slate-400">
                                    📍 {cell.room}
                                  </span>
                                )}
                              </p>
                            )}

                            {/* Lesson title */}
                            {hasLesson && (
                              <p className="text-xs font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 mb-1">
                                <span className="text-slate-400 font-normal">
                                  موضوع الدرس:{" "}
                                </span>
                                {cell.lessonTitle}
                              </p>
                            )}

                            {/* Homework */}
                            {hasHomework && (
                              <p className="text-xs text-blue-900 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 mb-1">
                                <span className="font-bold">📝 واجب: </span>
                                {cell.homework}
                              </p>
                            )}

                            {/* Activities */}
                            {cell.activities?.trim() && (
                              <p className="text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                                <span className="font-bold">🎯 نشاط: </span>
                                {cell.activities}
                              </p>
                            )}

                            {/* Notes */}
                            {cell.notes?.trim() && (
                              <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-100 mt-1">
                                💬 {cell.notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 px-3 py-2 bg-slate-50 flex items-center">
                            <span className="text-slate-400 text-xs italic">
                              لا توجد حصة
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer signatures ── */}
      <div className="mx-4 mb-4 pt-3 border-t-2 border-slate-200 grid grid-cols-3 gap-4 text-center text-xs text-slate-600">
        <div>
          <p className="text-slate-400 mb-5">وكيل المدرسة</p>
          <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
            {settings?.academicAdvisorName || "أ. ___________"}
          </p>
        </div>
        <div>
          <p className="text-slate-400 mb-2">ختم المدرسة</p>
          <div className="w-14 h-14 border-2 border-dashed border-slate-300 rounded-full mx-auto" />
        </div>
        <div>
          <p className="text-slate-400 mb-5">مدير المدرسة</p>
          <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
            {settings?.principalName || "أ. ___________"}
          </p>
        </div>
      </div>

      {/* Watermark / branding strip */}
      <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-700 text-white/60 text-[10px] text-center py-1.5 font-medium">
        تم إنشاؤه بواسطة نظام إدارة الجداول المدرسية
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Main Modal
// ───────────────────────────────────────────────────────────────────────────────

export default function ClassScheduleShareModal({
  isOpen,
  onClose,
  className,
  week,
  schedules = [],
  settings,
  allClasses = [],
  onSwitchClass,
}) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const cardId = "class-schedule-share-card";

  if (!isOpen) return null;

  // Filter schedules for the selected class
  const classSchedules = schedules.filter(
    (s) => (s.className || "").trim() === (className || "").trim(),
  );

  const handleExportPNG = async () => {
    const element = document.getElementById(cardId);
    if (!element) {
      toast.error("لم يتم العثور على البطاقة للتصدير");
      return;
    }

    setExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2.5,
        style: {
          fontFamily: "'Tajawal', 'Cairo', sans-serif",
          minWidth: `${Math.max(element.scrollWidth, 600)}px`,
          width: `${Math.max(element.scrollWidth, 600)}px`,
        },
        skipFonts: true,
        fontEmbedCSS: "",
      });

      const link = document.createElement("a");
      link.download = `جدول_فصل_${className?.replace(/\s+/g, "_")}_${week?.label || "الأسبوع"}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("تم تصدير بطاقة الجدول كصورة PNG عالية الدقة ✅");
    } catch (err) {
      console.error("PNG export error:", err);
      toast.error("حدث خطأ أثناء تصدير الصورة");
    } finally {
      setExporting(false);
    }
  };

  const handleCopyImage = async () => {
    const element = document.getElementById(cardId);
    if (!element) {
      toast.error("لم يتم العثور على البطاقة");
      return;
    }

    setExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2.5,
        skipFonts: true,
        fontEmbedCSS: "",
      });

      // Convert data URL to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast.success(
          "تم نسخ الصورة إلى الحافظة 📋 — يمكنك لصقها في واتساب مباشرة!",
        );
      } else {
        // Fallback: download
        const link = document.createElement("a");
        link.download = `جدول_فصل_${className?.replace(/\s+/g, "_")}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("تم تحميل الصورة — متصفحك لا يدعم النسخ المباشر");
      }
    } catch (err) {
      console.error("Copy image error:", err);
      toast.error("حدث خطأ أثناء نسخ الصورة");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById(cardId);
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

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>جدول فصل ${className} — ${week?.label || ""}</title>
        <style>
          ${styleSheets}
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; }
          body { background: #fff; margin: 0; padding: 0; }
          button, .no-print { display: none !important; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
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

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl">
        {/* ── Modal Top Bar ── */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-3 no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📤</span>
            <div>
              <p className="font-bold text-sm leading-tight">
                مشاركة جدول فصل: {className}
              </p>
              <p className="text-slate-400 text-xs">
                {week?.label || "الأسبوع الدراسي"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Class switcher pills */}
            {allClasses.length > 1 && (
              <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-[240px]">
                {allClasses.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => onSwitchClass && onSwitchClass(cls)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      cls === className
                        ? "bg-amber-400 text-slate-900"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Action Buttons Bar ── */}
        <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2 flex-wrap no-print shrink-0">
          {/* Export PNG */}
          <button
            onClick={handleExportPNG}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-60 cursor-pointer shadow-sm"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {exporting ? "جاري..." : "تنزيل صورة PNG"}
          </button>

          {/* Copy to clipboard */}
          <button
            onClick={handleCopyImage}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-60 cursor-pointer shadow-sm"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            نسخ كصورة للواتساب
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            طباعة
          </button>

          <div className="flex-1" />
          <p className="text-slate-500 text-[11px] font-medium hidden sm:block">
            💡 انقر "نسخ كصورة" ثم الصقها مباشرة في واتساب
          </p>
        </div>

        {/* ── The actual shareable card ── */}
        <div className="overflow-y-auto max-h-[75vh] bg-slate-100">
          <ClassScheduleCard
            cardId={cardId}
            className={className}
            week={week}
            schedules={classSchedules}
            settings={settings}
          />
        </div>

        {/* ── Mobile class switcher ── */}
        {allClasses.length > 1 && (
          <div className="bg-slate-800 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-print shrink-0 sm:hidden">
            <span className="text-slate-400 text-xs font-bold shrink-0">
              فصل آخر:
            </span>
            {allClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => onSwitchClass && onSwitchClass(cls)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  cls === className
                    ? "bg-amber-400 text-slate-900"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
