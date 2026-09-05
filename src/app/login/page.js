"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/ui/Modal";
import TeacherOnboardingModal from "@/components/auth/TeacherOnboardingModal";

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const tokenClientRef = useRef(null);

  const { login, googleLogin } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // Initialize Google OAuth2 Token Client (Popup)
  useEffect(() => {
    const googleClientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "783267578761-placeholder.apps.googleusercontent.com";

    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.oauth2) {
          try {
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
              client_id: googleClientId,
              scope: "email profile openid",
              callback: async (tokenResponse) => {
                if (tokenResponse.error) {
                  toast.error("تم إلغاء تسجيل الدخول بحساب Google");
                  setGoogleLoading(false);
                  return;
                }
                try {
                  setGoogleLoading(true);
                  // Fetch userinfo directly from Google API using the OAuth access token
                  const res = await fetch(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    {
                      headers: {
                        Authorization: `Bearer ${tokenResponse.access_token}`,
                      },
                    }
                  );
                  const googleUser = await res.json();
                  await handleGoogleAuthSuccess({
                    email: googleUser.email,
                    name: googleUser.name || "معلم",
                    avatar: googleUser.picture || "",
                    googleId: googleUser.sub,
                  });
                } catch (err) {
                  toast.error("فشل جلب بيانات حساب Google");
                  setGoogleLoading(false);
                }
              },
            });
          } catch (e) {
            console.error("GSI Init error:", e);
          }
        }
      };
      document.head.appendChild(script);
      return () => {
        if (document.head.contains(script)) document.head.removeChild(script);
      };
    }
  }, []);

  const handleGoogleAuthSuccess = async (payload) => {
    setGoogleLoading(true);
    try {
      const loggedUser = await googleLogin(payload);

      // If teacher has not completed profile, show the obligatory popup
      if (!loggedUser.isProfileComplete && !loggedUser.role?.isSystem) {
        setShowOnboarding(true);
      } else {
        toast.success(`مرحباً أ. ${loggedUser.name} 👋`);
        const isAdmin = loggedUser.role?.isSystem === true;
        router.push(isAdmin ? "/dashboard/admin" : "/dashboard/teacher");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "فشل تسجيل الدخول بحساب Google";
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTriggerGoogleOAuth = () => {
    const hasCustomClientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
      !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.includes("placeholder");

    // 1) If Google OAuth SDK is loaded with a real Client ID -> Open Google native popup
    if (tokenClientRef.current && hasCustomClientId) {
      setGoogleLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
      return;
    }

    // 2) Native OAuth2 Popup Flow
    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "";

    if (clientId) {
      setGoogleLoading(true);
      if (tokenClientRef.current) {
        tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
      }
      return;
    }

    // If client ID is not configured yet in environment, open Google popup window
    // with clear message
    toast.error(
      "يرجى وضع NEXT_PUBLIC_GOOGLE_CLIENT_ID في متغيرات البيئة لتفعيل نافذة Google OAuth الحقيقية"
    );
  };

  // Admin password login (modal)
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      toast.error("يرجى إدخال البريد وكلمة المرور");
      return;
    }
    setAdminLoading(true);
    try {
      const user = await login(adminEmail.trim().toLowerCase(), adminPassword.trim());
      toast.success(`مرحباً ${user.name} 👋`);
      setAdminModalOpen(false);
      router.push(user.role?.isSystem ? "/dashboard/admin" : "/dashboard/teacher");
    } catch (err) {
      const msg = err.response?.data?.message || "البيانات غير صحيحة";
      toast.error(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* School Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-4 border border-blue-100/20 text-4xl">
            🏫
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            نظام إدارة الجداول المدرسية
          </h1>
          <p className="text-blue-200 text-sm font-medium">
            بوابة تسجيل الدخول الموحد للمعلمين
          </p>
        </div>

        {/* Clean Single Card: Google OAuth Only */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-gray-900">تسجيل الدخول</h2>
            <p className="text-xs text-gray-500 font-medium">
              اضغط على الزر أدناه لتسجيل الدخول الفوري بحساب Google
            </p>
          </div>

          {/* Primary Google OAuth Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTriggerGoogleOAuth}
              disabled={googleLoading}
              className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-500 text-gray-800 hover:text-blue-900 font-black py-4 px-6 rounded-2xl transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-3.5 text-base cursor-pointer disabled:opacity-60 group"
            >
              {googleLoading ? (
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6 flex-shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>تسجيل الدخول بحساب Google</span>
            </button>
          </div>

          {/* Admin Login Link */}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setAdminModalOpen(true)}
              className="text-xs text-gray-400 hover:text-gray-700 font-bold hover:underline transition-colors"
            >
              🔒 الدخول كمسؤول النظام (Admin)
            </button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6 font-medium">
          نظام إدارة الجداول المدرسية &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Admin Password Login Modal */}
      <Modal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        title="تسجيل دخول مسؤول النظام"
        size="sm"
      >
        <form onSubmit={handleAdminSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              بريد المسؤول
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@school.com"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={adminLoading}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {adminLoading ? "جاري التحقق..." : "دخول كمسؤول"}
          </button>
        </form>
      </Modal>

      {/* Obligatory Post-Login Teacher Onboarding Modal (Name & Subjects) */}
      <TeacherOnboardingModal
        isOpen={showOnboarding}
        onComplete={(updatedUser) => {
          setShowOnboarding(false);
          router.push("/dashboard/teacher");
        }}
      />
    </div>
  );
}
