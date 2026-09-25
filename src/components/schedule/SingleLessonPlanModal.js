"use client";

import { useState } from "react";
import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import { useToast } from "@/contexts/ToastContext";
import { getLogoUrl, getClassBadgeStyle } from "@/lib/utils";

export default function SingleLessonPlanModal({
  isOpen,
  onClose,
  schedule,
  week,
  settings,
}) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const printContainerId = "single-lesson-plan-print-sheet";

  if (!isOpen || !schedule) return null;

  const classStyle = getClassBadgeStyle(schedule.className);

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
        },
      });

      const link = document.createElement("a");
      link.download = `تحضير_${schedule.subject?.name || "مادة"}_${schedule.className || "فصل"}_${schedule.day}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("تم تصدير بطاقة التحضير كصورة PNG بنجاح 🖼️");
    } catch (err) {
      console.error("PNG export error:", err);
      toast.error("حدث خطأ أثناء تصدير الصورة");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
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
        },
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const pdfWidthMm = 210; // A4 Portrait
      const pdfHeightMm = (img.height / img.width) * pdfWidthMm;

      const pdf = new jsPDF({
        orientation: pdfHeightMm > pdfWidthMm ? "portrait" : "landscape",
        unit: "mm",
        format: [pdfWidthMm, pdfHeightMm],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");
      pdf.save(
        `تحضير_${schedule.subject?.name || "مادة"}_${schedule.className || "فصل"}_${schedule.day}_${Date.now()}.pdf`
      );

      toast.success("تم تصدير بطاقة التحضير كملف PDF بنجاح 📄");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("حدث خطأ أثناء تصدير ملف PDF");
    } finally {
      setExporting(false);
    }
  };

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

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>خطة وتحضير درس — ${schedule.lessonTitle || "بدون عنوان"}</title>
        <style>
          ${styleSheets}
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; }
          body { background: #fff; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; }
          button, .no-print { display: none !important; }
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

  const handleCopyText = () => {
    const text = `
خطة تحضير درس: ${schedule.lessonTitle || "—"}
المادة: ${schedule.subject?.name || "—"} | الصف: ${schedule.className || "—"}
اليوم: ${schedule.day} (${schedule.dayDate ? new Date(schedule.dayDate).toLocaleDateString("ar-SA") : "—"}) | الحصة: ${schedule.period}
----------------------------------------
🎯 أهداف الدرس:
${schedule.objectives || "لم تُسجل"}

🚀 التهيئة للحصة:
${schedule.warmUp || "لم تُسجل"}

🔤 مفردات الدرس:
${schedule.vocabulary || "لم تُسجل"}

🛠️ الوسائل التعليمية:
${schedule.teachingAids || "لم تُسجل"}

🧩 النشاط الصفي:
${schedule.activities || "لم يُسجل"}

📝 الواجب المنزلي:
${schedule.homework || "لم يُسجل"}

