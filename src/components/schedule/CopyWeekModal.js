"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";

export default function CopyWeekModal({
  isOpen,
  onClose,
  sourceWeek,
  weeks = [],
  onCopy,
  loading = false,
}) {
  const [targetWeekId, setTargetWeekId] = useState("");
  const [overwrite, setOverwrite] = useState(false);

  const availableTargetWeeks = weeks.filter((w) => w._id !== sourceWeek?._id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetWeekId) return;
    onCopy(sourceWeek._id, targetWeekId, overwrite);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="نسخ جدول الأسبوع بالكامل"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !targetWeekId}
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "جاري النسخ..." : "بدء النسخ"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 text-sm">
          <p className="font-semibold mb-1">نسخ من الأسبوع المصدر:</p>
          <p className="text-blue-700 font-bold">{sourceWeek?.label}</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            اختر الأسبوع الهدف المراد النسخ إليه{" "}
            <span className="text-red-500">*</span>
          </label>
          <select
            value={targetWeekId}
            onChange={(e) => setTargetWeekId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- اختر الأسبوع الهدف --</option>
            {availableTargetWeeks.map((w) => (
              <option key={w._id} value={w._id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="mt-1 rounded text-amber-600 focus:ring-amber-500"
            />
            <div className="text-xs text-amber-900">
              <span className="font-bold block">
                استبدال الجدول الموجود في الأسبوع الهدف
              </span>
              <span className="text-amber-700">
                إذا كان الأسبوع الهدف يحتوي على حصص سابقة، سيتم حذفها واستبدالها
                بالحصص المنسوخة.
              </span>
            </div>
          </label>
        </div>
      </form>
    </Modal>
  );
}
