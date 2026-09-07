"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { timetableTemplatesService } from "@/services/timetableTemplates.service";
import { weeksService } from "@/services/schedules.service";
import { useToast } from "@/contexts/ToastContext";

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function AvailableTimetablesModal({
  isOpen,
  onClose,
  onClaimed,
}) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDetail, setTemplateDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [step, setStep] = useState("list"); // "list" | "preview" | "confirm"

  useEffect(() => {
    if (!isOpen) return;
    setStep("list");
    setSelectedTemplate(null);
    setTemplateDetail(null);
    fetchData();
  }, [isOpen]);

  const fetchData = async () => {
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

  const handlePreview = async (template) => {
    setSelectedTemplate(template);
    setStep("preview");
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
      const res = await timetableTemplatesService.claim(
        selectedTemplate._id,
        selectedWeekId || undefined,
      );
      toast.success(res.message || "تم اختيار الجدول بنجاح ✅");
      if (onClaimed) onClaimed(res.data);
      if (onClose) onClose();
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

  const renderGrid = (entries) => {
    const periods = [1, 2, 3, 4, 5, 6, 7, 8].filter((p) =>
      entries.some((e) => e.period === p),
    );
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-xs text-center">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 font-bold text-gray-600 border-b border-gray-100">
                الحصة
              </th>
              {DAY_NAMES.map((d) => (
                <th
                  key={d}
                  className="px-3 py-2 font-bold text-gray-600 border-b border-gray-100"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr
                key={period}
                className="border-t border-gray-50 hover:bg-gray-50/50"
              >
                <td className="px-3 py-2 font-black text-gray-800">
                  الحصة {period}
                </td>
                {DAY_NAMES.map((day) => {
                  const entry = entries.find(
                    (e) => e.day === day && e.period === period,
                  );
                  return (
                    <td key={day} className="px-2 py-2">
                      {entry ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5 space-y-0.5">
                          <div className="font-bold text-blue-900 text-[11px]">
                            {entry.subject?.name || "—"}
                          </div>
                          {entry.className && (
                            <div className="text-[10px] text-blue-600 font-medium">
                              {entry.className}
                            </div>
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

  const title =
    step === "preview" && selectedTemplate
      ? `📋 معاينة: ${selectedTemplate.name}`
      : "📋 الجداول المتاحة للاختيار";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={
              step === "preview"
                ? () => {
                    setStep("list");
                    setSelectedTemplate(null);
                    setTemplateDetail(null);
                  }
                : onClose
            }
            className="px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {step === "preview" ? "← رجوع للقائمة" : "إغلاق"}
          </button>
          {step === "preview" && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {claiming ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>جاري الاختيار...</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>اختيار هذا الجدول وربطه بحسابي</span>
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      {step === "list" ? (
        <div className="space-y-4">
          {/* Week selector */}
          {weeks.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">
                الأسبوع الذي ستبدأ فيه:
              </label>
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {weeks.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              جاري التحميل...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="text-4xl">📭</div>
              <p className="font-bold text-gray-700">
                لا توجد جداول متاحة حالياً
              </p>
              <p className="text-xs text-gray-400">
                ستظهر هنا الجداول التي تُعدّها الإدارة للمعلمين الجدد
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => handlePreview(t)}
                  className="text-right bg-white border-2 border-emerald-100 hover:border-emerald-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer space-y-2 w-full"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        🟢 متاح
                      </span>
                      <h4 className="font-black text-gray-900 mt-1 text-sm">
                        {t.name}
                      </h4>
                    </div>
                    <span className="bg-blue-50 text-blue-800 border border-blue-100 text-xs font-black px-2.5 py-1 rounded-xl flex-shrink-0">
                      {t.entries?.length || 0} حصة
                    </span>
                  </div>
                  {t.subjects?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {t.subjects.map((s) => (
                        <span
                          key={s._id}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-blue-600 font-bold">
                    انقر للمعاينة واختيار الجدول ←
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Template info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-black text-gray-900 text-base">
                {selectedTemplate?.name}
              </h3>
              {selectedTemplate?.subjects?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.subjects.map((s) => (
                    <span
                      key={s._id}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-emerald-800"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="bg-emerald-100 text-emerald-800 font-black text-sm px-3 py-1.5 rounded-xl flex-shrink-0">
              {templateDetail?.entries?.length || 0} حصة
            </span>
          </div>

          {templateDetail ? (
            renderGrid(templateDetail.entries || [])
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              جاري تحميل تفاصيل الجدول...
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-medium">
            <span className="font-black">💡 ملاحظة:</span> سيتم ربط هذا الجدول
            بحسابك وإنشاء الحصص في الأسبوع المحدد. يمكنك تعديل التفاصيل (عنوان
            الدرس والواجبات) بعد الاختيار.
          </div>
        </div>
      )}
    </Modal>
  );
}
