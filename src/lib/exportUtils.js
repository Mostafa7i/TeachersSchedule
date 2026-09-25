import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";

/**
 * ينظّف اسم الملف من الرموز غير المسموحة
 */
export function sanitizeFilename(name, fallback = "تصدير") {
  if (!name || typeof name !== "string") return fallback;

  return (
    name
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .trim() || fallback
  );
}

/**
 * خيارات آمنة لالتقاط العنصر كصورة
 */
export function getSafeImageOptions(
  element,
  { pixelRatio = 2.0, minWidth = 1000 } = {}
) {
  const currentW = element?.scrollWidth || element?.offsetWidth || minWidth;
  const targetW = Math.max(currentW, minWidth);
  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;
  const safeRatio = isMobile ? Math.min(pixelRatio, 1.5) : pixelRatio;

  return {
    backgroundColor: "#ffffff",
    pixelRatio: safeRatio,
    skipFonts: true,
    fontEmbedCSS: "",
    cacheBust: true,
    style: {
      fontFamily: "'Tajawal', 'Cairo', sans-serif",
      minWidth: `${targetW}px`,
      width: `${targetW}px`,
    },
    filter: (node) => {
      if (node?.classList?.contains("no-export")) return false;
      if (node?.classList?.contains("no-print")) return false;
      return true;
    },
  };
}

/**
 * يلتقط العنصر كصورة بشكل آمن مع fallback
 */
export async function captureElementSafely(
  element,
  format = "jpeg",
  options = {}
) {
  if (!element) throw new Error("Element not found");

  const opts = getSafeImageOptions(element, options);

  try {
    if (format === "png") {
      return await toPng(element, opts);
    }
    return await toJpeg(element, {
      ...opts,
      quality: options.quality ?? 0.95,
    });
  } catch (err) {
    console.warn(
      "Primary capture failed, attempting fallback with lower ratio...",
      err
    );

    const fallbackOpts = {
      ...opts,
      pixelRatio: 1.2,
      skipFonts: true,
      fontEmbedCSS: "",
    };

    if (format === "png") {
      return await toPng(element, fallbackOpts);
    }
    return await toJpeg(element, {
      ...fallbackOpts,
      quality: 0.88,
    });
  }
}

/**
 * تصدير العنصر كـ PNG
 */
export async function exportElementToPNG(
  element,
  filename = "جدول.png"
) {
  const dataUrl = await captureElementSafely(element, "png", {
    pixelRatio: 2.2,
  });

  const link = document.createElement("a");
  let safeName = sanitizeFilename(filename, "جدول");
  if (!safeName.toLowerCase().endsWith(".png")) {
    safeName += ".png";
  }

  link.download = safeName;
  link.href = dataUrl;
  link.click();

  return true;
}

/**
 * تصدير العنصر كـ PDF
 * @param {HTMLElement} element
 * @param {string} filename
 * @param {object} options
 * @param {"fit"|"actual"} options.mode - "fit" = يملأ الصفحة | "actual" = الحجم الحقيقي
 * @param {"portrait"|"landscape"} options.orientation
 */
export async function exportElementToPDF(
  element,
  filename = "جدول.pdf",
  { mode = "fit", orientation } = {}
) {
  const imgData = await captureElementSafely(element, "jpeg", {
    pixelRatio: 2.0,
    quality: 0.95,
  });

  // نحمّل الصورة عشان نعرف أبعادها الحقيقية
  const img = new Image();
  img.src = imgData;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // نحدد الاتجاه تلقائياً لو مش محدد
  const autoOrientation =
    orientation || (imgWidth > imgHeight ? "landscape" : "portrait");

  const pdf = new jsPDF({
    orientation: autoOrientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 8; // هامش بسيط
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  let renderWidth, renderHeight;

  if (mode === "actual") {
    // الحجم الحقيقي (مع تحويل من بكسل لـ mm تقريباً)
    const pxToMm = 0.264583;
    renderWidth = imgWidth * pxToMm;
    renderHeight = imgHeight * pxToMm;

    // لو أكبر من الصفحة نصغّر
    if (renderWidth > availableWidth || renderHeight > availableHeight) {
      const ratio = Math.min(
        availableWidth / renderWidth,
        availableHeight / renderHeight
      );
      renderWidth *= ratio;
      renderHeight *= ratio;
    }
  } else {
    // mode = "fit" → يملأ الصفحة مع الحفاظ على النسبة
    const ratio = Math.min(
      availableWidth / imgWidth,
      availableHeight / imgHeight
    );
    renderWidth = imgWidth * ratio;
    renderHeight = imgHeight * ratio;
  }

  // توسيط الصورة في الصفحة
  const x = (pageWidth - renderWidth) / 2;
  const y = (pageHeight - renderHeight) / 2;

  pdf.addImage(imgData, "JPEG", x, y, renderWidth, renderHeight);

  let safeName = sanitizeFilename(filename, "جدول");
  if (!safeName.toLowerCase().endsWith(".pdf")) {
    safeName += ".pdf";
  }

  pdf.save(safeName);
  return true;
}