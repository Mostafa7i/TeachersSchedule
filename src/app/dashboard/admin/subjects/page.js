"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { subjectsService } from "@/services/subjects.service";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui";
import { SUBJECT_COLORS } from "@/constants";

export default function AdminSubjectsPage() {
  const toast = useToast();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    code: "",
    color: "#2563eb",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await subjectsService.getAll({ search });
      setSubjects(res.data || []);
    } catch (err) {
      toast.error("فشل جلب قائمة المواد");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setFormData({
      name: "",
      nameEn: "",
      code: "",
      color: SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)],
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (subj) => {
    setEditingSubject(subj);
    setFormData({
      name: subj.name,
      nameEn: subj.nameEn || "",
      code: subj.code,
      color: subj.color || "#2563eb",
      isActive: subj.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error("اسم ورمز المادة مطلوبان");
      return;
    }
    setSaving(true);
    try {
      if (editingSubject) {
        const res = await subjectsService.update(editingSubject._id, formData);
        setSubjects((prev) =>
          prev.map((s) => (s._id === editingSubject._id ? res.data : s)),
        );
        toast.success("تم تحديث المادة الدراسية بنجاح ✅");
      } else {
        const res = await subjectsService.create(formData);
        setSubjects((prev) => [...prev, res.data]);
        toast.success("تمت إضافة المادة الدراسية بنجاح ✅");
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ بيانات المادة";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (subj) => {
    try {
      const res = await subjectsService.toggleStatus(subj._id);
      setSubjects((prev) =>
        prev.map((s) =>
          s._id === subj._id ? { ...s, isActive: res.data.isActive } : s,
        ),
      );
      toast.success(`تم ${res.data.isActive ? "تفعيل" : "تعطيل"} المادة بنجاح`);
    } catch (err) {
      toast.error("فشل تغيير حالة المادة");
    }
  };

  const handleDeleteSubject = async () => {
    setSaving(true);
    try {
      await subjectsService.remove(subjectToDelete._id);
      setSubjects((prev) => prev.filter((s) => s._id !== subjectToDelete._id));
      toast.success("تم حذف المادة بنجاح 🗑️");
      setDeleteDialogOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حذف المادة";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            إدارة المواد الدراسية
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            تعريف المقررات والمواد وتحديد ألوان التمييز الخاصة بكل مادة في
            الجداول.
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
          <span>إضافة مادة جديدة</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث باسم المادة أو الرمز..."
            className="w-full px-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none pe-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        <div className="text-xs text-gray-500 font-bold">
          إجمالي المواد:{" "}
          <span className="text-blue-600">{subjects.length}</span>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-gray-100"
            >
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-16 mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))
        ) : subjects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            لا توجد مواد دراسية مسجلة
          </div>
        ) : (
          subjects.map((subj) => (
            <div
              key={subj._id}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between border-t-4"
              style={{ borderTopColor: subj.color || "#3b82f6" }}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {subj.name}
                    </h3>
                    {subj.nameEn && (
                      <p className="text-xs text-gray-400 font-medium">
                        {subj.nameEn}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 text-gray-700">
                    {subj.code}
                  </span>
                </div>

                <div className="flex items-center gap-2 my-3">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-200"
                    style={{ backgroundColor: subj.color }}
                  />
                  <span className="text-xs text-gray-500 font-mono">
                    {subj.color}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                <button
                  onClick={() => handleToggleStatus(subj)}
                  className={`text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                    subj.isActive
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-red-50 text-red-700 hover:bg-red-100"
                  }`}
                >
                  {subj.isActive ? "● نشطة" : "○ معطلة"}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(subj)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                    title="تعديل"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      setSubjectToDelete(subj);
                      setDeleteDialogOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    title="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingSubject
            ? "تعديل بيانات المادة الدراسية"
            : "إضافة مادة دراسية جديدة"
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
              onClick={handleSaveSubject}
              disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              اسم المادة بالعربية <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="مثال: الرياضيات"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              اسم المادة بالإنجليزية (اختياري)
            </label>
            <input
              type="text"
              value={formData.nameEn}
              onChange={(e) =>
                setFormData({ ...formData, nameEn: e.target.value })
              }
              placeholder="Example: Mathematics"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رمز المادة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              required
              placeholder="مثال: MATH"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              لون المادة في الجدول
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {SUBJECT_COLORS.map((col) => (
                <button
                  type="button"
                  key={col}
                  onClick={() => setFormData({ ...formData, color: col })}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    formData.color === col
                      ? "scale-125 ring-2 ring-offset-2 ring-blue-600"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300"
                title="اختر لوناً مخصصاً"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteSubject}
        title="تأكيد حذف المادة"
        message={`هل أنت متأكد من حذف المادة "${subjectToDelete?.name}"؟ لن تتمكن من الحذف إذا كانت مسندة لحصص في الجداول المدرسية.`}
        confirmLabel="نعم، حذف المادة"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
