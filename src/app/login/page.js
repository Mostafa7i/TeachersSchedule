"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/ui/Modal";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Quick Google Sign-In Prompt Modal (for dev / instant testing)
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleName, setGoogleName] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");

  const { login, googleLogin } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // Load Google Identity Services SDK if Client ID is configured
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (googleClientId && typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => {
              if (response.credential) {
                handleGoogleLogin({ credential: response.credential });
              }
            },
          });
          const btnDiv = document.getElementById("google-btn-container");
          if (btnDiv) {
            window.google.accounts.id.renderButton(btnDiv, {
              theme: "outline",
              size: "large",
              width: "100%",
              text: "continue_with",
              shape: "pill",
            });
          }
        }
      };
      document.head.appendChild(script);
      return () => {
        if (document.head.contains(script)) document.head.removeChild(script);
      };
    }
  }, []);

  const handleStandardSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      const user = await login(cleanEmail, cleanPassword);
      toast.success(`مرحباً ${user.name} 👋`);

      if (!user.isProfileComplete && !user.role?.isSystem) {
        router.push("/complete-profile");
      } else {
        const isAdmin = user.role?.isSystem === true;
        router.push(isAdmin ? "/dashboard/admin" : "/dashboard/teacher");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK" || err.message === "Network Error"
          ? "تعذر الاتصال بالخادم، يرجى التأكد من تشغيل الـ Backend على المنفذ 5000"
          : "البريد الإلكتروني أو كلمة المرور غير صحيحة");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (payload) => {
    setGoogleLoading(true);
    try {
      const loggedUser = await googleLogin(payload);
      toast.success(`مرحباً ${loggedUser.name} 👋`);

      if (!loggedUser.isProfileComplete && !loggedUser.role?.isSystem) {
        router.push("/complete-profile");
      } else {
        const isAdmin = loggedUser.role?.isSystem === true;
        router.push(isAdmin ? "/dashboard/admin" : "/dashboard/teacher");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "فشل تسجيل الدخول بحساب Google";
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTriggerGoogleModal = () => {
    // If real Google SDK button is loaded, try prompt
    if (
      window.google?.accounts?.id &&
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    ) {
      window.google.accounts.id.prompt();
    } else {
      // Open instant Google account test modal
      setGoogleModalOpen(true);
    }
  };

  const handleCustomGoogleSubmit = async (e) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      toast.error("يرجى إدخال بريد حساب Google");
      return;
    }
    setGoogleModalOpen(false);
    await handleGoogleLogin({
      email: googleEmail.trim().toLowerCase(),
      name: googleName.trim() || "معلم جديد",
      googleId: `google_${Date.now()}`,
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* School Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-4 border border-blue-100">
            <span className="text-3xl">🏫</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">
            نظام إدارة الجداول المدرسية
          </h1>
          <p className="text-blue-200 text-xs sm:text-sm font-semibold">
            بوابة تسجيل الدخول وتوزيع الخطة الأسبوعية
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-gray-900">تسجيل الدخول</h2>
            <p className="text-xs text-gray-500 font-semibold">
              سجل دخولك أو انضم لأول مرة كمعلم عبر حساب Google
            </p>
          </div>

          {/* 1) Google OAuth Primary Button */}
          <div className="space-y-3">
            <div id="google-btn-container" className="w-full" />

            <button
              type="button"
              onClick={handleTriggerGoogleModal}
              disabled={googleLoading || loading}
              className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-800 font-bold py-3 px-4 rounded-2xl transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-3 text-sm cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>تسجيل الدخول بحساب Google (المعلمين)</span>
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className="w-full border-t border-gray-200" />
              <span className="bg-white px-3 text-xs font-bold text-gray-400 absolute">
                أو بالبريد وكلمة المرور
              </span>
            </div>
          </div>

          {/* 2) Standard Email / Password Form */}
          <form onSubmit={handleStandardSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@school.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400 font-semibold text-sm"
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400 pe-10 font-semibold text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-black py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg cursor-pointer"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>جاري الدخول...</span>
                </>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6 font-medium">
          نظام إدارة الجداول المدرسية &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Instant Google Sign-In Simulation Modal */}
      <Modal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        title="تسجيل الدخول بواسطة حساب Google"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setGoogleModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleCustomGoogleSubmit}
              disabled={googleLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-2"
            >
              {googleLoading ? "جاري الاتصال..." : "متابعة عبر Google 🚀"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCustomGoogleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
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
            </div>
            <div>
              <p className="text-xs font-bold text-blue-950">
                تسجيل وتوثيق المعلم بحساب Google
              </p>
              <p className="text-[11px] text-blue-700">
                سجل كمعلم جديد بالبريد أو اختر أحد المعلمين الجاهزين بنقرة
                واحدة:
              </p>
            </div>
          </div>

          {/* Quick 1-click teacher accounts */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">
              🚀 حسابات معلمين جاهزة للتجربة الفورية (بنقرة واحدة):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  name: "أ. أحمد محمد",
                  email: "ahmed.math@gmail.com",
                  role: "معلم رياضيات",
                },
                {
                  name: "أ. خالد الحربي",
                  email: "khaled.science@gmail.com",
                  role: "معلم علوم",
                },
                {
                  name: "أ. فهد العتيبي",
                  email: "fahad.arabic@gmail.com",
                  role: "معلم لغتي",
                },
                {
                  name: "أ. سلطان الدوسري",
                  email: "sultan.english@gmail.com",
                  role: "معلم إنجليزي",
                },
              ].map((t) => (
                <button
                  key={t.email}
                  type="button"
                  onClick={() => {
                    setGoogleName(t.name);
                    setGoogleEmail(t.email);
                  }}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                    googleEmail === t.email
                      ? "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-200"
                      : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800"
                  }`}
                >
                  <p className="text-xs font-bold">{t.name}</p>
                  <p className="text-[10px] text-gray-500">{t.role}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم المعلم بحساب Google
              </label>
              <input
                type="text"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                placeholder="مثال: أ. عبدالمحسن العتيبي"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                بريد Google (Gmail) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                required
                placeholder="teacher.name@gmail.com"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-left"
                dir="ltr"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
