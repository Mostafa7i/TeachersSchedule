"use client";

import { useState } from "react";
import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import { useToast } from "@/contexts/ToastContext";

export default function ExportButtons({
  targetElementId = "weekly-schedule-print-container",
  weekLabel = "الجدول_الأسبوعي",
}) {
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const toast = useToast();

  // الخيارات المشتركة لـ html-to-image مع تخطي قراءة خطوط الـ Cross-Origin وضمان عرض كامل على الموبايل
  const imgOptions = (element) => {
    const minW = 1050;
    const currentW = element?.scrollWidth || element?.offsetWidth || minW;
    const targetW = Math.max(currentW, minW);
    return {
      backgroundColor: "#ffffff",
      pixelRatio: 2.5,
      style: {
        fontFamily: "inherit",
        minWidth: `${targetW}px`,
        width: `${targetW}px`,
      },
      skipFonts: true,
      fontEmbedCSS: "",
      filter: (node) => !node.classList?.contains("no-export"),
    };
  };

  const handleExportPNG = async () => {
    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("لم يتم العثور على عنصر الجدول للتصدير");
      return;
    }

    setExportingPng(true);
    try {
      const dataUrl = await toPng(element, imgOptions(element));

      const link = document.createElement("a");
      link.download = `جدول_${weekLabel.replace(/\s+/g, "_")}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("تم تصدير الجدول كصورة PNG عالية الدقة بنجاح 🖼️");
    } catch (err) {
      console.error("PNG export error:", err);
      toast.error("حدث خطأ أثناء تصدير الصورة");
    } finally {
      setExportingPng(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("لم يتم العثور على عنصر الجدول للتصدير");
      return;
    }

    setExportingPdf(true);
    try {
      const imgData = await toJpeg(element, {
        ...imgOptions(element),
        pixelRatio: 2,
        quality: 0.95,
      });

      // صفحة A4 أفقية
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const img = new Image();
      img.src = imgData;
      await new Promise((res) => {
        img.onload = res;
      });

      const ratio = img.height / img.width;
      const renderWidth = pdfWidth - 20;
      const renderHeight = renderWidth * ratio;

      if (renderHeight > pdfHeight - 20) {
        const scale = (pdfHeight - 20) / renderHeight;
        pdf.addImage(
          imgData,
          "JPEG",
          10,
          10,
          renderWidth * scale,
          pdfHeight - 20,
        );
      } else {
        pdf.addImage(imgData, "JPEG", 10, 10, renderWidth, renderHeight);
      }

      pdf.save(`جدول_${weekLabel.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
      toast.success("تم تصدير الجدول كملف PDF بنجاح 📄");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("حدث خطأ أثناء تصدير ملف PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("لم يتم العثور على عنصر الجدول للطباعة");
      return;
    }

    // جمع كل الـ styles من الصفحة الحالية
    const styleSheets = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          // cross-origin stylesheet — link بدلاً من inline
          return sheet.href ? `@import url('${sheet.href}');` : "";
        }
      })
      .join("\n");

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>طباعة الجدول — ${weekLabel}</title>
        <style>
          ${styleSheets}
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { background: #fff; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; }
          #print-root { width: 100%; }
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

  return (
    <div className="flex items-center gap-2">
      {/* Export PNG */}
      <button
        onClick={handleExportPNG}
        disabled={exportingPng}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
        title="تصدير صورة PNG عالية الدقة"
      >
        <svg
          className="w-4 h-4"
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
        <span>{exportingPng ? "جاري التصدير..." : "تصدير PNG"}</span>
      </button>

      {/* Export PDF */}
      <button
        onClick={handleExportPDF}
        disabled={exportingPdf}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
        title="تصدير مستند PDF جاهز للطباعة"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span>{exportingPdf ? "جاري التصدير..." : "تصدير PDF"}</span>
      </button>

      {/* Direct Browser Print */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm hover:shadow transition-all no-print"
        title="طباعة مباشرة"
      >
        <svg
          className="w-4 h-4"
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
        <span className="hidden sm:inline">طباعة</span>
      </button>
    </div>
  );
}
