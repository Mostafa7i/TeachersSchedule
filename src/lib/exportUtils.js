import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";

/**
 * Sanitizes filenames to be safe across all operating systems.
 */
export function sanitizeFilename(name, fallback = "تصدير") {
  if (!name || typeof name !== "string") return fallback;
  return (
    name
      .replace(/[\/\\:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .trim() || fallback
  );
}

/**
 * Common safe image options to prevent SecurityError from cssRules and memory overflows.
 */
export function getSafeImageOptions(element, { pixelRatio = 2.0, minWidth = 1000 } = {}) {
  const currentW = element?.scrollWidth || element?.offsetWidth || minWidth;
  const targetW = Math.max(currentW, minWidth);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const safeRatio = isMobile ? Math.min(pixelRatio, 1.5) : pixelRatio;

  return {
    backgroundColor: "#ffffff",
    pixelRatio: safeRatio,
    skipFonts: true,
    fontEmbedCSS: "",
    cacheBust: false,
    style: {
      fontFamily: "'Tajawal', 'Cairo', sans-serif",
      minWidth: `${targetW}px`,
      width: `${targetW}px`,
    },
    filter: (node) => {
      if (node.classList?.contains("no-export")) return false;
      if (node.classList?.contains("no-print")) return false;
      return true;
    },
  };
}

/**
 * Captures an HTML element as an image data URL with automatic fallback retry.
 */
export async function captureElementSafely(element, format = "jpeg", options = {}) {
  if (!element) throw new Error("Element not found");
  const opts = getSafeImageOptions(element, options);

  try {
    if (format === "png") {
      return await toPng(element, opts);
    }
    return await toJpeg(element, { ...opts, quality: options.quality || 0.95 });
  } catch (err) {
    console.warn("Primary capture failed, attempting fallback with safe ratio...", err);
    const fallbackOpts = {
      ...opts,
      pixelRatio: 1.2,
      skipFonts: true,
      fontEmbedCSS: "",
    };
    if (format === "png") {
      return await toPng(element, fallbackOpts);
    }
    return await toJpeg(element, { ...fallbackOpts, quality: 0.88 });
  }
}

/**
 * Exports an HTML element directly to a PNG file.
 */
export async function exportElementToPNG(element, filename = "جدول.png") {
  const dataUrl = await captureElementSafely(element, "png", { pixelRatio: 2.2 });
  const link = document.createElement("a");
  link.download = sanitizeFilename(filename, "صورة.png");
  if (!link.download.endsWith(".png")) link.download += ".png";
  link.href = dataUrl;
  link.click();
  return true;
}

/**
 * Exports an HTML element to a PDF file.
 * @param {HTMLElement} element - Target DOM element
 * @param {string} filename - Output filename
 * @param {Object} opts - Options: { mode: 'fit' | 'a4', orientation: 'landscape' | 'portrait' }
 */
export async function exportElementToPDF(element, filename = "جدول.pdf", { mode = "fit", orientation } = {}) {
  const imgData = await captureElementSafely(element, "jpeg", { pixelRatio: 2.0, quality: 0.95 });

  const img = new Image();
  img.src = imgData;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
  });

  let safeName = sanitizeFilename(filename, "وثيقة.pdf");
  if (!safeName.endsWith(".pdf")) safeName += ".pdf";

  if (mode === "fit") {
    // Mode 1: Full-Width Continuous PDF (ملء الشاشة بدون فراغات)
    const baseWidthMm = 297; // Landscape A4 width
    const pdfHeightMm = (img.height / img.width) * baseWidthMm;
    const finalOrientation = orientation || (pdfHeightMm > baseWidthMm ? "portrait" : "landscape");

    const pdf = new jsPDF({
      orientation: finalOrientation,
      unit: "mm",
      format: [baseWidthMm, pdfHeightMm],
    });

    pdf.addImage(imgData, "JPEG", 0, 0, baseWidthMm, pdfHeightMm, undefined, "FAST");
    pdf.save(safeName);
    return true;
  }

  // Mode 2: Multi-Page A4 (مقسم لصفحات A4 أفقية للطباعة الورقية)
  const isPortrait = orientation === "portrait";
  const pdf = new jsPDF({
    orientation: isPortrait ? "portrait" : "landscape",
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
    if (pageIndex > 0) {
      pdf.addPage("a4", isPortrait ? "portrait" : "landscape");
    }

    const remainingPxHeight = img.height - currentYPx;
    const currentSlicePxHeight = Math.min(pageSlicePxHeight, remainingPxHeight);

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
      currentSlicePxHeight,
    );

    const sliceDataUrl = sliceCanvas.toDataURL("image/jpeg", 0.95);
    const sliceMmHeight = currentSlicePxHeight / pxPerMm;

    pdf.addImage(sliceDataUrl, "JPEG", margin, margin, printWidth, sliceMmHeight);

    currentYPx += pageSlicePxHeight;
    pageIndex++;
  }

  pdf.save(safeName);
  return true;
}

/**
 * Copies an HTML element to clipboard as an image with fallback to download.
 */
export async function copyElementAsImage(element, fallbackFilename = "صورة.png") {
  const dataUrl = await captureElementSafely(element, "png", { pixelRatio: 2.2 });

  if (typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return { copied: true };
    } catch (err) {
      console.warn("Clipboard write failed, downloading instead...", err);
    }
  }

  // Fallback: download
  const link = document.createElement("a");
  link.download = sanitizeFilename(fallbackFilename, "صورة.png");
  if (!link.download.endsWith(".png")) link.download += ".png";
  link.href = dataUrl;
  link.click();
  return { copied: false, downloaded: true };
}

/**
 * Opens a print dialog for a specific element with safe stylesheet loading.
 */
export function printElementSafely(element, title = "طباعة") {
  if (!element) return false;

  const styleSheets = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || [])
          .map((r) => r.cssText)
          .join("\n");
      } catch {
        return sheet.href ? `@import url('${sheet.href}');` : "";
      }
    })
    .join("\n");

  const printWindow = window.open("", "_blank", "width=1100,height=900");
  if (!printWindow) {
    alert("يرجى السماح بالنوافذ المنبثقة لإتمام الطباعة");
    return false;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        ${styleSheets}
        @page { size: A4 landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { background: #fff; margin: 0; padding: 0; font-family: 'Tajawal', 'Cairo', sans-serif; }
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
  return true;
}
