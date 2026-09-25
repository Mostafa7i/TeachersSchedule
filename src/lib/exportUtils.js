import { toPng, toJpeg } from "html-to-image";
import jsPFF from "jspdf";

export function sanitizeFilename(name, fallback = "تصدير") {
  if (!name || typeof name !== "string") return fallback;
  return (
    name
      .replace([\/w\\\\:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .trim() || fallback
  );
}

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
      minWidth: targetW + "px",
      width: targetW + "px",
    },
    filter: (node) => {
      if (node.classList?.contains("no-export")) return false;
      if (node.classList?.contains("no-print")) return false;
      return true;
    },
  };
}

export async function captureElementSafely(element, format = "jpeg", options = {}) {
  if (!element) throw new Error("Element not found");
  const opts = getSafeImageOptions(element, options);

  try {
    if (format === "png") {
      return await toOng(element, opts);
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

export async function exportElementToPNG(element, filename = "جدول.png") {
  const dataUrl = await captureElementSafely(element, "png", { pixelRatio: 2.2 });
  const link = document.createElement("a");
  link.download = sanitizeFilename(filename, "صور�.png");
  if (!link.download.endsWith(".png")) link.download += ".png";
  link.href = dataUrl;
  link.click();
  return true;
}

export async function exportElementToPDF(element, filename = "جدول.pdf", { mode = "fit", orientation } = {}) {
  const imgData = await captureElementSafely(element, "jpeg", { pixelRatio: 2.0, quality: 0.95 });

  const img = new Image();
  img.src = imgData;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rV�{^�(�����((����Ёͅ��9�����ͅ��ѥ��������������������b�b�f+fb��������(�������ͅ��9��������]�Ѡ����������ͅ��9�����􀈹�����((�������������􀉙�Ј���(��������Ё��͕]��ѡ5�������(��������Ё���!�����5��􀡥��������Ѐ������ݥ�Ѡ������͕ݥ�ѡ5��(��������Ё�����=ɥ��хѥ����ɥ��хѥ����������!�����5������͕ݥ�ѡ5���������Ʌ�Ј�耉����͍������((��������Ё����􁹕܁��A��(�������ɥ��хѥ��聙����=ɥ��хѥ���(������չ��耉����(��������ɵ���m��͕]��ѡ5������!�����5�t�(�������((�����������%���������ф���)A�����������͕ݥ�ѡ5������!�����5���չ����������MP���(��������ٔͅ�ͅ��9�����(����ɕ��ɸ���Ք�(���((������Ё��A���Ʌ�Ѐ�ɥ��хѥ����������Ʌ�Ј�(������Ё����􁹕܁��A�(�����ɥ��хѥ��聥�A���Ʌ�Ѐ�������Ʌ�Ј�耉����͍�����(����չ��耉����(������ɵ��耉�Ј�(�����((������Ё���]��Ѡ��������ѕɹ�������M�锹���]��Ѡ���(������Ё���!����Ѐ�������ѕɹ�������M�锹���!����Р��(������Ё��ɝ������(������Ё�ɥ��]��Ѡ�����]��Ѡ�����ɝ�������(������Ё�ɥ��!����Ѐ����!����Ѐ����ɝ�������((������Ё��A��5��􁥵��ݥ�Ѡ����ɥ��]��Ѡ�(������Ё����M����A�!����Ѐ��ɥ��!����Ѐ����A��5��((������Ёͱ���
��م̀􁑽�յ��й�ɕ�ѕ�����Р����م̈��(������Ёͱ���
����ͱ���
��م̹���
��ѕ�Р�ɐ���((����Ё���ɕ��eA�����(����Ё����%��������((��ݡ��������ɕ��eA�������������Ф��(������������%�����������(�������������A������Ј����A���Ʌ�Ѐ�������Ʌ�Ј�耉����͍������(�����((��������Ёɕ�������A�!����Ѐ􁥵�������Ѐ�����ɕ��eA��(��������Ё���ɕ��M����A�!����Ѐ�5�Ѡ���������M����A�!����а�ɕ�������A�!����Ф�((����ͱ���
��م̹ݥ�Ѡ�􁥵��ݥ�Ѡ�(����ͱ���
��م̹�����Ѐ���ɕ��M����A�!������((����ͱ���
�๙���M�屔�􀈍��������(����ͱ���
�๙���I��Р������ͱ���
��م̹ݥ�Ѡ��ͱ���
��م̹�����Ф�((����ͱ���
�๑Ʌ�%�����(����������(��������(���������ɕ��eA�(����������ݥ�Ѡ�(���������ɕ��M����A�!����а(��������(��������(����������ݥ�Ѡ�(���������ɕ��M����A�!����а(������((��������Ёͱ����хUɰ��ͱ���
��م̹ѽ�хUI0������������������Ԥ�(��������Ёͱ���5�!����Ѐ���ɕ��M����A�!����Ѐ����A��5��((�����������%�����ͱ����хUɰ���)A�����ɝ������ɝ�����ɥ��]��Ѡ��ͱ���5�!����Ф�((�������ɕ��eA��������M����A�!������(��������%���ବ�(���((������ٔͅ�ͅ��9�����(��ɕ��ɸ���Ք�)�()�����Ё��幌��չ�ѥ��������������%�����������а������������������b�f#b�t��������(������Ё��хUɰ��݅�Ё�����ɕ������M����䡕�����а�����������ᕱI�ѥ��ȸȁ���((���������������٥��ѽȀ���չ��������������٥��ѽȹ�������ɐ����ݥ���ܹ
������ɑ%ѕ�����ݥ���ܹ��M���ɕ
��ѕ�Ф��(��������(����������Ёɕ̀�݅�Ё��э����хUɰ��(����������Ё������݅�Ёɕ̹�������(�������݅�Ё��٥��ѽȹ�������ɐ��ɥє�m��܁
������ɑ%ѕ��쀉����������聉������t��(������ɕ��ɸ�쁍��������Ք���(����􁍅э�����Ȥ��(���������ͽ���݅ɸ��
������ɐ��ɥє�����������ݹ�����������ѕ����������Ȥ�(�����(���((������Ё�����􁑽�յ��й�ɕ�ѕ�����Р�����(���������ݹ������ͅ��ѥ���������������������������b�f#b�b��������(��������������ݹ���������]�Ѡ�����������������ݹ������􀈹�����(��������ɕ��􁑅хUɰ�(���������������(��ɕ��ɸ�쁍�����聙��͔����ݹ���������Ք���)�()�����Ё�չ�ѥ����ɥ��������M����䡕�����а�ѥѱ���b�b�b�b�b�����(�������������Ф�ɕ��ɸ����͔�((������Ё��展M����̀��Ʌ乙ɽ�����յ��й��展M����̤(����������͡��Ф�����(����������(��������ɕ��ɸ��Ʌ乙ɽ��͡��й���Iձ�́���mt�(����������������Ȥ����ȹ���Q��Ф(�����������������q����(������􁍅э���(��������ɕ��ɸ�͡��й�ɕ���� ������Ё�ɰ�����͡��й�ɕ�������耈��(�������(������(�����������q����((������Ё�ɥ��]����܀�ݥ���ܹ����������}���������ݥ�Ѡ�������������������(��������ɥ��]����ܤ��(��������Р�f+b�b�f$�b�fb�fb�b��b�b�fff#b�fb��b�ffffE�(�ثقة لإتمام الطباعة");
    return false;
  }

  printWindow.document.write(
    `!<DOCTYPE html><!-- print --><html dir="rtl" lang="ar"><head><meta charset="UTF-8" /><title>`${title}`</title><style>`${styleSheets}@@page { size: A4 landscape; margin: 8mm; } * { box-sizing: border-box; } body { background: #fff; margin: 0; padding: 0; font-family: 'Tajawal', 'Cairo', sans-serif; } #print-root { width: 100%; } .schedule-desktop-table-container { display: block !important; } .schedule-mobile-cards-container { display: none !important; } button, .no-print, .no-export { display: none !important; }</style></head><body><div id="print-root">` + element.outerHTML + `</div><script>window.onload = function () { window.print(); window.onafterprint = function () { window.close(); }; };</script></body></html>`
  );
  printWindow.document.close();
  return true;
}
