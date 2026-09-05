'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { subjectsService } from '@/services/subjects.service';

const SUBJECT_ICONS = {
  'فنية': '🎨',
  'رياضيات': '📐',
  'رقمية': '💻',
  'توحيد': '🕋',
  'English': '🇬🇧',
  'لغتي': '📖',
  'بدنية': '⚽',
  'تفسير': '📜',
  'تفسر': '📜',
  'اجتماعيات': '🌍',
  'حديث': '💬',
  'علوم': '🔬',
};

export default function CompleteProfilePage() {
  const { user, loading: authLoading, completeProfile, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Initialize data and redirect if already complete
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.isProfileComplete && user.subjects && user.subjects.length > 0 && user.phone) {
        router.replace(user.role?.isSystem ? '/dashboard/admin' : '/dashboard/teacher');
        return;
      }
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
    }
  }, [user, authLoading, router]);

  // Load available subjects from backend
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const res = await subjectsService.getAll({ isActive: true });
        const list = res.data || [];
        setSubjects(list);
        if (list.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(list[0]._id);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
        toast.error('تعذر تحميل قائمة المواد الدراسية');
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      toast.error('يرجى إدخال اسمك الكامل');
      return;
    }

    if (!cleanPhone) {
      toast.error('يرجى إدخال رقم الجوال للتواصل');
      return;
    }

    if (!selectedSubjectId) {
      toast.error('يرجى اختيار مادتك الدراسية الأساسية');
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await completeProfile({
        name: cleanName,
        phone: cleanPhone,
        subjectId: selectedSubjectId,
      });

      toast.success(`أهلاً بك أستاذ ${updatedUser.name}! تم تفعيل حسابك بنجاح 🎉`);
      router.replace('/dashboard/teacher');
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingSubjects) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-blue-200 text-sm font-bold">جاري تحميل بيانات التسجيل...</p>
        </div>
      </div>
    );
  }

  const selectedSubject = subjects.find((s) => s._id === selectedSubjectId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl">
        {/* Top Branding Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/15 text-white shadow-2xl mb-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-3xl shadow-lg mx-auto">
            👨‍🏫
          </div>
          <div>
            <span className="inline-block bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-bold mb-2">
              تسجيل حساب معلم جديد عبر Google
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              استكمال بيانات الملف الشخصي
            </h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              أهلاً بك في منصة إدارة الجداول المدرسية! يرجى إدخال اسمك ورقم هاتفك واختيار مادتك الدراسية للبدء.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Google Email Pill */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span className="text-slate-500 font-semibold block text-[11px]">حساب Google المرتبط:</span>
                  <span className="font-bold text-slate-800 font-mono text-xs">{user?.email}</span>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                ✓ متصل
              </span>
            </div>

            {/* Inputs Grid: Name and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Teacher Name */}
              <div>
                <label className="block text-xs font-black text-gray-800 mb-1.5">
                  الاسم الكامل للمعلم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="مثال: مصطفى محمود أحمد"
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-900"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-black text-gray-800 mb-1.5">
                  رقم الجوال للتواصل <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="مثال: 0501234567"
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all font-bold text-gray-900"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Subject Selection (The 11 required subjects) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-gray-800">
                  اختر مادتك الدراسية الأساسية <span className="text-red-500">*</span>
                </label>
                {selectedSubject && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                    تم اختيار: {selectedSubject.name}
                  </span>
                )}
              </div>

              {/* Interactive Subject Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto p-1 scrollbar-thin">
                {subjects.map((sub) => {
                  const isSelected = selectedSubjectId === sub._id;
                  const icon = SUBJECT_ICONS[sub.name] || '📖';

                  return (
                    <button
                      type="button"
                      key={sub._id}
                      onClick={() => setSelectedSubjectId(sub._id)}
                      className={`p-3 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{icon}</span>
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: sub.color || '#3b82f6' }}
                        />
                      </div>
                      <div>
                        <span className={`block font-black text-sm ${isSelected ? 'text-blue-950' : 'text-gray-900'}`}>
                          {sub.name}
                        </span>
                        {sub.nameEn && (
                          <span className="text-[10px] text-gray-500 block truncate font-medium">
                            {sub.nameEn}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={logout}
                className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
              >
                تسجيل الخروج والإلغاء
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>جاري تفعيل الحساب...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>حفظ وتفعيل الحساب والدخول</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
