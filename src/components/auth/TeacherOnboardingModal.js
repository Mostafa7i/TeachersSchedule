"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { subjectsService } from "@/services/subjects.service";
import { timetableTemplatesService } from "@/services/timetableTemplates.service";
import { weeksService } from "@/services/schedules.service";
import { useToast } from "@/contexts/ToastContext";

export default function TeacherOnboardingModal({ isOpen, onClose, onComplete }) {
  const { completeProfile, refetchUser } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("templates"); // "templates" | "manual"
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDetail, setTemplateDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const init = async () => {
      setLoading(true);
      try {
        const [subjectsRes, templatesRes, weeksRes] = await Promise.all([
          subjectsService.getAll({ isActive: true }),
          timetableTemplatesService.getAll(),
          weeksService.getAll(),
        ]);
        setSubjects(subjectsRes.data || []);
        setTemplates(templatesRes.data || []);
        const wks = weeksRes.data || [];
        setWeeks(wks);
        if (wks.length > 0) setSelectedWeekId(wks[0]._id);
      } catch {
        toast.error("فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isOpen]);

  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    setTemplateDetail(null);
    try {
      const res = await timetableTemplatesService.getById(template._id);
      setTemplateDetail(res.data);
    } catch {
      toast.error("فشل تحميل تفاصيل الجدول");
    }
  };

  const handleClaimTemplate = async () => {
    if (!selectedTemplate) return;
    setClaiming(true);
    try {
      const res = await timetableTemplatesService.claim(selectedTemplate._id, selectedWeekId || undefined);
      toast.success(res.message || "تم اختيار الجدول بنجاح ✅");
      try {
        await refetchUser();
      } catch {}
      if (onComplete) onComplete(res.data);
      if (onClose) onClose();
      // Reload page to display new timetable directly
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل اختيار الجدول");
    } finally {
      setClaiming(false);
    }
  };

  const handleManualSave = async () => {
    if (selectedSubjects.length === 0) {
      toast.error("يرجى اختيار مادة واحدة على الأقل");
      return;
    }
    setSaving(true);
    try {
      await completeProfile({ subjects: selectedSubjects });
      toast.success("تم حفظ التخصصات بنجاح ✅");
      try {
        await refetchUser();
      } catch {}
      if (onComplete) onComplete();
      if (onClose) onClose();
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل حفظ بيانات الملف الشخصي");
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (id) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="👋 مرحباً! إعداد ملفك المهني"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose || (() => {})}
            className="px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          {activeTab === "templates" ? (
            <button
              type="button"
              onClick={handleClaimTemplate}
              disabled={!selectedTemplate || claiming}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {claiming
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /><span>جاري الاختيار...</span></>
                : <><span>✅</span><span>اختيار هذا الجدول والبدء</span></>
              }
            </button>
          ) : (
            <button
              type="button"
              onClick={handleManualSave}
              disabled={selectedSubjects.length === 0 || saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {saving
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /><span>جاري الحفظ...</span></>
                : <><span>💾</span><span>حفظ التخصصات</span></>
              }
            </button>
          )}
        </div>
      }
    >
      {/* Intro */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 mb-4">
        <p className="text-sm font-bold text-blue-900">
          أهلاً بك! لاستخدام النظام، اختر الجدول الذي أعدّته لك الإدارة، أو حدد مواد تدريسك يدوياً.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
        {[
          { id: "templates", label: "📋 اختيار جدول جاهز", desc: `(${templates.length} متاح)` },
          { id: "manual", label: "📝 تحديد المواد يدوياً", desc: "" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${activeTab === tab.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab.label} <span className="text-gray-400 font-medium">{tab.desc}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">جاري التحميل...</div>
      ) : activeTab === "templates" ? (
        <div className="space-y-3">
          {/* Week selector */}
          {weeks.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">ابدأ من أسبوع:</label>
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {weeks.map((w) => (
                  <option key={w._id} value={w._id}>{w.label}</option>
                ))}
              </select>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-2xl space-y-2">
              <div className="text-3xl">📭</div>
              <p className="font-bold text-gray-700 text-sm">لا توجد جداول متاحة حالياً</p>
              <p className="text-xs text-gray-400">تواصل مع الإدارة أو استخدم خيار "تحديد المواد يدوياً"</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {templates.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => handleSelectTemplate(t)}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTemplate?._id === t._id ? "bg-emerald-50 border-emerald-400 shadow-sm" : "bg-white border-gray-100 hover:border-emerald-200"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-black text-gray-900 text-sm">{t.name}</p>
                      {t.subjects?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.subjects.map((s) => (
                            <span key={s._id} className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                        {t.entries?.length || 0} حصة
                      </span>
                      {selectedTemplate?._id === t._id && (
                        <span className="text-emerald-600 text-lg">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedTemplate && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 font-medium">
              ✅ اخترت: <span className="font-black">{selectedTemplate.name}</span> — اضغط "اختيار هذا الجدول والبدء" للتأكيد.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium">اختر المواد الدراسية التي تدرّسها:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto scrollbar-thin">
            {subjects.map((s) => {
              const isSelected = selectedSubjects.includes(s._id);
              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => toggleSubject(s._id)}
                  style={isSelected ? { backgroundColor: (s.color || "#3b82f6") + "20", borderColor: s.color || "#3b82f6" } : {}}
                  className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${isSelected ? "border-current shadow-sm" : "border-gray-100 bg-white hover:border-gray-300"}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || "#3b82f6" }} />
                    <div>
                      <p className={`text-xs font-black ${isSelected ? "text-gray-900" : "text-gray-700"}`}>{s.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{s.code}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedSubjects.length > 0 && (
            <p className="text-xs text-blue-700 font-bold">✅ اخترت {selectedSubjects.length} مادة</p>
          )}
        </div>
      )}
    </Modal>
  );
}
