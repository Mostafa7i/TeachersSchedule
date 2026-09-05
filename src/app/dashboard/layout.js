"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/layout/Sidebar";

import NotificationBell from "@/components/notifications/NotificationBell";

function MobileHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <Sidebar isMobile onClose={() => setOpen(false)} />
      </div>
      <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0) || "م"}
          </div>
          <span className="font-semibold text-gray-800 text-sm">
            {user?.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="القائمة"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>
    </>
  );
}

function DesktopHeader() {
  const { user } = useAuth();

  return (
    <header className="hidden lg:flex bg-white border-b border-gray-200/80 px-6 py-3 items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500">
          نظام إدارة ومتابعة الجداول المدرسية
        </span>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2.5 border-r border-gray-200 pr-4 mr-1">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-black text-xs shadow-xs">
            {user?.name?.charAt(0) || "م"}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-800 leading-none">
              {user?.name}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {user?.role?.name || "مستخدم"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    // إعادة توجيه المعلمين الذين لم يكملوا ملفهم الشخصي
    if (!loading && user && !user.isProfileComplete && !user.role?.isSystem) {
      router.push("/complete-profile");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // لا نعرض الداشبورد إذا لم يكتمل الملف الشخصي
  if (user && !user.isProfileComplete && !user.role?.isSystem) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DesktopHeader />
        <MobileHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
