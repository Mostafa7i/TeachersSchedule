"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { timetableTemplatesService } from "@/services/timetableTemplates.service";
import { useToast } from "@/contexts/ToastContext";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

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
  const [cellForm, setCellForm] = useState({
    className: "",
    subject: "",
    room: "",
  });

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
        })),
      );
    } catch {
      toast.error("فشل تحميل تفاصيل الجدول");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCellClick = (day, period) => {
    const existing = entries.find(
      (e) => e.day === day && Number(e.period) === Number(period),
    );
    const defaultSub =
      template?.subjects?.[0]?._id ||
      template?.subjects?.[0] ||
      subjects[0]?._id ||
      "";
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
    const updated = entries.filter(
      (e) => !(e.day === day && Number(e.period) === Number(period)),
    );
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
    setEntries(
      entries.filter(
        (e) => !(e.day === day && Number(e.period) === Number(period)),
      ),
    );
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

  const getSubject = (id) => subjects.find((s) => s._id === id);

  const existingClasses = [
    ...new Set(entries.map((e) => (e.className || "").trim()).filter(Boolean)),
  ].sort();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📅 تحرير وتوزيع حصص الجدول الشاغر: ${template?.name || ""}`}
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs font-bold text-gray-500">
            عدد الحصص المسندة:{" "}
            <span className="text-blue-700 font-black">{entries.length}</span>{" "}
            حصة
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || loadingDetail}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>حفظ تعديلات الجدول بالكامل</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Helper Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between gap-2">
          <span>
            💡 <strong>طريقة التعديل:</strong> اضغط على أي خانة لإسناد الفصل
            والمادة، أو اضغط على حصة مسجلة لتعديلها أو حذفها.
          </span>
          <button
            type="button"
            // onClick={handleClearAll}
            className="text-[11px] font-bold text-red-600 hover:text-red-800 underline flex-shrink-0 cursor-pointer"
          >
            تفريغ الجدول بالكامل
          </button>
        </div>

        {/* Timetable Grid View */}
        {loadingDetail ? (
          <div className="py-16 text-center">
            <span className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-xs font-bold text-gray-500 mt-2">
              جاري تحميل بيانات الحصص...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-black">
                  <th className="p-2.5 border-b border-slate-800 w-24">
                    اليوم / الحصة
                  </th>
                  {PERIODS.map((p) => (
                    <th
                      key={p}
                      className="p-2.5 border-b border-r border-slate-800 text-xs"
                    >
                      الحصة {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {DAYS.map((day) => (
                  <tr key={day} className="hover:bg-gray-50/50">
                    <td className="p-2.5 font-bold text-xs bg-slate-50 text-slate-800 border-l border-gray-200">
                      {day}
                    </td>
                    {PERIODS.map((period) => {
                      const entry = entries.find(
                        (e) =>
                          e.day === day && Number(e.period) === Number(period),
                      );
                      const isSelected =
                        activeCell?.day === day &&
                        Number(activeCell?.period) === Number(period);
                      const subObj = getSubject(entry?.subject);

                      return (
                        <td
                          key={period}
                          onClick={() => handleCellClick(day, period)}
                          className={`p-1.5 border-r border-gray-200 cursor-pointer transition-all ${
                            isSelected
                              ? "ring-2 ring-blue-500 bg-blue-50/80"
                              : entry
                                ? "bg-slate-50 hover:bg-blue-50/40"
                                : "hover:bg-gray-100/60"
                          }`}
                        >
                          {entry ? (
                            <div className="rounded-xl p-1.5 border border-slate-200 shadow-2xs space-y-0.5 text-right">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-black text-gray-900 truncate">
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
                            <div className="h-10 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-300 hover:text-emerald-500 hover:border-emerald-300 font-black text-sm transition-all">
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

            {/* Quick Class Pills (if existing) */}
            {existingClasses.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-gray-600 block mb-1">
                  اختيار من الفصول المضافة:
                </span>
                <div className="flex flex-wrap gap-1">
                  {existingClasses.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() =>
                        setCellForm({ ...cellForm, className: cls })
                      }
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
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  اسم الفصل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cellForm.className}
                  onChange={(e) =>
                    setCellForm({ ...cellForm, className: e.target.value })
                  }
                  placeholder="مثال: أول/1 أو 2/أ"
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
                  onChange={(e) =>
                    setCellForm({ ...cellForm, subject: e.target.value })
                  }
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
                  onChange={(e) =>
                    setCellForm({ ...cellForm, room: e.target.value })
                  }
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
