"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { timetableTemplatesService } from "@/services/timetableTemplates.service";
import { useToast } from "@/contexts/ToastContext";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const COMMON_CLASSES = [
  "أول أول",
  "أول ثاني",
  "أول ثالث",
  "ثاني أول",
  "ثاني ثاني",
  "ثاني ثالث",
  "ثالث أول",
  "ثالث ثاني",
  "ثالث ثالث",
];

export default function TemplateEntriesEditorModal({
  isOpen,
  onClose,
  template,
  subjects = [],
  onSaved,
}) {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Active cell for mini-editor popup
  const [activeCell, setActiveCell] = useState(null); // { day, period }
  const [cellForm, setCellForm] = useState({ className: "", subject: "", room: "" });

  useEffect(() => {
    if (!isOpen || !template?._id) return;
    setActiveCell(null);
    loadFullTemplate();
  }, [isOpen, template?._id]);

  const loadFullTemplate = async () => {
    setLoadingDetail(true);
    try {
      const res = await timetableTemplatesService.getById(template._id);
      const rawEntries = res.data?.entries || [];
      setEntries(
        rawEntries.map((e) => ({
          day: e.day,
          period: Number(e.period),
          subject: e.subject?._id || e.subject || "",
          className: e.className || "",
          room: e.room || "",
        }))
      );
    } catch {
      toast.error("فشل تحميل تفاصيل الجدول");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCellClick = (day, period) => {
    const existing = entries.find((e) => e.day === day && Number(e.period) === Number(period));
    const defaultSub = template?.subjects?.[0]?._id || template?.subjects?.[0] || subjects[0]?._id || "";
    if (existing) {
      setCellForm({
        className: existing.className || "",
        subject: existing.subject || defaultSub,
        room: existing.room || "",
      });
    } else {
      setCellForm({
        className: "",
        subject: defaultSub,
        room: "",
      });
    }
    setActiveCell({ day, period });
  };

  const handleApplyCell = () => {
    if (!activeCell) return;
    if (!cellForm.className.trim()) {
      toast.error("يرجى كتابة أو اختيار اسم الفصل");
      return;
    }

    const { day, period } = activeCell;
    const updated = entries.filter((e) => !(e.day === day && Number(e.period) === Number(period)));
    updated.push({
      day,
      period: Number(period),
      subject: cellForm.subject,
      className: cellForm.className.trim(),
      room: cellForm.room.trim(),
    });
    setEntries(updated);
    setActiveCell(null);
  };

  const handleClearCell = () => {
    if (!activeCell) return;
    const { day, period } = activeCell;
    setEntries(entries.filter((e) => !(e.day === day && Number(e.period) === Number(period))));
    setActiveCell(null);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await timetableTemplatesService.saveEntries(template._id, entries);
      toast.success("تم حفظ حصص الجدول بنجاح ✅");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل حفظ حصص الجدول");
    } finally {
      setSaving(false);
    }
  };

  const getSubjectById = (id) => subjects.find((s) => s._id === id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`✏️ تعديل حصص الجدول: ${template?.name || ""}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || loadingDetail}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>حفظ حصص الجدول ({entries.length} حصة)</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Helper Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-2 text-xs text-emerald-950 font-semibold">
          <span>💡 انقر على أي خلية في الجدول لإضافة الفصل والمادة والقاعة.</span>
          <span className="bg-emerald-200/70 text-emerald-900 px-2.5 py-1 rounded-lg font-black text-[11px] flex-shrink-0">
            {entries.length} حصة مسجلة
          </span>
        </div>

        {loadingDetail ? (
          <div className="py-16 text-center text-gray-400 text-sm">جاري تحميل بيانات الجدول...</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-xs">
            <table className="min-w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-xs font-bold">
                  <th className="py-2.5 px-3 border-e border-slate-700 w-24">الحصة</th>
                  {DAYS.map((d) => (
                    <th key={d} className="py-2.5 px-3 border-e border-slate-700 last:border-e-0 min-w-[120px]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs bg-white">
                {PERIODS.map((period) => (
                  <tr key={period} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-800 bg-slate-50 border-e border-gray-200">
                      الحصة {period}
                    </td>
                    {DAYS.map((day) => {
                      const entry = entries.find(
                        (e) => e.day === day && Number(e.period) === Number(period)
                      );
                      const subObj = entry ? getSubjectById(entry.subject) : null;
                      const isSelected = activeCell?.day === day && activeCell?.period === period;

                      return (
                        <td
                          key={day}
                          onClick={() => handleCellClick(day, period)}
                          className={`py-2 px-2 border-e border-gray-100 last:border-e-0 cursor-pointer transition-all ${
                            isSelected ? "ring-2 ring-blue-600 bg-blue-50/80" : ""
                          }`}
                        >
                          {entry ? (
                            <div
                              className="rounded-xl p-2 text-right transition-all hover:scale-[1.02] shadow-2xs space-y-1 border"
                              style={{
                                backgroundColor: (subObj?.color || "#3b82f6") + "12",
                                borderColor: (subObj?.color || "#3b82f6") + "35",
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-black text-slate-900 text-xs truncate">
                                  {entry.className}
                                </span>
                                {entry.room && (
                                  <span className="text-[9px] bg-white/80 px-1 rounded text-gray-600 font-bold">
                                    {entry.room}
                                  </span>
                                )}
                              </div>
                              <div
                                className="text-[10px] font-extrabold truncate"
                                style={{ color: subObj?.color || "#1e40af" }}
                              >
                                {subObj?.name || "مادة غير محددة"}
                              </div>
                            </div>
                          ) : (
                            <div className="h-12 border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-xl flex items-center justify-center text-gray-300 hover:text-emerald-600 font-black text-sm transition-all">
                              +
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cell Editor Panel */}
        {activeCell && (
          <div className="bg-blue-50/80 border-2 border-blue-300 rounded-2xl p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-950">
                تعديل: يوم {activeCell.day} — الحصة {activeCell.period}
              </span>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="text-xs text-gray-500 hover:text-gray-800 font-bold cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            {/* Quick Class Pills */}
            <div>
              <span className="text-[11px] font-bold text-gray-600 block mb-1">
                اختيار سريع للفصل:
              </span>
              <div className="flex flex-wrap gap-1">
                {COMMON_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setCellForm({ ...cellForm, className: cls })}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      cellForm.className === cls
                        ? "bg-blue-700 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  اسم الفصل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cellForm.className}
                  onChange={(e) => setCellForm({ ...cellForm, className: e.target.value })}
                  placeholder="مثال: أول أول"
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  المادة الدراسية
                </label>
                <select
                  value={cellForm.subject}
                  onChange={(e) => setCellForm({ ...cellForm, subject: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- اختر المادة --</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  القاعة / المعمل (اختياري)
                </label>
                <input
                  type="text"
                  value={cellForm.room}
                  onChange={(e) => setCellForm({ ...cellForm, room: e.target.value })}
                  placeholder="مثال: معمل 1"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleClearCell}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                🗑️ تفريغ هذه الحصة
              </button>
              <button
                type="button"
                onClick={handleApplyCell}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-black rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                ✓ تطبيق على الحصة
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
