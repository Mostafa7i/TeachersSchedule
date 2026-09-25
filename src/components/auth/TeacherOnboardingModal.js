"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { subjectsService } from "@/services/subjects.service";
import { timetableTemplatesService } from "@/services/timetableTemplates.service";
import { weeksService } from "@/services/schedules.service";
import { useToast } from "@/contexts/ToastContext";
import {
  User,
  Calendar,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Search,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function TeacherOnboardingModal({ isOpen, onClose, onComplete }) {
  const { user, completeProfile, updateProfile } = useAuth();
  const toast = useToast();

  // Multi-step state: 1 | 2
  const [step, setStep] = useState(1);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(null); // null = no template chosen / manual
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Data states
  const [subjects, setSubjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize data
  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    if (user?.name && user.name !== "معلم جديد") {
      setName(user.name);
    }
    if (user?.phone) {
      setPhone(user.phone);
    }

    const initData = async () => {
      setLoading(true);
      try {
        const [subjectsRes, templatesRes, currWeekRes, weeksRes] = await Promise.all([
          subjectsService.getAll({ isActive: true }),
          timetableTemplatesService.getAll(),
          weeksService.getCurrent(),
          weeksService.getAll(),
        ]);

        const allSubjects = subjectsRes.data || [];
        setSubjects(allSubjects);
        setTemplates(templatesRes.data || []);

        const allWeeks = weeksRes.data || [];
        setWeeks(allWeeks);

        // Auto-select latest / current week
        const activeWk = currWeekRes.data || allWeeks[0] || null;
        setCurrentWeek(activeWk);
        if (activeWk?._id) {
          setSelectedWeekId(activeWk._id);
        }

        // If user already has some subjects, pre-select them
        if (Array.isArray(user?.subjects) && user.subjects.length > 0) {
          const userSubIds = user.subjects.map((s) => (typeof s === "object" ? s._id : s));
          setSelectedSubjectIds(userSubIds);
        }
      } catch (err) {
        console.error("Failed to load onboarding data:", err);
        toast.error("تعذر تحميل البيانات الأولية");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [isOpen, user]);

  // When a template is clicked in Step 1, auto-select its subjects for Step 2
  const handleSelectTemplate = (template) => {
    if (selectedTemplateId === template._id) {
      // Toggle off
      setSelectedTemplateId(null);
    } else {
      setSelectedTemplateId(template._id);

      // Auto-extract subjects from template and check them
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

  // Filtered subjects for search in Step 2
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

  // Validation for Step 1
  const handleNextStep = () => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      toast.error("يرجى كتابة اسمك الكامل أولاً للمتابعة");
      return;
    }
    setStep(2);
  };

  // Final Submit on Step 2
  const handleFinalSubmit = async () => {
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
      // 1. Claim template if chosen in Step 1
      if (selectedTemplateId) {
        try {
          await timetableTemplatesService.claim(selectedTemplateId, selectedWeekId || undefined);
        } catch (claimErr) {
          console.warn("Template claim notice:", claimErr);
        }
      }

      // 2. Complete/update profile
      await completeProfile({
        name: cleanName,
        phone: phone.trim(),
        subjectIds: selectedSubjectIds,
      });

      toast.success(`أهلاً بك أ. ${cleanName}! تم إعداد ملفك المهني بنجاح 🎉`);

      if (onComplete) {
        onComplete();
      }
      if (onClose) {
        onClose();
      }

      // Refresh to load assigned schedules smoothly
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      console.error("Error completing profile:", err);
      toast.error(err.response?.data?.message || "حدث خطأ أثناء حفظ الملف المهني");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      size="xl"
      title={
        <div className="flex items-center gap-2 text-slate-900 font-black text-base sm:text-lg">
          <span className="p-1.5 rounded-xl bg-blue-100 text-blue-700">👨‍🏫</span>
          <span>إعداد ملفك المهني</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
              <span>السابق</span>
            </button>
          ) : (
            <div className="text-xs text-slate-400 font-medium">الخطوة 1 من 2</div>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>التالي: اختيار المواد</span>
              <ChevronLeft size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting || selectedSubjectIds.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>حفظ وإنهاء الإعداد</span>
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5" dir="rtl">
        {/* ── Visual Step Indicator ── */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${
              step === 1
                ? "bg-white text-blue-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
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
              step === 2
                ? "bg-white text-blue-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 2 ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-700"
              }`}
            >
              2
            </span>
            <span>المواد الدراسية</span>
          </button>
        </div>

        {/* ── STEP 1: Name & Schedule ── */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Teacher Name Input */}
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
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-xs"
                />
                <User size={18} className="absolute right-3.5 top-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                سيظهر هذا الاسم رسمياً في الجداول المدرسية ودفاتر التحضير.
              </p>
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

            {/* Available Timetables Section */}
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

              {loading ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  جاري فحص الجداول المتاحة...
                </div>
              ) : templates.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {/* Option: Skip Template */}
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

                  {/* List of Available Templates */}
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
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-500 text-xs font-medium space-y-1">
                  <p className="font-bold text-slate-700">لا توجد جداول شاغرة جاهزة حالياً</p>
                  <p className="text-[11px]">
                    لا مشكلة! اضغط على <strong>التالي</strong> لتحديد موادك والبدء فوراً.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Subjects Selection ── */}
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

            {/* Search Input if many subjects */}
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

            {/* Selected Count Badge */}
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
                  : "لم يتم تحديد أي مادة بعد"}
              </span>
            </div>

            {/* Subjects Grid (2 columns on mobile, 3 on desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
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
          </div>
        )}
      </div>
    </Modal>
  );
}
