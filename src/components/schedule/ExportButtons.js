"use client";

import { useState, useRef, useEffect } from "react";
import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";
import { useToast } from "@/contexts/ToastContext";

export default function ExportButtons({
  targetElementId = "weekly-schedule-print-container",
  weekLabel = "الجدول_الأسبوعي",
}) {
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const toast = useToast();

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setPdfMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Shared options for html-to-image with crisp rendering
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
      filter: (node) => {
        if (node.classList?.contains("no-export")) return false;
        if (node.classList?.contains("no-print")) return false;
        return true;
      },
    };
  };

  // Helper to ensure desktop table container is active during snapshot
  const prepareElementForSnapshot = (element) => {
    const desktopTable = element.querySelector(".schedule-desktop-table-container");
    const mobileCards = element.querySelector(".schedule-mobile-cards-container");
    let prevDesktopDisplay = "";
    let prevCardsDisplay = "";

    if (desktopTable && window.getComputedStyle(desktopTable).display === "none") {
      prevDesktopDisplay = desktopTable.style.display;
      desktopTable.style.display = "block";
    }
    if (mobileCards && window.getComputedStyle(mobileCards).display !== "none") {
      prevCardsDisplay = mobileCards.style.display;
      mobileCards.style.display = "none";
    }

    return () => {
      if (desktopTable && prevDesktopDisplay !== "") {
        desktopTable.style.display = prevDesktopDisplay;
      }
      if (mobileCards && prevCardsDisplay !== "") {
        mobileCards.style.display = prevCardsDisplay;
      }
    };
  };

  const handleExportPNG = async () => {
    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("لم يتم العثور على عنصر الجدول للتصدير");
      return;
    }

    const restoreDisplay = prepareElementForSnapshot(element);
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
      restoreDisplay();
      setExportingPng(false);
    }
  };

  const handleExportPDF = async (mode = "fit") => {
    setPdfMenuOpen(false);
    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("لم يتم العثور على عنصر الجدول للتصدير");
      return;
    }

    const restoreDisplay = prepareElementForSnapshot(element);
    setExportingPdf(true);
    try {
      // 1. Snapshot with high fidelity
      const imgData = await toJpeg(element, {
        ...imgOptions(element),
        pixelRatio: 2.2,
        quality: 0.96,
      });

      // 2. Load image to get precise pixel dimensions
      const img = new Image();
      img.src = imgData;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      if (mode === "fit") {
        // =========================================================================
        // MODE 1: Full-Width Continuous PDF (ملء الشاشة 100% بدون أي فراغ جانبي)
        // =========================================================================
        const pdfWidthMm = 297; // Landscape standard width
        const pdfHeightMm = (img.height / img.width) * pdfWidthMm;

        const pdf = new jsPDF({
          orientation: pdfHeightMm > pdfWidthMm ? "portrait" : "landscape",
          unit: "mm",
          format: [pdfWidthMm, pdfHeightMm],
        });

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");
        pdf.save(`جدول_${weekLabel.replace(/\s+/g, "_")}_ملء_الشاشة_${Date.now()}.pdf`);
        toast.success("تم تصدير الجدول كملف PDF عريض ملء الشاشة بنجاح 📄✨");
      } else {
        // =========================================================================
        // MODE 2: Multi-Page A4 Landscape (مقسم لصفحات A4 للطباعة الورقية)
        // =========================================================================
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
        const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm
        const margin = 6; // هوامش 6 مم فقط
        const printWidth = pdfWidth - margin * 2; // 285mm - يملأ عرض صفحة A4 بالكامل
        const printHeight = pdfHeight - margin * 2; // 198mm

        const pxPerMm = img.width / printWidth;
        const pageSlicePxHeight = printHeight * pxPerMm;

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
            remainingPxHeight
          );

          sliceCanvas.width = img.width;
          sliceCanvas.height = currentSlicePxHeight;

          sliceCtx.fillStyle = "#ffffff";
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

          sliceCtx.drawImage(
            img,
            0,
            currentYPx,
            img.width,
            currentSlicePxHeight,
            0,
            0,
            img.width,
            currentSlicePxHeight
          );

          const sliceDataUrl = sliceCanvas.toDataURL("image/jpeg", 0.95);
          const sliceMmHeight = currentSlicePxHeight / pxPerMm;

          pdf.addImage(
            sliceDataUrl,
            "JPEG",
            margin,
            margin,
            printWidth,
            sliceMmHeight
          );

          currentYPx += pageSlicePxHeight;
          pageIndex++;
        }

        pdf.save(`جدول_${weekLabel.replace(/\s+/g, "_")}_صفحات_A4_${Date.now()}.pdf`);
        toast.success("تم تصدير الجدول كملف PDF مقسم لصفحات A4 بنجاح 📑");
      }
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("حدث خطأ أثناء تصدير ملف PDF");
    } finally {
      restoreDisplay();
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("لم يتم العثور على عنصر الجدول للطباعة");
      return;
    }

    const styleSheets = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
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
          @page { size: A4 landscape; margin: 8mm; }
          * { box-sizing: border-box; }
          body { background: #fff; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; }
          #print-root { width: 100%; }
          .schedule-desktop-table-container { display: block !important; }
          .schedule-mobile-cards-container { display: none !important; }
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
    <div className="flex items-center gap-2 relative">
      {/* Export PNG */}
      <button
        onClick={handleExportPNG}
        disabled={exportingPng}
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
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

      {/* Export PDF Split Button / Dropdown */}
      <div className="relative inline-flex rounded-xl shadow-xs" ref={menuRef}>
        <button
          onClick={() => handleExportPDF("fit")}
          disabled={exportingPdf}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-r-xl transition-all disabled:opacity-50 cursor-pointer"
          title="تصدير PDF بعرض كامل 100% يملأ الشاشة"
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

        {/* Dropdown toggle arrow */}
        <button
          onClick={() => setPdfMenuOpen(!pdfMenuOpen)}
          disabled={exportingPdf}
          aria-label="خيارات تصدير PDF"
          className="bg-red-700 hover:bg-red-800 text-white px-2 py-2 sm:py-2.5 rounded-l-xl border-r border-red-500/50 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center"
          title="خيارات PDF (ملء الشاشة أو مقسم A4)"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${pdfMenuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* PDF Dropdown Menu */}
        {pdfMenuOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              type="button"
              onClick={() => handleExportPDF("fit")}
              className="w-full text-right px-4 py-2.5 text-xs text-slate-800 hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer"
            >
              <span className="text-base leading-none">📱</span>
              <div>
                <div className="font-bold text-slate-900">ملء الشاشة (100% عرض كامل)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  عرض عريض متصل بدون فراغات جانبية (ممتاز للموبايل والكمبيوتر)
                </div>
              </div>
            </button>

            <div className="h-px bg-slate-100 my-1" />

            <button
              type="button"
              onClick={() => handleExportPDF("a4")}
              className="w-full text-right px-4 py-2.5 text-xs text-slate-800 hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer"
            >
              <span className="text-base leading-none">🖨️</span>
              <div>
                <div className="font-bold text-slate-900">مقسم لصفحات A4 (جاهز للطباعة)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  مقسم تلقائيًا لصفحات A4 أفقية بعرض كامل مناسب للطباعة الورقية
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Direct Browser Print */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xs hover:shadow transition-all no-print cursor-pointer"
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
