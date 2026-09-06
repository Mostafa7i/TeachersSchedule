"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalAppError({ error, reset }) {
  useEffect(() => {
    console.error("App Root Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-3xl shadow-xs">
          ⚠️
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-gray-900">
            حدث خطأ غير متوقع في النظام
          </h2>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            نعتذر عن هذا الخطأ المؤقت. تم تسجيل المشكلة تلقائياً ويمكنك إعادة المحاولة الآن.
          </p>
        </div>

        {error?.message && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 font-mono text-center">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🔄</span>
            <span>إعادة المحاولة الآن</span>
          </button>
          <Link
            href="/dashboard/teacher"
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <span>🏠</span>
            <span>العودة للرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
