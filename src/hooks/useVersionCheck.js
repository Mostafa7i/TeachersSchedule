"use client";

import { useEffect, useRef, useCallback } from "react";

const CHECK_INTERVAL_MS = 60 * 1000; // كل دقيقة

/**
 * useVersionCheck
 * يراقب إصدار التطبيق كل دقيقة. لو لقى إصدار أحدث يعمل reload تلقائي.
 */
export function useVersionCheck() {
  const initialVersion = useRef(null);
  const timerRef = useRef(null);

  const fetchVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return null;
      const { version } = await res.json();
      return version;
    } catch {
      return null;
    }
  }, []);

  const check = useCallback(async () => {
    const current = await fetchVersion();
    if (!current) return;

    if (initialVersion.current === null) {
      // أول مرة نحفظ الإصدار الحالي
      initialVersion.current = current;
      return;
    }

    if (current !== initialVersion.current) {
      // يوجد إصدار جديد — أعد تحميل الصفحة
      window.location.reload();
    }
  }, [fetchVersion]);

  useEffect(() => {
    // تحقق فوري عند التحميل لتخزين الإصدار الأولي
    check();

    // ثم تحقق كل دقيقة
    timerRef.current = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [check]);
}
