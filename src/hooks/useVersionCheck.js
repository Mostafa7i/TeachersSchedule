"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const CHECK_INTERVAL_MS = 15 * 1000; // فحص كل 15 ثانية

/**
 * دالة مساعدة لتنظيف كاش المتصفح بالكامل قبل إعادة التحميل
 */
async function clearAllBrowserCaches() {
  try {
    // 1. تنظيف Cache Storage
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    console.warn("[AutoUpdate] Error clearing caches:", err);
  }

  try {
    // 2. إلغاء تسجيل أي Service Worker قديم
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
  } catch (err) {
    console.warn("[AutoUpdate] Error unregistering service workers:", err);
  }
}

/**
 * useVersionCheck
 * يراقب إصدار التطبيق بانتظام. عند نشر تحديث جديد (npm run push)،
 * يقوم بتفريغ الكاش وإعادة تحميل الصفحة تلقائياً دون الحاجة لأن يقوم المعلم بعمل رفرش يدوي.
 */
export function useVersionCheck() {
  const currentVersionRef = useRef(null);
  const isReloadingRef = useRef(false);
  const pathname = usePathname();

  // جلب رقم الإصدار مع تجاوز كاش المتصفح والـ CDN تماماً
  const fetchLatestVersion = useCallback(async () => {
    const timestamp = Date.now();
    try {
      // المحاولة الأولى: الملف الثابت في public (الأسرع والأقل استهلاكاً للموارد)
      const res = await fetch(`/version.json?_t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.version) return String(data.version);
      }
    } catch {
      // في حالة فشل الملف الثابت ننتقل لمسار الـ API
    }

    try {
      // المحاولة الثانية: مسار الـ API
      const res = await fetch(`/api/version?_t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.version) return String(data.version);
      }
    } catch {
      // ignore network errors
    }

    return null;
  }, []);

  // تنفيذ التحديث الفوري
  const triggerReload = useCallback(async (newVer) => {
    if (isReloadingRef.current) return;
    isReloadingRef.current = true;

    console.log(`[AutoUpdate] تم اكتشاف إصدار جديد (${newVer}). جاري تفريغ الكاش وتحديث الواجهة...`);

    // تنظيف الكاش والـ Service Workers
    await clearAllBrowserCaches();

    // حفظ الإصدار الجديد محلياً
    try {
      localStorage.setItem("app_current_version", newVer);
    } catch {}

    // إعادة تحميل نظيفة مع تجاوز كاش القرص
    window.location.reload();
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (isReloadingRef.current) return;

    const latest = await fetchLatestVersion();
    if (!latest) return;

    // أول مرة يتم فيها تحميل الصفحة في التبويب
    if (!currentVersionRef.current) {
      currentVersionRef.current = latest;
      try {
        localStorage.setItem("app_current_version", latest);
      } catch {}
      return;
    }

    // إذا تغير رقم الإصدار (تم عمل npm run push)
    if (latest !== currentVersionRef.current) {
      // فحص إذا كان المعلم يكتب حالياً في حقل إدخال (ننتظر لحظات حتى لا يضيع ما يكتبه)
      const activeEl = document.activeElement;
      const isUserTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable);

      if (isUserTyping) {
        // ننتظر حتى ينتهي المعلم من الحقل الحالي
        const onBlur = () => {
          activeEl.removeEventListener("blur", onBlur);
          triggerReload(latest);
        };
        activeEl.addEventListener("blur", onBlur, { once: true });
        // حد أقصى دقيقة واحدة للتحديث حتى لو لم يخرج من الحقل
        setTimeout(() => triggerReload(latest), 60000);
        return;
      }

      // إذا لم يكن يكتب، نقوم بالتحديث فوراً بسلاسة
      triggerReload(latest);
    }
  }, [fetchLatestVersion, triggerReload]);

  useEffect(() => {
    // 1. فحص فوري عند فتح الصفحة
    checkForUpdate();

    // 2. فحص دوري كل 15 ثانية
    const intervalId = setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    // 3. فحص عند عودة المعلم للتبويب
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };

    // 4. فحص عند استعادة التركيز على النافذة
    const handleFocus = () => {
      checkForUpdate();
    };

    // 5. معالجة أخطاء Next.js Chunk Loading (عند رفع بيلد جديد وتحميل ملفات قديمة)
    const handleChunkError = (event) => {
      const errorMsg = event?.message || event?.error?.message || "";
      if (
        errorMsg.includes("Loading chunk") ||
        errorMsg.includes("Failed to fetch dynamically imported module") ||
        errorMsg.includes("CSS chunk")
      ) {
        console.warn("[AutoUpdate] Chunk loading error detected after deployment. Forcing fresh reload...");
        clearAllBrowserCaches().then(() => {
          window.location.reload();
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("error", handleChunkError);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("error", handleChunkError);
    };
  }, [checkForUpdate]);

  // فحص أيضاً عند الانتقال بين صفحات الموقع
  useEffect(() => {
    checkForUpdate();
  }, [pathname, checkForUpdate]);
}
