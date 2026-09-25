"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { subjectsService } from "@/services/subjects.service";
import { timetableTemplatesService } from "@/services/timetableTemplates.service";
import { weeksService } from "@/services/schedules.service";
import {
  User,
  Calendar,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Search,
  Sparkles,
} from "lucide-react";

export default function CompleteProfilePage() {
  const { user, loading: authLoading, completeProfile } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // Multi-step state: 1 | 2
  const [step, setStep] = useState(1);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Data states
  const [subjects, setSubjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Initialize data and redirect if already complete
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.isProfileComplete && user.subjects && user.subjects.length > 0) {
        router.replace(
          user.role?.isSystem ? "/dashboard/admin" : "/dashboard/teacher"
        );
        return;
      }
      if (user.name && user.name !== "معلم جديد") setName(user.name);
      if (user.phone) setPhone(user.phone);
      if (Array.isArray(user.subjects) && user.subjects.length > 0) {
        setSelectedSubjectIds(
          user.subjects.map((s) => (typeof s === "object" ? s._id : s))
        );
      }
    }
  }, [user, authLoading, router]);

  // Load all metadata
  useEffect(() => {
    const fetchInit = async () => {
      try {
        setLoading(true);
        const [subjectsRes, templatesRes, currWeekRes, weeksRes] = await Promise.all([
          subjectsService.getAll({ isActive: true }),
          timetableTemplatesService.getAll(),
          weeksService.getCurrent(),
          weeksService.getAll(),
        ]);

        setSubjects(subjectsRes.data || []);
        setTemplates(templatesRes.data || []);

        const allWeeks = weeksRes.data || [];
        setWeeks(allWeeks);

        // Auto select current/latest week
        const activeWk = currWeekRes.data || allWeeks[0] || null;
        setCurrentWeek(activeWk);
        if (activeWk?._id) {
          setSelectedWeekId(activeWk._id);
        }
      } catch (err) {
        console.error("Error fetching setup data:", err);
        toast.error("تعذر تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };

    fetchInit();
  }, []);

  const handleSelectTemplate = (template) => {
    if (selectedTemplateId === template._id) {
      setSelectedTemplateId(null);
    } else {
      setSelectedTemplateId(template._id);

      if (Array.isArray(template.subjects) && template.subjects.length > 0) {
        const tSubIds = template.subjects
          .map((s) => (typeof s === "object" ? s._id : s))
          .filter(Boolean);
        if (tSubIds.length > 0) {
          setSelectedSubjectIds((prev) => Array.from(new Set([...prev, ...tSubIds])));
        }
      }
    }
  };

  const toggleSubject = (subId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const q = subjectSearch.trim().toLowerCase();
    return subjects.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.nameEn?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q)
    );
  }, [subjects, subjectSearch]);

  const handleNextStep = () => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      toast.error("يرجى كتابة اسمك الكامل أولاً للمتابعة");
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      setStep(1);
      toast.error("يرجى كتابة اسمك الكامل");
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast.error("يرجى اختيار مادة دراسية واحدة على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      if (selectedTemplateId) {
        try {
          await timetableTemplatesService.claim(selectedTemplateId, selectedWeekId || undefined);
        } catch (claimErr) {
          console.warn("Template claim notice:", claimErr);
        }
      }

      await completeProfile({
        name: cleanName,
        phone: phone.trim(),
        subjectIds: selectedSubjectIds,
      });

      toast.success(`أهلاً بك أ. ${cleanName}! تم إعداد حسابك بنجاح 🎉`);
      router.replace("/dashboard/teacher");
    } catch (err) {
      const msg = err.response?.data?.message || "حدث خطأ أثناء حفظ البيانات";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-blue-200 text-sm font-bold">جاري تحميل بيانات الإعداد...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="w-full max-w-xl">
        {/* Top Header Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/15 text-white shadow-2xl mb-5 text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-2xl shadow-lg mx-auto">
            👨‍🏫
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">إعداد ملفك المهني</h1>
            <p className="text-blue-200 text-xs sm:text-sm mt-0.5">
              خطوتان سريعتان لتهيئة جدولك وموادك الدراسية للبدء فوراً.
            </p>
          </div>
        </div>

        {/* Step Wizard Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-7 border border-gray-100 space-y-5">
          {/* Visual Step Indicator */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                step === 1 ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step === 1 ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-700"
                }`}
              >
                1
              </span>
              <span>الاسم والجدول</span>
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                step === 2 ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step === 2 ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-700"
                }`}
              >
                2
              </span>
              <span>المواد والتخصص</span>
            </button>
          </div>

          {/* STEP 1: Name & Schedule */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Connected Google Email */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">📧</span>
                  <div>
                    <span className="text-slate-500 text-[10px] block">الحساب المرتبط:</span>
                    <span className="font-bold text-slate-800 font-mono text-xs">{user?.email}</span>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  ✓ متصل
                </span>
              </div>

              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-black text-slate-800">
                  اسم المعلم الكامل <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اكتب اسمك الكامل (مثال: أ. محمد أحمد)"
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <User size={18} className="absolute right-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              {/* Auto-selected Week Banner */}
              <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <Calendar size={16} className="text-blue-600 shrink-0" />
                  <span>
                    الأسبوع المعتمد:{" "}
                    <strong className="text-blue-950 font-black">
                      {currentWeek?.label || "الأسبوع الحالي"}
                    </strong>
                  </span>
                </div>
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                  تلقائي ✓
                </span>
              </div>

              {/* Available Timetables */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <Layers size={16} className="text-indigo-600" />
                    <span>اختر جدولك المدرسي (إن وُجد):</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {templates.length > 0 ? `${templates.length} متاح` : "لا توجد جداول شاغرة"}
                  </span>
                </div>

                {templates.length > 0 ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {/* Skip Template Option */}
                    <div
                      onClick={() => setSelectedTemplateId(null)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedTemplateId === null
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">⚡</span>
                        <div>
                          <p className="font-bold text-xs">متابعة بدون جدول جاهز</p>
                          <p
                            className={`text-[10px] ${
                              selectedTemplateId === null ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            سأقوم بإدخال وتنسيق حصصي بنفسي لاحقاً
                          </p>
                        </div>
                      </div>
                      {selectedTemplateId === null && <CheckCircle2 size={16} className="text-emerald-400" />}
                    </div>

                    {templates.map((template) => {
                      const isSelected = selectedTemplateId === template._id;
                      const subNames = (template.subjects || [])
                        .map((s) => (typeof s === "object" ? s.name : s))
                        .join(" • ");

                      return (
                        <div
                          key={template._id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/40 text-emerald-950"
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg shrink-0">📋</span>
                            <div className="min-w-0">
                              <p className="font-black text-xs truncate">{template.name}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {subNames || "جدول عام"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                isSelected
                                  ? "bg-emerald-200 text-emerald-900"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              شاغر
                            </span>
                            {isSelected ? (
                              <CheckCircle2 size={18} className="text-emerald-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-300" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-500 text-xs font-medium">
                    لا توجد جداول شاغرة جاهزة حالياً — يمكنك المتابعة لتحديد موادك.
                  </div>
                )}
              </div>

              {/* Next Step Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <span>التالي: اختيار المواد</span>
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Subjects Selection */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs sm:text-sm font-black text-slate-800 mb-1">
                  حدد المواد التي تقوم بتدريسها <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 font-medium">
                  اختر مادة أو أكثر لتمكينك من كتابة خططها وتحضير دروسها.
                </p>
              </div>

              {/* Search */}
              {subjects.length > 6 && (
                <div className="relative">
                  <input
                    type="text"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="بحث سريع عن مادة..."
                    className="w-full pl-4 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                </div>
              )}

              {/* Selected Count */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">قائمة المواد الدراسية:</span>
                <span
                  className={`font-black text-[11px] px-2.5 py-0.5 rounded-full ${
                    selectedSubjectIds.length > 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedSubjectIds.length > 0
                    ? `تم تحديد (${selectedSubjectIds.length}) مادة`
                    : "لم يتم تحديد أي مادة"}
                </span>
              </div>

              {/* Subjects Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {filteredSubjects.map((sub) => {
                  const isSelected = selectedSubjectIds.includes(sub._id);
                  return (
                    <button
                      key={sub._id}
                      type="button"
                      onClick={() => toggleSubject(sub._id)}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 border-blue-500 ring-2 ring-blue-400/30 text-blue-950 shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-black text-xs sm:text-sm truncate">{sub.name}</p>
                        {sub.code && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sub.code}</p>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-blue-600 text-white" : "border border-slate-300"
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={14} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                  <span>السابق</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting || selectedSubjectIds.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>حفظ وإنهاء الإعداد ✅</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
