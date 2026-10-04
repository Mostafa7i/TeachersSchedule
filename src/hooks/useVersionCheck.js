"use client";

import { useEffect, useRef, useCallback } from "react";

const CHECK_INTERVAL_MS = 15 * 1000; // فحص كل 15 ثانية

/**
 * useVersionCheck
 * يراقب إصدار التطبيق بانتظام وعند الرجوع للتبويب. لو وجد إصدار أحدث يعيد تحميل الصفحة تلقائياً.
 */
export function useVersionCheck() {
  const initialVersionRef = useRef(null);
  const isReloadingRef = useRef(false);

  const fetchVersion = useCallback(async () => {
    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.version || null;
    } catch (err) {
      console.warn("Version check failed:", err);
      return null;
    }
  }, []);

  const check = useCallback(async () => {
    if (isReloadingRef.current) return;
    const current = await fetchVersion();
    if (!current) return;

    if (initialVersionRef.current === null) {
      initialVersionRef.current = current;
      return;
    }

    if (current !== initialVersionRef.current) {
      console.log(`[UpdateDetector] إصدار جديد متوفر (${current} vs ${initialVersionRef.current}). جاري تحديث الصفحة...`);
      isReloadingRef.current = true;
      // إعادة تحميل الصفحة مع تخطي الكاش
      window.location.reload();
    }
  }, [fetchVersion]);

  useEffect(() => {
    // 1. تحقق فوري عند التحميل
    check();

    // 2. تحقق دوري كل 15 ثانية
    const timer = setInterval(check, CHECK_INTERVAL_MS);

    // 3. تحقق عند العودة للتبويب أو تنشيط النافذة
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };
    const handleFocus = () => {
      check();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [check]);
}
