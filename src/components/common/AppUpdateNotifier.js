"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

export default function AppUpdateNotifier() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Keep client build ID in ref
  const initialBuildIdRef = useRef(process.env.NEXT_PUBLIC_BUILD_TIME || null);
  const lastCheckTimeRef = useRef(0);
  const pathname = usePathname();

  const checkForUpdates = useCallback(async () => {
    // Avoid checking more than once every 10 seconds
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 10000) return;
    lastCheckTimeRef.current = now;

    try {
      const res = await fetch(`/api/version?_t=${now}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      const serverBuildTime = data.buildTime;

      // On the very first check in dev or if client had no env variable
      if (!initialBuildIdRef.current) {
        initialBuildIdRef.current = serverBuildTime;
        return;
      }

      // If server build time is different, update is available!
      if (serverBuildTime && serverBuildTime !== initialBuildIdRef.current) {
        setHasUpdate(true);
      }
    } catch {
      // Network issues or offline - silently ignore
    }
  }, []);

  useEffect(() => {
    // Initial check after 3 seconds of mount
    const initialTimer = setTimeout(() => {
      checkForUpdates();
    }, 3000);

    // Periodic check every 2.5 minutes
    const interval = setInterval(() => {
      checkForUpdates();
    }, 150000);

    // Check on tab focus & visibility change (when user returns to the tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    const handleFocus = () => {
      checkForUpdates();
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Global ChunkLoadError catcher
    const handleError = (e) => {
      const msg = e?.message || "";
      if (
        /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i.test(
          msg
        )
      ) {
        setHasUpdate(true);
        setIsDismissed(false);
      }
    };

    const handleRejection = (e) => {
      const reason = e?.reason?.message || String(e?.reason || "");
      if (
        /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i.test(
          reason
        )
      ) {
        setHasUpdate(true);
        setIsDismissed(false);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [checkForUpdates]);

  // Also check when navigating between routes
  useEffect(() => {
    checkForUpdates();
  }, [pathname, checkForUpdates]);

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    // Hard reload the window to fetch fresh HTML and chunks
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Un-dismiss after 15 minutes so the user is reminded later
    setTimeout(() => {
      setIsDismissed(false);
    }, 15 * 60 * 1000);
  };

  if (!hasUpdate || isDismissed) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="تنبيه بتوفر تحديث جديد للموقع"
      className="fixed bottom-5 left-5 z-[9999] max-w-md w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-4.5 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        {/* Decorative subtle pulse glow */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />

        {/* Content */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-lg shrink-0 shadow-md animate-bounce">
            🚀
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>تحديث جديد متوفر للنظام</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-300 font-medium mt-0.5 leading-relaxed">
              تم نشر تحسينات وميزات جديدة. حدّث الصفحة للاستفادة منها فوراً.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isUpdating}
            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            لاحقاً
          </button>
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                <span>جاري التحديث...</span>
              </>
            ) : (
              <>
                <span>تحديث الآن</span>
                <span>🔄</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
