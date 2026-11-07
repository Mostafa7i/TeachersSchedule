"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { weeksService, schedulesService } from "@/services/schedules.service";
import { useToast } from "@/contexts/ToastContext";

/**
 * WeekManagerPanel – لوحة إدارة الأسابيع المدمجة في صفحة الجدول الأسبوعي
 * تتيح: إضافة، تعديل، حذف الأسابيع، ونسخ الحصص أو استيراد PDF فور إنشاء الأسبوع
 */
export default function WeekManagerPanel({
  weeks = [],
  currentWeek,
  onWeekCreated,   // (newWeek) => void
  onWeekUpdated,   // (updatedWeek) => void
  onWeekDeleted,   // (weekId) => void
  onSelectWeek,    // (week) => void
}) {
  const toast = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [weekToDelete, setWeekToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    weekNumber: 1,
    label: "",
    startDate: "",
    endDate: "",
    academicYear: "1447-1448هـ / 2026-2027م",
    isActive: true,
  });

  // Setup mode (only when creating new week)
  const [setupMode, setSetupMode] = useState("copy_prev"); // 'copy_prev' | 'empty'
  const [sourceWeekId, setSourceWeekId] = useState("");

  // ── helpers ──────────────────────────────────────────────
  const toLocalDate = (value, endOfDay = false) => {
    if (!value) return null;
    const dateOnly = String(value).slice(0, 10);
    const parts = dateOnly.split("-").map(Number);
    if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const [y, m, d] = parts;
    return new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  };

  const now = new Date();

  const getWeekStatus = (week) => {
    if (week?.isActive === false)
      return { key: "INACTIVE", label: "غير نشط", cls: "bg-gray-100 text-gray-600" };
    const start = toLocalDate(week?.startDate);
    const end = toLocalDate(week?.endDate, true);
    if (end && now > end) return { key: "EXPIRED", label: "منتهي", cls: "bg-red-100 text-red-700" };
    if (start && now < start) return { key: "UPCOMING", label: "قادم", cls: "bg-blue-100 text-blue-700" };
    if (start && end) return { key: "ACTIVE", label: "● نشط", cls: "bg-green-100 text-green-700" };
    return { key: "UNKNOWN", label: "غير مكتمل", cls: "bg-amber-100 text-amber-700" };
  };

  const formatDate = (d) => {
    const date = toLocalDate(d);
    if (!date) return "—";
    return date.toLocaleDateString("ar-SA", { year: "numeric", month: "numeric", day: "numeric" });
  };

  // ── open modals ───────────────────────────────────────────
  const openAddModal = () => {
    setEditingWeek(null);
    const nextNum = weeks.length + 1;
    // Auto-compute next Sunday after last week ends
    let suggestedStart = new Date();
    if (weeks.length > 0) {
      const lastEnd = toLocalDate(weeks[weeks.length - 1].endDate, true);
      if (lastEnd) {
        suggestedStart = new Date(lastEnd.getTime() + 24 * 60 * 60 * 1000); // next day after last end
        // Move to next Sunday if not already Sunday
        while (suggestedStart.getDay() !== 0) {
          suggestedStart = new Date(suggestedStart.getTime() + 24 * 60 * 60 * 1000);
        }
      }
    }
    const suggestedEnd = new Date(suggestedStart.getTime() + 4 * 24 * 60 * 60 * 1000); // +4 days (Thu)
    setFormData({
      weekNumber: nextNum,
      label: `الأسبوع ${nextNum}`,
      startDate: suggestedStart.toISOString().split("T")[0],
      endDate: suggestedEnd.toISOString().split("T")[0],
      academicYear: weeks[weeks.length - 1]?.academicYear || "1447-1448هـ / 2026-2027م",
      isActive: true,
    });
    setSetupMode(weeks.length > 0 ? "copy_prev" : "empty");
    setSourceWeekId(weeks.length > 0 ? weeks[weeks.length - 1]._id : "");
    setModalOpen(true);
  };

  const openEditModal = (week) => {
    setEditingWeek(week);
    setFormData({
      weekNumber: week.weekNumber,
      label: week.label,
      startDate: week.startDate ? new Date(week.startDate).toISOString().split("T")[0] : "",
      endDate: week.endDate ? new Date(week.endDate).toISOString().split("T")[0] : "",
      academicYear: week.academicYear || "1447-1448هـ / 2026-2027م",
      isActive: week.isActive,
    });
    setModalOpen(true);
  };

  // ── save / delete ─────────────────────────────────────────
  const handleSave = async (e) => {
    e?.preventDefault();
    const startDate = toLocalDate(formData.startDate);
    const endDate = toLocalDate(formData.endDate, true);
    if (!formData.label.trim()) { toast.error("يرجى إدخال عنوان الأسبوع"); return; }
    if (!startDate || !endDate || startDate > endDate) {
      toast.error("يرجى إدخال تاريخ بداية ونهاية صحيحين");
      return;
    }
    setSaving(true);
    try {
      if (editingWeek) {
        const res = await weeksService.update(editingWeek._id, formData);
        onWeekUpdated?.(res.data);
        toast.success("تم تحديث الأسبوع بنجاح ✅");
      } else {
        // 1. Create week
        const res = await weeksService.create(formData);
        const created = res.data;
        onWeekCreated?.(created);

        // 2. Copy schedules if requested
        if (setupMode === "copy_prev" && sourceWeekId) {
          try {
            await schedulesService.copyWeek(sourceWeekId, created._id, true);
            toast.success("✅ تم إنشاء الأسبوع ونسخ جدول الحصص من الأسبوع السابق!");
          } catch {
            toast.warning("تم إنشاء الأسبوع، لكن تعذّر نسخ الحصص السابقة");
          }
        } else {
          toast.success("تم إنشاء الأسبوع الدراسي بنجاح ✅");
        }

        // Auto-switch to the newly created week
        onSelectWeek?.(created);
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل حفظ بيانات الأسبوع");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!weekToDelete) return;
    setSaving(true);
    try {
      await weeksService.remove(weekToDelete._id);
      onWeekDeleted?.(weekToDelete._id);
      toast.success("تم حذف الأسبوع وجميع حصصه 🗑️");
      setDeleteDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل حذف الأسبوع");
    } finally {
      setSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────
  return (
    <>
      {/* Trigger button: shown inline in the week nav bar */}
      <div className="flex items-center gap-2">
        {/* New week button */}
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
          title="إنشاء أسبوع دراسي جديد"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">أسبوع جديد</span>
        </button>

        {/* Manage weeks (expand list) */}
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-slate-200"
          title="عرض وإدارة كل الأسابيع"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">كل الأسابيع</span>
        </button>
      </div>

      {/* ── Side Panel: all weeks list ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPanelOpen(false)}
          />

          {/* Slide-in panel */}
          <div className="relative mr-auto ml-0 w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50">
              <div>
                <h2 className="text-base font-black text-gray-900">📅 الأسابيع الدراسية</h2>
                <p className="text-xs text-gray-400 mt-0.5">{weeks.length} أسبوع مسجّل</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                >
                  <span>+</span> أسبوع جديد
                </button>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Weeks list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {weeks.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  لا توجد أسابيع مسجّلة بعد
                </div>
              ) : (
                [...weeks].reverse().map((week) => {
                  const status = getWeekStatus(week);
                  const isCurrent = week._id === currentWeek?._id;
                  return (
                    <div
                      key={week._id}
                      className={`p-4 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                        isCurrent ? "bg-blue-50/60" : "hover:bg-gray-50"
                      }`}
                      onClick={() => { onSelectWeek?.(week); setPanelOpen(false); }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                          isCurrent ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                        }`}>
                          {week.weekNumber}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate ${isCurrent ? "text-blue-800" : "text-gray-900"}`}>
                            {week.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(week.startDate)} ← {formatDate(week.endDate)}
                          </p>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { openEditModal(week); }}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => { setWeekToDelete(week); setDeleteDialogOpen(true); }}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-gray-100 bg-slate-50 text-xs text-gray-400 text-center">
              انقر على أي أسبوع للانتقال إليه مباشرة
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingWeek ? "✏️ تعديل الأسبوع الدراسي" : "📅 إضافة أسبوع دراسي جديد"}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <span>جاري الحفظ...</span>
                </>
              ) : (editingWeek ? "حفظ التعديلات" : "إنشاء الأسبوع ✅")}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Week number + Academic Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رقم الأسبوع <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={formData.weekNumber}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10) || 1;
                  setFormData((f) => ({ ...f, weekNumber: n, label: `الأسبوع ${n}` }));
                }}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">العام الدراسي</label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData((f) => ({ ...f, academicYear: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Week label */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              عنوان الأسبوع <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData((f) => ({ ...f, label: e.target.value }))}
              required
              placeholder="مثال: الأسبوع الثالث"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                تاريخ البداية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                تاريخ النهاية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Setup mode — only when creating */}
          {!editingWeek && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-2">
                ⚡ إعداد الحصص للأسبوع الجديد تلقائياً:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Copy from previous */}
                <button
                  type="button"
                  onClick={() => setSetupMode("copy_prev")}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                    setupMode === "copy_prev"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-400/20 text-blue-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                  }`}
                >
                  <span className="text-xl">📋</span>
                  <span className="font-bold text-xs">نسخ من أسبوع سابق</span>
                  <span className="text-[10px] text-gray-500">تكرار توزيع الحصص بالكامل</span>
                </button>

                {/* Empty */}
                <button
                  type="button"
                  onClick={() => setSetupMode("empty")}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                    setupMode === "empty"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-400/20 text-blue-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                  }`}
                >
                  <span className="text-xl">📝</span>
                  <span className="font-bold text-xs">أسبوع فارغ</span>
                  <span className="text-[10px] text-gray-500">سيبدأ فارغاً بدون حصص</span>
                </button>
              </div>

              {/* Source week selector */}
              {setupMode === "copy_prev" && (
                <div className="mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5">
                  <label className="block text-xs font-bold text-blue-900">
                    اختر الأسبوع المراد نسخ الحصص منه:
                  </label>
                  {weeks.length === 0 ? (
                    <p className="text-xs text-amber-700 font-medium">لا توجد أسابيع سابقة.</p>
                  ) : (
                    <select
                      value={sourceWeekId}
                      onChange={(e) => setSourceWeekId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {[...weeks].reverse().map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.label} ({formatDate(w.startDate)} - {formatDate(w.endDate)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active toggle for edit */}
          {editingWeek && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
              <span className="text-xs font-bold text-gray-700">الأسبوع نشط</span>
            </div>
          )}
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="تأكيد حذف الأسبوع الدراسي"
        message={`تحذير: سيؤدي حذف "${weekToDelete?.label}" إلى حذف جميع الحصص والجداول المرتبطة به نهائياً. هل أنت متأكد؟`}
        confirmLabel="نعم، احذف الأسبوع"
        variant="danger"
        loading={saving}
      />
    </>
  );
}
