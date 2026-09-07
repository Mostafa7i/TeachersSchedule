"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { timetableTemplatesService } from "@/services/timetableTemplates.service";
import { weeksService } from "@/services/schedules.service";

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function TeacherAvailableTimetablesPage() {
  const { refetchUser } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDetail, setTemplateDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [templatesRes, weeksRes] = await Promise.all([
          timetableTemplatesService.getAll(),
          weeksService.getAll(),
        ]);
        setTemplates(templatesRes.data || []);
        const wks = weeksRes.data || [];
        setWeeks(wks);
        if (wks.length > 0) setSelectedWeekId(wks[0]._id);
      } catch {
        toast.error("فشل تحميل الجداول المتاحة");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSelect = async (template) => {
    setSelectedTemplate(template);
    setTemplateDetail(null);
    try {
      const res = await timetableTemplatesService.getById(template._id);
      setTemplateDetail(res.data);
    } catch {
      toast.error("فشل تحميل تفاصيل الجدول");
    }
  };

  const handleClaim = async () => {
    if (!selectedTemplate) return;
    setClaiming(true);
    try {
      const res = await timetableTemplatesService.claim(selectedTemplate._id, selectedWeekId || undefined);
      toast.success(res.message || "تم اختيار الجدول بنجاح ✅");
      await refetchUser();
      setTemplates((prev) => prev.filter((t) => t._id !== selectedTemplate._id));
      setSelectedTemplate(null);
      setTemplateDetail(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل اختيار الجدول");
    } finally {
      setClaiming(false);
    }
  };

  const renderGrid = (entries) => {
    const periods = [1, 2, 3, 4, 5, 6, 7, 8].filter((p) =>
      entries.some((e) => e.period === p)
    );
    return (
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="min-w-full text-xs text-center">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2.5 font-bold text-gray-600 border-b">الحصة</th>
              {DAY_NAMES.map((d) => (
                <th key={d} className="px-3 py-2.5 font-bold text-gray-600 border-b">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-3 py-2 font-black text-gray-800 bg-gray-50">الحصة {period}</td>
                {DAY_NAMES.map((day) => {
                  const entry = entries.find((e) => e.day === day && e.period === period);
                  return (
                    <td key={day} className="px-2 py-2">
                      {entry ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-2 py-2 space-y-0.5">
                          <div className="font-bold text-blue-900">{entry.subject?.name || "—"}</div>
                          {entry.className && (
                            <div className="text-[10px] text-blue-600 font-medium">{entry.className}</div>
                          )}
                          {entry.room && (
                            <div className="text-[10px] text-gray-500">{entry.room}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">جاري تحميل الجداول المتاحة...</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">📋 الجداول المتاحة للاختيار</h1>
        <p className="text-gray-500 text-sm mt-1">
          اختر الجدول الذي أعدّته لك الإدارة وابدأ باستخدامه فوراً.
        </p>
      </div>

      {templates.length === 0 && !selectedTemplate ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center space-y-3">
          <div className="text-5xl">📭</div>
          <h3 className="font-black text-gray-800 text-lg">لا توجد جداول متاحة حالياً</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            ستظهر هنا الجداول التي تُعدّها إدارة المدرسة للمعلمين الجدد.
            تواصل مع الإدارة إذا كنت تنتظر تعيين جدولك.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: template list */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-gray-700">الجداول المتاحة ({templates.length})</h2>
            {weeks.length > 0 && (
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">الأسبوع الذي ستبدأ فيه:</label>
                <select
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {weeks.map((w) => (
                    <option key={w._id} value={w._id}>{w.label}</option>
                  ))}
                </select>
              </div>
            )}
            {templates.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => handleSelect(t)}
                className={`w-full text-right bg-white border-2 rounded-2xl p-4 transition-all cursor-pointer space-y-2 ${selectedTemplate?._id === t._id ? "border-emerald-500 shadow-md shadow-emerald-100" : "border-gray-100 hover:border-emerald-300 hover:shadow-sm"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-black text-gray-900 text-sm">{t.name}</h4>
                  <span className="bg-blue-50 text-blue-800 border border-blue-100 text-[11px] font-black px-2 py-0.5 rounded-lg flex-shrink-0">
                    {t.entries?.length || 0} حصة
                  </span>
                </div>
                {t.subjects?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.subjects.map((s) => (
                      <span key={s._id} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Right: preview + claim */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">{selectedTemplate.name}</h3>
                    {selectedTemplate.subjects?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTemplate.subjects.map((s) => (
                          <span key={s._id} className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={claiming}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer flex-shrink-0"
                  >
                    {claiming ? (
                      <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /><span>جاري الاختيار...</span></>
                    ) : (
                      <><span>✅</span><span>اختيار هذا الجدول</span></>
                    )}
                  </button>
                </div>

                {templateDetail ? (
                  renderGrid(templateDetail.entries || [])
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">جاري تحميل التفاصيل...</div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-medium">
                  <span className="font-black">⚠️ ملاحظة:</span> بعد اختيار الجدول لن يظهر للمعلمين الآخرين.
                  يمكنك تعديل تفاصيل الحصص (عنوان الدرس، الواجبات) من خلال لوحة التحكم الرئيسية.
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400 space-y-2">
                <div className="text-4xl">👈</div>
                <p className="font-bold text-sm">اختر جدولاً من القائمة لمعاينته</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
