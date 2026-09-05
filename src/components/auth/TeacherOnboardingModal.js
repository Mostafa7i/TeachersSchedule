"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { subjectsService } from "@/services/subjects.service";
import Modal from "@/components/ui/Modal";

const SUBJECT_ICONS = {
  فنية: "🎨",
  رياضيات: "📐",
  رقمية: "💻",
  توحيد: "🕋",
  English: "🇬🇧",
  لغتي: "📖",
  بدنية: "⚽",
  تفسير: "📜",
  اجتماعيات: "🌍",
  حديث: "💬",
  علوم: "🔬",
};

export default function TeacherOnboardingModal({ isOpen, onComplete }) {
  const { user, completeProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Prefill name from user
  useEffect(() => {
    if (user) {
      if (user.name && user.name !== "معلم جديد") {
        setName(user.name);
      }
      if (user.phone) setPhone(user.phone);
      if (Array.isArray(user.subjects) && user.subjects.length > 0) {
        setSelectedSubjectIds(
          user.subjects.map((s) => (typeof s === "object" ? s._id : s)),
        );
      }
    }
  }, [user]);

  // Load available subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const res = await subjectsService.getAll({ isActive: true });
        const list = res.data || [];
        setSubjects(list);
      } catch (err) {
        console.error("Error fetching subjects:", err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    if (isOpen) {
      fetchSubjects();
    }
  }, [isOpen]);

  const toggleSubject = (subId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId)
        ? prev.filter((id) => id !== subId)
        : [...prev, subId],
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const cleanName = name.trim();

    if (!cleanName) {
      toast.error("يرجى كتابة اسمك الكريم لاستخدامه في النظام");
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast.error(
        "يرجى اختيار مادة دراسية واحدة على الأقل من المواد التي تدرسها",
      );
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await completeProfile({
        name: cleanName,
        phone: phone.trim(),
        subjectIds: selectedSubjectIds,
      });

      toast.success(`أهلاً بك أ. ${updatedUser.name}! تم حفظ بياناتك بنجاح 🎉`);
      if (onComplete) {
        onComplete(updatedUser);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ البيانات";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-gray-100 overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="text-center pb-4 border-b border-gray-100 space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl text-white mx-auto shadow-md shadow-blue-500/20">
            👨‍🏫
          </div>
          <h2 className="text-xl font-black text-gray-900">
            مرحباً بك يا معلم! أكمل بياناتك للبدء
          </h2>
          <p className="text-xs text-gray-500 font-medium max-w-md mx-auto">
            خطوة إجبارية واحدة لتخصيص جدولك الدراسي وتحديد المواد التي تدرسها في
            المدرسة.
          </p>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto py-4 space-y-5 flex-1 pe-1"
        >
          {/* Email Info */}
          {user?.email && (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-700 font-bold">الحساب:</span>
                <span className="text-xs font-mono font-bold text-blue-950">
                  {user.email}
                </span>
              </div>
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                ✓ متصل عبر Google
              </span>
            </div>
          )}

          {/* Teacher Name */}
          <div>
            <label className="block text-xs font-black text-gray-800 mb-1.5">
              اسمك الكامل (الذي سيظهر في الجداول والخطط){" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أ. محمد عبدالمحسن العتيبي"
              required
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-bold text-gray-900"
            />
          </div>

          {/* Subjects Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-gray-800">
                المواد التي تدرسها (يمكنك اختيار أكثر من مادة){" "}
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                تم اختيار {selectedSubjectIds.length} مواد
              </span>
            </div>

            {loadingSubjects ? (
              <div className="p-6 text-center text-xs text-gray-400 font-bold animate-pulse">
                جاري تحميل المواد الدراسية...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto p-1">
                {subjects.map((sub) => {
                  const isSelected = selectedSubjectIds.includes(sub._id);
                  const icon = SUBJECT_ICONS[sub.name] || "📖";

                  return (
                    <button
                      type="button"
                      key={sub._id}
                      onClick={() => toggleSubject(sub._id)}
                      className={`p-2.5 rounded-xl border-2 text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/80 text-blue-950 font-black shadow-xs ring-2 ring-blue-400/20"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-lg">{icon}</span>
                        <span className="text-xs truncate">{sub.name}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 text-[10px] ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected ? "✓" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Phone */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رقم الجوال (اختياري للتواصل وإشعارات الجدول)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
              dir="ltr"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting || selectedSubjectIds.length === 0 || !name.trim()
            }
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>تأكيد وحفظ والبدء في الجدول 🚀</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