💬 الملاحظات:
${schedule.notes || "لا توجد"}
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success("تم نسخ نص التحضير إلى الحافظة 📋");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <div>
              <h3 className="text-sm sm:text-base font-black leading-tight">
                بطاقة خطة وتحضير الدرس اليومي
              </h3>
              <p className="text-xs text-slate-400">
                {schedule.subject?.name || "المادة"} — فصل: {schedule.className || "عام"} — {schedule.day} (الحصة {schedule.period})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-slate-800 border-t border-slate-700/60 px-4 py-2 flex items-center gap-2 flex-wrap shrink-0 no-print">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <span>📄</span>
            <span>{exporting ? "جاري..." : "حفظ PDF"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPNG}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <span>🖼️</span>
            <span>تنزيل PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <span>🖨️</span>
            <span>طباعة</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <span>📋</span>
            <span>نسخ النص</span>
          </button>

          <div className="flex-1" />
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            جاهز للطباعة والاعتماد الرسمي
          </span>
        </div>

        {/* Scrollable Printable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-50 flex-1">
          <div
            id={printContainerId}
            dir="rtl"
            className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 space-y-6 shadow-xs max-w-full"
            style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
          >
            {/* Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="grid grid-cols-3 items-center text-center sm:text-right gap-4">
                <div className="text-xs text-slate-700 space-y-1 font-medium text-right">
                  <p className="font-bold text-slate-900 text-sm">المملكة العربية السعودية</p>
                  <p>وزارة التعليم</p>
                  <p>{settings?.ministryHeader || "الإدارة العامة للتعليم"}</p>
                  <p className="font-bold text-slate-800">{settings?.schoolName || "مدرسة المستقبل"}</p>
                </div>

                <div className="text-center space-y-1">
                  {settings?.logo ? (
                    <img
                      src={getLogoUrl(settings.logo)}
                      alt="شعار المدرسة"
                      className="h-16 w-auto mx-auto object-contain"
                    />
                  ) : (
                    <div className="text-3xl">🏫</div>
                  )}
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    خطة وتحضير الدرس اليومي
                  </h2>
                  <p className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-0.5 rounded-full inline-block border border-blue-200">
                    {week?.label || "الأسبوع الدراسي"} — {settings?.academicYear || "1447-1448هـ"}
                  </p>
                </div>

                <div className="text-left text-xs text-slate-700 space-y-1">
                  <p>
                    <strong>المعلم: </strong> {schedule.teacher?.name || "معلم المادة"}
                  </p>
                  <p>
                    <strong>اليوم: </strong> {schedule.day}
                  </p>
                  <p>
                    <strong>التاريخ: </strong>{" "}
                    {schedule.dayDate
                      ? new Date(schedule.dayDate).toLocaleDateString("ar-SA", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                  <p>
                    <strong>الحصة: </strong> الحصة {schedule.period}
                  </p>
                </div>
              </div>
            </div>

            {/* Class & Subject Meta Ribbon */}
            <div className="bg-slate-900 text-white rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-bold shadow-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">المادة الدراسية</span>
                <span className="text-sm text-amber-300 font-black">
                  {typeof schedule.subject === "object" ? schedule.subject?.name : schedule.subject || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الصف / الفصل</span>
                <span className="text-sm text-white font-black">{schedule.className || "جميع الفصول"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">رقم الحصة والقاعة</span>
                <span className="text-sm text-cyan-300 font-black">
                  الحصة {schedule.period} {schedule.room ? `(${schedule.room})` : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">حالة التحضير</span>
                <span className="text-sm text-emerald-400 font-black">
                  {schedule.lessonTitle ? "✅ مكتمل التحضير" : "⚠️ قيد الإعداد"}
                </span>
              </div>
            </div>

            {/* 1) Lesson Title */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
              <span className="text-xs font-black text-blue-900 block mb-1 flex items-center gap-1.5">
                <span>📖</span>
                <span>عنوان الدرس وموضوع الحصة:</span>
              </span>
              <p className="text-base font-black text-slate-900">
                {schedule.lessonTitle || <span className="text-slate-400 font-normal italic">لم يُسجل عنوان الدرس بعد</span>}
              </p>
            </div>

            {/* 2) Objectives (أهداف الدرس ونواتج التعلم) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>🎯</span>
                <span>أهداف الدرس ونواتج التعلم المستهدفة:</span>
              </span>
              <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                {schedule.objectives || <span className="text-slate-400 italic">لا توجد أهداف مسجلة</span>}
              </div>
            </div>

            {/* 3) Two columns: Warm-up & Vocabulary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span>🚀</span>
                  <span>التهيئة للحصة والتمهيد:</span>
                </span>
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[70px]">
                  {schedule.warmUp || <span className="text-slate-400 italic">لم تُحدد تهيئة الحصة</span>}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span>🔤</span>
                  <span>مفردات ومفاهيم الدرس:</span>
                </span>
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[70px]">
                  {schedule.vocabulary || <span className="text-slate-400 italic">لا توجد مفردات مسجلة</span>}
                </div>
              </div>
            </div>

            {/* 4) Two columns: Teaching Aids & Class Activities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span>🛠️</span>
                  <span>الوسائل التعليمية ومصادر التعلم:</span>
                </span>
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[70px]">
                  {schedule.teachingAids || <span className="text-slate-400 italic">السبورة، الكتاب المدرسي، العرض التقديمي</span>}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span>🧩</span>
                  <span>النشاط الصفي واستراتيجيات التدريس:</span>
                </span>
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[70px]">
                  {schedule.activities || <span className="text-slate-400 italic">لا توجد أنشطة صفية مسجلة</span>}
                </div>
              </div>
            </div>

            {/* 5) Homework & Teacher Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-1.5">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <span>📝</span>
                  <span>الواجب المنزلي والمهمات الأدائية:</span>
                </span>
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white p-3 rounded-lg border border-blue-100 min-h-[60px]">
                  {schedule.homework || <span className="text-slate-400 italic">لا يوجد واجب منزلي</span>}
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-1.5">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span>💬</span>
                  <span>الملاحظات والتأمل الذاتي للمعلم:</span>
                </span>
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-white p-3 rounded-lg border border-amber-100 min-h-[60px]">
                  {schedule.notes || <span className="text-slate-400 italic">لا توجد ملاحظات</span>}
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="border-t-2 border-slate-300 pt-6 grid grid-cols-3 gap-4 text-center text-xs text-slate-700 font-medium">
              <div>
                <p className="text-slate-500 mb-6">معلم المادة</p>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                  {schedule.teacher?.name || "أ. ____________"}
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
        </div>
      </div>
    </div>
  );
}
