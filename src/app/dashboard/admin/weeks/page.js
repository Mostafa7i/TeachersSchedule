"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { weeksService } from "@/services/schedules.service";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui";

export default function AdminWeeksPage() {
  const toast = useToast();

  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [weekToDelete, setWeekToDelete] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    weekNumber: 1,
    label: "",
    startDate: "",
    endDate: "",
    academicYear: "1447-1448هـ / 2026-2027م",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchWeeks = async () => {
    try {
      setLoading(true);
      const res = await weeksService.getAll();
      setWeeks(res.data || []);
    } catch (err) {
      toast.error("فشل جلب قائمة الأسابيع الدراسية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  const handleOpenAdd = () => {
    setEditingWeek(null);
    const nextWeekNum = weeks.length + 1;
    setFormData({
      weekNumber: nextWeekNum,
      label: `الأسبوع ${nextWeekNum}`,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      academicYear: "1447-1448هـ / 2026-2027م",
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (week) => {
    setEditingWeek(week);
    setFormData({
      weekNumber: week.weekNumber,
      label: week.label,
      startDate: week.startDate
        ? new Date(week.startDate).toISOString().split("T")[0]
        : "",
      endDate: week.endDate
        ? new Date(week.endDate).toISOString().split("T")[0]
        : "",
      academicYear: week.academicYear || "1447-1448هـ / 2026-2027م",
      isActive: week.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveWeek = async (e) => {
    e.preventDefault();
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error("تاريخ بداية الأسبوع يجب أن يكون قبل تاريخ نهايته");
      return;
    }
    setSaving(true);
    try {
      if (editingWeek) {
        const res = await weeksService.update(editingWeek._id, formData);
        setWeeks((prev) =>
          prev.map((w) => (w._id === editingWeek._id ? res.data : w)),
        );
        toast.success("تم تحديث الأسبوع الدراسي بنجاح ✅");
      } else {
        const res = await weeksService.create(formData);
        setWeeks((prev) => [...prev, res.data]);
        toast.success("تم إنشاء الأسبوع الدراسي بنجاح ✅");
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ بيانات الأسبوع";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWeek = async () => {
    setSaving(true);
    try {
      await weeksService.remove(weekToDelete._id);
      setWeeks((prev) => prev.filter((w) => w._id !== weekToDelete._id));
      toast.success("تم حذف الأسبوع وجميع الحصص المرتبطة به بنجاح 🗑️");
      setDeleteDialogOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حذف الأسبوع";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("ar-SA", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            إدارة الأسابيع الدراسية
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            تحديد الفترات الزمنية للأسابيع الدراسية وربط الجداول بالتقويم
            الأكاديمي.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all text-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>إضافة أسبوع دراسي جديد</span>
        </button>
      </div>

      {/* Weeks Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-xs text-gray-600 font-bold">
                <th className="px-6 py-4">رقم وعنوان الأسبوع</th>
                <th className="px-6 py-4">العام الدراسي</th>
                <th className="px-6 py-4">تاريخ البداية</th>
                <th className="px-6 py-4">تاريخ النهاية</th>
                <th className="px-6 py-4 text-center">الحالة</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : weeks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    لا توجد أسابيع دراسية مسجلة
                  </td>
                </tr>
              ) : (
                weeks.map((week) => (
                  <tr
                    key={week._id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 font-black flex items-center justify-center text-sm">
                          {week.weekNumber}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {week.label}
                          </p>
                          <p className="text-xs text-gray-400 font-medium">
                            أسبوع رقم {week.weekNumber}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-700">
                      {week.academicYear || "2026-2027"}
                    </td>

                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {formatDate(week.startDate)}
                    </td>

                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {formatDate(week.endDate)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          week.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {week.isActive ? "● نشط" : "○ غير نشط"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(week)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            setWeekToDelete(week);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingWeek
            ? "تعديل بيانات الأسبوع الدراسي"
            : "إضافة أسبوع دراسي جديد"
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveWeek}
              disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveWeek} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رقم الأسبوع <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={formData.weekNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weekNumber: parseInt(e.target.value, 10) || 1,
                  })
                }
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                العام الدراسي
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData({ ...formData, academicYear: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              عنوان الأسبوع <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              required
              placeholder="مثال: الأسبوع الأول (2026/09/06 - 2026/09/10)"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                تاريخ البداية (الأحد) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                تاريخ النهاية (الخميس) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteWeek}
        title="تأكيد حذف الأسبوع الدراسي"
        message={`تحذير: سيؤدي حذف "${weekToDelete?.label}" إلى حذف جميع الحصص والجداول المرتبطة به بشكل نهائي! هل أنت متأكد؟`}
        confirmLabel="نعم، حذف الأسبوع"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
