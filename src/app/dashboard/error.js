"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="p-6 sm:p-10 max-w-2xl mx-auto text-center space-y-6" dir="rtl">
      <div className="bg-white rounded-3xl p-8 border border-red-100 shadow-lg space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-3xl shadow-xs">
          🛡️
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            حدث تعثر أثناء تحميل بيانات لوحة التحكم
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
            تم حماية حسابك وبياناتك من التوقف. يمكنك الضغط على زر إعادة المحاولة لاسترجاع البيانات مباشرة.
          </p>
        </div>

        {error?.message && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 font-mono text-center">
            {error.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>🔄</span>
            <span>إعادة المحاولة</span>
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
          >
            تحديث الصفحة
          </button>
        </div>
      </div>
    </div>
  );
}
