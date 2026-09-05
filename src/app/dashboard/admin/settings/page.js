"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { settingsService } from "@/services/settings.service";
import { Skeleton } from "@/components/ui";
import { DAYS_OF_WEEK } from "@/constants";
import { getLogoUrl, uploadImageToCloudinary } from "@/lib/utils";

export default function AdminSettingsPage() {
  const toast = useToast();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");

  const [formData, setFormData] = useState({
    schoolName: "",
    schoolNameEn: "",
    ministryHeader: "",
    academicYear: "",
    term: "",
    principalName: "",
    academicAdvisorName: "",
    periodsCount: 6,
    workDays: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await settingsService.get();
        const data = res.data;
        setSettings(data);
        setLogoPreview(data?.logo || "");
        setFormData({
          schoolName: data?.schoolName || "",
          schoolNameEn: data?.schoolNameEn || "",
          ministryHeader: data?.ministryHeader || "",
          academicYear: data?.academicYear || "",
          term: data?.term || "",
          principalName: data?.principalName || "",
          academicAdvisorName: data?.academicAdvisorName || "",
          periodsCount: data?.periodsCount || 6,
          workDays: data?.workDays || [
            "الأحد",
            "الإثنين",
            "الثلاثاء",
            "الأربعاء",
            "الخميس",
          ],
          phone: data?.phone || "",
          email: data?.email || "",
          address: data?.address || "",
        });
      } catch (err) {
        toast.error("فشل جلب إعدادات المدرسة");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleWorkDayToggle = (day) => {
    setFormData((prev) => {
      const exists = prev.workDays.includes(day);
      if (exists) {
        if (prev.workDays.length <= 1) {
          toast.warning("يجب الإبقاء على يوم دراسي واحد على الأقل");
          return prev;
        }
        return { ...prev, workDays: prev.workDays.filter((d) => d !== day) };
      } else {
        return { ...prev, workDays: [...prev.workDays, day] };
      }
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة حصراً");
      return;
    }

    setUploadingLogo(true);
    try {
      // 1) Upload directly to Cloudinary from the browser
      const cloudinaryUrl = await uploadImageToCloudinary(file);

      // 2) Show preview immediately
      setLogoPreview(cloudinaryUrl);

      // 3) Save the Cloudinary URL to our backend
      await settingsService.updateLogo(cloudinaryUrl);

      toast.success("تم رفع شعار المدرسة بنجاح 🖼️");
    } catch (err) {
      toast.error(err.message || "فشل رفع الشعار");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schoolName) {
      toast.error("اسم المدرسة مطلوب");
      return;
    }

    setSaving(true);
    try {
      const res = await settingsService.update(formData);
      setSettings(res.data);
      toast.success("تم حفظ إعدادات وبيانات المدرسة بنجاح ✅");
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ الإعدادات";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">
          إعدادات وبيانات المدرسة
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          تخصيص الهوية البصرية، شعار المدرسة، الترويسة الرسمية، وعدد الحصص
          الأسبوعية.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo and Identity Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            شعار وهيكل المدرسة
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {logoPreview ? (
                  <img
                    src={getLogoUrl(logoPreview)}
                    alt="School Logo Preview"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-4xl text-gray-400">🏫</span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-center sm:text-right flex-1">
              <label className="inline-block bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition-colors shadow-xs">
                {uploadingLogo ? "جاري الرفع..." : "📷 رفع شعار جديد"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400">
                الصيغ المدعومة: PNG, JPG, WebP, SVG (الحد الأقصى: 5MB). يظهر
                الشعار أعلى الجدول المطبوع.
              </p>
            </div>
          </div>
        </div>

        {/* Basic School Information */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
            البيانات الأساسية والترويسة
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم المدرسة بالعربية <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) =>
                  setFormData({ ...formData, schoolName: e.target.value })
                }
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم المدرسة بالإنجليزية
              </label>
              <input
                type="text"
                value={formData.schoolNameEn}
                onChange={(e) =>
                  setFormData({ ...formData, schoolNameEn: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              الترويسة الرسمية أعلى الجداول (الوزارة / إدارة التعليم)
            </label>
            <textarea
              rows={3}
              value={formData.ministryHeader}
              onChange={(e) =>
                setFormData({ ...formData, ministryHeader: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                العام الدراسي الافتراضي
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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الفصل الدراسي
              </label>
              <input
                type="text"
                value={formData.term}
                onChange={(e) =>
                  setFormData({ ...formData, term: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم مدير المدرسة (للتوقيع والختم)
              </label>
              <input
                type="text"
                value={formData.principalName}
                onChange={(e) =>
                  setFormData({ ...formData, principalName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
               وكيل المدرسة
              </label>
              <input
                type="text"
                value={formData.academicAdvisorName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    academicAdvisorName: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Schedule Structure & Work Days */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
            هيكلية الجدول الدراسي
          </h2>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              عدد الحصص اليومية في الجدول (1 إلى 8)
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={formData.periodsCount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  periodsCount: parseInt(e.target.value, 10) || 6,
                })
              }
              className="w-48 px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              أيام العمل والدراسة في الجدول
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const checked = formData.workDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => handleWorkDayToggle(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      checked
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {checked ? "✓ " : "+ "}
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-50"
          >
            {saving ? "جاري حفظ الإعدادات..." : "💾 حفظ جميع الإعدادات"}
          </button>
        </div>
      </form>
    </div>
  );
}
