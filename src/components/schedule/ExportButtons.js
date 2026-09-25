"use client";

import { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { useToast } from "@/contexts/ToastContext";

const MAX_CANVAS_DIMENSION = 8000;

export default function ExportButtons({
  targetElementId = "weekly-schedule-print-container",
  weekLabel = "الجدول_الأسبوعي",
}) {
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const toast = useToast();

  const isBusy = exportingPng || exportingPdf;

  // ── Helpers ──────────────────────────────────────────────

  const isMobileDevice = () =>
    typeof window !== "undefined" &&
    (window.innerWidth < 768 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  const yieldToUI = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 60));
    });

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setPdfMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!pdfMenuOpen || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const menuWidth = Math.min(256, window.innerWidth - 16);
    const menuHeight = 160;

    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 6);
    }

    setMenuPosition({ top, left });
  }, [pdfMenuOpen]);

  // ── Blank check ──────────────────────────────────────────

  const checkIfImageIsBlank = (dataUrl) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 32;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, size, size);
          const pixels = ctx.getImageData(0, 0, size, size).data;

          let nonWhite = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] < 250 || pixels[i + 1] < 250 || pixels[i + 2] < 250) {
              nonWhite++;
            }
          }
          resolve(nonWhite < size * size * 0.02);
        } catch {
          resolve(false);
        }
      };
      img.onerror = () => resolve(true);
      img.src = dataUrl;
    });

  /**
   * يفك القص بدون ما يكسّر الشارات أو الكلمات العربية
   */
  const unclipCloneContent = (root) => {
    // 1) جدول الديسكتوب ظاهر + كروت الموبايل مخفية
    const desktopTable = root.querySelector(
      ".schedule-desktop-table-container",
    );
    const mobileCards = root.querySelector(
      ".schedule-mobile-cards-container",
    );

    if (desktopTable) {
      desktopTable.style.cssText = `
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: auto !important;
        overflow: visible !important;
        width: 100% !important;
        max-width: none !important;
      `;
    }
    if (mobileCards) {
      mobileCards.style.cssText = "display: none !important;";
    }

    // 2) شيل عناصر التصدير/الطباعة
    root
      .querySelectorAll(".no-export, .no-print, button")
      .forEach((el) => el.remove());

    // 3) وسّع الجدول
    root.querySelectorAll("table").forEach((table) => {
      table.style.setProperty("width", "100%", "important");
      table.style.setProperty("min-width", "1400px", "important");
      table.style.setProperty("table-layout", "auto", "important");
      table.style.setProperty("border-collapse", "collapse", "important");
    });

    // 4) فك القص عن الخلايا والنصوص — بدون كسر العربية أو الـ flex
    root.querySelectorAll("td, th, p, span, div, a, label").forEach((el) => {
      // فك ellipsis / truncate / line-clamp
      el.style.setProperty("overflow", "visible", "important");
      el.style.setProperty("text-overflow", "unset", "important");
      el.style.setProperty("max-width", "none", "important");
      el.style.setProperty("max-height", "none", "important");
      el.style.setProperty("-webkit-line-clamp", "unset", "important");
      el.style.setProperty("-webkit-box-orient", "unset", "important");

      // عربي: white-space normal بدون word-break عنيف
      el.style.setProperty("white-space", "normal", "important");
      el.style.setProperty("word-break", "normal", "important");
      el.style.setProperty("overflow-wrap", "break-word", "important");
      el.style.setProperty("hyphens", "none", "important");
    });

    // 5) خلايا الجدول تحديدًا — padding مريح + محاذاة
    root.querySelectorAll("td, th").forEach((cell) => {
      cell.style.setProperty("padding", "8px 10px", "important");
      cell.style.setProperty("vertical-align", "middle", "important");
      cell.style.setProperty("text-align", "center", "important");
      cell.style.setProperty("height", "auto", "important");
      cell.style.setProperty("min-height", "48px", "important");
    });

    // 6) الحاويات اللي بتعمل scroll/clip
    root
      .querySelectorAll(
        "[class*='overflow'], [class*='scroll'], [class*='truncate'], [class*='line-clamp']",
      )
      .forEach((el) => {
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("text-overflow", "unset", "important");
        el.style.setProperty("-webkit-line-clamp", "unset", "important");
      });

    // 7) الشارات (badges/chips) — نخليها inline-flex عشان متتكسرش
    root
      .querySelectorAll(
        "[class*='rounded-full'], [class*='rounded-lg'], [class*='rounded-md'], [class*='badge'], [class*='chip'], [class*='tag']",
      )
      .forEach((el) => {
        el.style.setProperty("display", "inline-flex", "important");
        el.style.setProperty("white-space", "nowrap", "important");
        el.style.setProperty("flex-shrink", "0", "important");
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("max-width", "none", "important");
      });
  };

  /**
   * التقاط آمن بعرض واسع + فك القص
   */
  const captureElementMobileSafe = async (
    element,
    format = "jpeg",
    options = {},
  ) => {
    if (!element) throw new Error("Element not found");

    // عرض واسع ثابت عشان الأعمدة متتقصّش (موبايل وديسكتوب)
    const targetWidth = 1450;

    // انتظر تحميل الخطوط قبل نسخ العنصر؛ وإلا قد تختفي العربية في الصورة/PDF
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const clone = element.cloneNode(true);

    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText = `
      position: fixed !important;
      left: -99999px !important;
      top: 0 !important;
      width: ${targetWidth}px !important;
      min-width: ${targetWidth}px !important;
      background: #ffffff !important;
      z-index: -9999 !important;
      pointer-events: none !important;
      overflow: visible !important;
      opacity: 1 !important;
      transform: none !important;
      direction: rtl !important;
    `;

    clone.style.cssText = `
      width: ${targetWidth}px !important;
      min-width: ${targetWidth}px !important;
      max-width: none !important;
      background: #ffffff !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      transform: none !important;
      overflow: visible !important;
      direction: rtl !important;
    `;

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      unclipCloneContent(clone);

      await yieldToUI();
      await new Promise((r) => setTimeout(r, isMobileDevice() ? 280 : 140));

      // لا نقرأ cssRules من الخطوط/الـ stylesheets الخارجية؛ المتصفح يمنع ذلك
      // (SecurityError / Cannot access rules). يكفي انتظار تحميل الخطوط المعلنة في الصفحة.

      const w = Math.max(
        clone.scrollWidth || 0,
        clone.offsetWidth || 0,
        targetWidth,
      );
      const h = Math.max(clone.scrollHeight || 0, clone.offsetHeight || 0);

      if (w < 80 || h < 80) {
        throw new Error(
          `أبعاد الـ clone غير كافية للتصدير (w=${w}, h=${h})`,
        );
      }

      const desiredRatio = isMobileDevice()
        ? Math.min(options.pixelRatio || 1.4, 1.5)
        : options.pixelRatio || 2.0;

      const maxRatioByW = MAX_CANVAS_DIMENSION / w;
      const maxRatioByH = MAX_CANVAS_DIMENSION / h;
      const safePixelRatio = Math.max(
        1,
        Math.min(desiredRatio, maxRatioByW, maxRatioByH),
      );

      const captureOpts = {
        backgroundColor: "#ffffff",
        pixelRatio: safePixelRatio,
        cacheBust: true,
        // تجنب قراءة cssRules من stylesheets خارجية؛ الخطوط المحملة تعمل عبر canvas مباشرة
        skipFonts: true,
        width: w,
        height: h,
        style: {
          fontFamily: "Tajawal, Cairo, Arial, sans-serif",
          width: `${w}px`,
          minWidth: `${w}px`,
          transform: "none",
          direction: "rtl",
        },
        filter: (node) => {
          if (node.classList?.contains("no-export")) return false;
          if (node.classList?.contains("no-print")) return false;
          return true;
        },
      };

      // احفظ حدود الصفوف لاستخدامها عند تقسيم PDF؛ حتى لا ينقطع النص في منتصف الصف
      const cloneRect = clone.getBoundingClientRect();
      const slicePoints = Array.from(clone.querySelectorAll("tr"))
        .map((row) => Math.round(row.getBoundingClientRect().bottom - cloneRect.top))
        .filter((point) => point > 0 && point < h);

      // PNG أوضح بكثير من JPEG للنصوص والخطوط الرفيعة
      const dataUrl = await toPng(clone, captureOpts);

      if (!dataUrl || dataUrl.length < 1500) {
        throw new Error("الصورة الناتجة فارغة أو صغيرة جدًا");
      }

      const isReallyBlank = await checkIfImageIsBlank(dataUrl);
      if (isReallyBlank) {
        throw new Error("الصورة الناتجة بيضاء بالكامل");
      }

      return { dataUrl, width: w, height: h, slicePoints };
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };

  // ── Export PNG ───────────────────────────────────────────

  const handleExportPNG = async () => {
    setPdfMenuOpen(false);

    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("لم يتم العثور على عنصر الجدول للتصدير");
      return;
    }

    setExportingPng(true);
    await yieldToUI();

    try {
      const { dataUrl } = await captureElementMobileSafe(element, "png", {
        pixelRatio: isMobileDevice() ? 1.4 : 2.0,
      });

      const link = document.createElement("a");
      link.download = `جدول_${weekLabel.replace(/\s+/g, "_")}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("تم تصدير الجدول كصورة PNG بنجاح 🖼️");
    } catch (err) {
      console.error("PNG export error:", err);
      toast.error(
        err?.message?.includes("فارغة") ||
          err?.message?.includes("بيضاء") ||
          err?.message?.includes("أبعاد")
          ? "فشل التصدير على الموبايل. جرّب مرة أخرى أو استخدم الكمبيوتر"
          : "حدث خطأ أثناء تصدير الصورة",
      );
    } finally {
      setExportingPng(false);
    }
  };

  // ── Export PDF ───────────────────────────────────────────

  const handleExportPDF = async (mode = "fit") => {
    setPdfMenuOpen(false);

    const element = document.getElementById(targetElementId);
    if (!element) {
      toast.error("لم يتم العثور على عنصر الجدول للتصدير");
      return;
    }

    setExportingPdf(true);
    await yieldToUI();

    try {
      const { dataUrl: imgData, width: captureWidth, slicePoints } =
        await captureElementMobileSafe(element, "png",
        {
          pixelRatio: isMobileDevice() ? 1.4 : 2.0,
        },
      );

      const img = new Image();
      img.src = imgData;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error("فشل تحميل الصورة المُلتقطة"));
      });

      if (img.naturalWidth < 50 || img.naturalHeight < 50) {
        throw new Error("أبعاد الصورة المُلتقطة غير صالحة");
      }

      if (mode === "fit") {
        const pdfWidthMm = 320; // أوسع شوية عشان التفاصيل
        const pdfHeightMm = (img.height / img.width) * pdfWidthMm;

        const pdf = new jsPDF({
          orientation: pdfHeightMm > pdfWidthMm ? "portrait" : "landscape",
          unit: "mm",
          format: [pdfWidthMm, pdfHeightMm],
        });

        pdf.addImage(
          imgData,
          "PNG",
          0,
          0,
          pdfWidthMm,
          pdfHeightMm,
          undefined,
          "NONE",
        );
        pdf.save(
          `جدول_${weekLabel.replace(/\s+/g, "_")}_ملء_الشاشة_${Date.now()}.pdf`,
        );
        toast.success("تم تصدير الجدول كملف PDF عريض ملء الشاشة بنجاح 📄✨");
      } else {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 5;
        const printWidth = pdfWidth - margin * 2;
        const printHeight = pdfHeight - margin * 2;

        const sourceWidth = img.naturalWidth || img.width;
        const sourceHeight = img.naturalHeight || img.height;
        const pxPerMm = sourceWidth / printWidth;
        const pageSlicePxHeight = Math.floor(printHeight * pxPerMm);

        // حوّل حدود الصفوف من CSS pixels إلى pixels الصورة
        const imageScale = sourceWidth / captureWidth;
        const safeCutPoints = [
          ...slicePoints.map((point) => Math.round(point * imageScale)),
          sourceHeight,
        ]
          .filter((point) => point > 0 && point <= sourceHeight)
          .sort((a, b) => a - b);

        const sliceCanvas = document.createElement("canvas");
        const sliceCtx = sliceCanvas.getContext("2d");

        let currentYPx = 0;
        let pageIndex = 0;

        while (currentYPx < sourceHeight) {
          if (pageIndex > 0) {
            pdf.addPage("a4", "landscape");
          }

          const remainingPxHeight = sourceHeight - currentYPx;
          const desiredEnd = Math.min(
            currentYPx + pageSlicePxHeight,
            sourceHeight,
          );
          // اختر آخر حد صف قبل نهاية الصفحة، بدلاً من قطع صف/كلمة في المنتصف
          const rowSafeEnd = safeCutPoints
            .filter((point) => point > currentYPx + 8 && point <= desiredEnd)
            .pop();
          const sliceEnd = rowSafeEnd || desiredEnd;
          const currentSlicePxHeight = Math.min(
            sliceEnd - currentYPx,
            remainingPxHeight,
          );

          sliceCanvas.width = sourceWidth;
          sliceCanvas.height = currentSlicePxHeight;

          sliceCtx.fillStyle = "#ffffff";
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

          sliceCtx.drawImage(
            img,
            0,
            currentYPx,
            sourceWidth,
            currentSlicePxHeight,
            0,
            0,
            sourceWidth,
            currentSlicePxHeight,
          );

          const sliceDataUrl = sliceCanvas.toDataURL("image/png");
          const sliceMmHeight = currentSlicePxHeight / pxPerMm;

          pdf.addImage(
            sliceDataUrl,
            "PNG",
            margin,
            margin,
            printWidth,
            sliceMmHeight,
          );

          currentYPx = sliceEnd;
          pageIndex++;
        }

        pdf.save(
          `جدول_${weekLabel.replace(/\s+/g, "_")}_صفحات_A4_${Date.now()}.pdf`,
        );
        toast.success("تم تصدير الجدول كملف PDF مقسم لصفحات A4 بنجاح 📑");
      }
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(
        err?.message?.includes("فارغة") ||
          err?.message?.includes("بيضاء") ||
          err?.message?.includes("أبعاد") ||
          err?.message?.includes("تحميل")
          ? "فشل التصدير على الموبايل. جرّب مرة أخرى أو استخدم جهاز كمبيوتر"
          : "حدث خطأ أثناء تصدير ملف PDF",
      );
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Print ────────────────────────────────────────────────

  const handlePrint = () => {
    setPdfMenuOpen(false);

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

    const printWindow = window.open("", "_blank", "width=1500,height=900");

    if (!printWindow || printWindow.closed) {
      toast.error(
        "تم حظر النافذة المنبثقة بواسطة المتصفح، الرجاء السماح بالنوافذ المنبثقة لهذا الموقع ثم إعادة المحاولة",
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>طباعة الجدول — ${weekLabel}</title>
        <style>
          ${styleSheets}
          @page { size: A4 landscape; margin: 5mm; }
          * { box-sizing: border-box; }
          body {
            background: #fff;
            margin: 0;
            padding: 0;
            font-family: 'Tajawal', 'Cairo', sans-serif;
          }
          #print-root {
            width: 100%;
            overflow: visible !important;
          }
          .schedule-desktop-table-container {
            display: block !important;
            overflow: visible !important;
            width: 100% !important;
          }
          .schedule-mobile-cards-container { display: none !important; }
          button, .no-print, .no-export { display: none !important; }

          table {
            width: 100% !important;
            min-width: 1400px !important;
            table-layout: auto !important;
          }
          td, th {
            overflow: visible !important;
            text-overflow: unset !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            max-width: none !important;
            max-height: none !important;
            height: auto !important;
            padding: 8px 10px !important;
            vertical-align: middle !important;
            text-align: center !important;
          }
          .truncate, .line-clamp-1, .line-clamp-2, .overflow-hidden,
          [class*="line-clamp"], [class*="truncate"] {
            overflow: visible !important;
            text-overflow: unset !important;
            white-space: normal !important;
            -webkit-line-clamp: unset !important;
            max-height: none !important;
          }
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

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="flex items-center gap-2 relative">
      <button
        onClick={handleExportPNG}
        disabled={isBusy}
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        title="تصدير صورة PNG عالية الدقة"
      >
        <svg
          className="w-4 h-4 shrink-0"
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

      <div className="relative inline-flex rounded-xl shadow-xs" ref={menuRef}>
        <button
          onClick={() => handleExportPDF("fit")}
          disabled={isBusy}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-r-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="تصدير PDF بعرض كامل 100% يملأ الشاشة"
        >
          <svg
            className="w-4 h-4 shrink-0"
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

        <button
          onClick={() => setPdfMenuOpen((prev) => !prev)}
          disabled={isBusy}
          aria-label="خيارات تصدير PDF"
          aria-haspopup="true"
          aria-expanded={pdfMenuOpen}
          className="bg-red-700 hover:bg-red-800 text-white px-2 py-2 sm:py-2.5 rounded-l-xl border-r border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
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

        {pdfMenuOpen && (
          <div
            className="fixed z-[9999] w-[min(16rem,calc(100vw-1.5rem))] bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            <button
              type="button"
              onClick={() => handleExportPDF("fit")}
              className="w-full text-right px-4 py-2.5 text-xs text-slate-800 hover:bg-slate-50 active:bg-slate-100 flex items-start gap-2.5 transition-colors cursor-pointer"
            >
              <span className="text-base leading-none mt-0.5">📱</span>
              <div>
                <div className="font-bold text-slate-900">
                  ملء الشاشة (100% عرض كامل)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  عرض عريض متصل بدون فراغات — مناسب للموبايل والكمبيوتر
                </div>
              </div>
            </button>

            <div className="h-px bg-slate-100 my-1" />

            <button
              type="button"
              onClick={() => handleExportPDF("a4")}
              className="w-full text-right px-4 py-2.5 text-xs text-slate-800 hover:bg-slate-50 active:bg-slate-100 flex items-start gap-2.5 transition-colors cursor-pointer"
            >
              <span className="text-base leading-none mt-0.5">🖨️</span>
              <div>
                <div className="font-bold text-slate-900">
                  مقسم لصفحات A4 (جاهز للطباعة)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  مقسم تلقائيًا لصفحات A4 أفقية مناسب للطباعة الورقية
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handlePrint}
        disabled={isBusy}
        className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed no-print cursor-pointer"
        title="طباعة مباشرة"
      >
        <svg
          className="w-4 h-4 shrink-0"
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