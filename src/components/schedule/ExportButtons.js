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
      // 1. التقاط العنصر بجودة عالية ودقة 2x
      const imgData = await toJpeg(element, {
        ...imgOptions(element),
        pixelRatio: 2,
        quality: 0.95,
      });

      // 2. تحميل الصورة لقياس أبعادها بدقة
      const img = new Image();
      img.src = imgData;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      // 3. إنشاء مستند PDF أفقي A4
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm
      const margin = 8; // هوامش 8 مم
      const printWidth = pdfWidth - margin * 2; // 281mm - يملأ عرض الصفحة بالكامل!
      const printHeight = pdfHeight - margin * 2; // 194mm الارتفاع المتاح لكل صفحة

      // حساب عدد البكسل لكل مليمتر
      const pxPerMm = img.width / printWidth;
      const pageSlicePxHeight = printHeight * pxPerMm;

      // كانفاس لتقطيع الصورة لصفحات متتالية بعرض كامل وجودة فائقة
      const sliceCanvas = document.createElement("canvas");
      const sliceCtx = sliceCanvas.getContext("2d");

      let currentYPx = 0;
      let pageIndex = 0;

      while (currentYPx < img.height) {
        if (pageIndex > 0) {
          pdf.addPage("a4", "landscape");
        }

        const remainingPxHeight = img.height - currentYPx;
        const currentSlicePxHeight = Math.min(
          pageSlicePxHeight,
          remainingPxHeight,
        );

        sliceCanvas.width = img.width;
        sliceCanvas.height = currentSlicePxHeight;

        // خلفية بيضاء
        sliceCtx.fillStyle = "#ffffff";
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

        // رسم الجزء الخاص بالصفحة الحالية
        sliceCtx.drawImage(
          img,
          0,
          currentYPx,
          img.width,
          currentSlicePxHeight,
          0,
          0,
          img.width,
          currentSlicePxHeight,
        );

        const sliceDataUrl = sliceCanvas.toDataURL("image/jpeg", 0.95);
        const sliceMmHeight = currentSlicePxHeight / pxPerMm;

        // إضافة الصورة بعرض كامل
        pdf.addImage(
          sliceDataUrl,
          "JPEG",
          margin,
          margin,
          printWidth,
          sliceMmHeight,
        );

        currentYPx += pageSlicePxHeight;
        pageIndex++;
      }

      pdf.save(`جدول_${weekLabel.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
      toast.success("تم تصدير الجدول كملف PDF كامل ومنسق بنجاح 📄");
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
