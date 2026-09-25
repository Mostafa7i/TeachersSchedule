"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { feedbackService } from "@/services/feedback.service";
import { uploadImageToCloudinary } from "@/lib/utils";
import { ErrorBoundary, TableSkeleton } from "@/components/ui";

const TYPE_CONFIG = {
  SUGGESTION: { label: "مقترح تطويري", icon: "💡", badge: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  COMPLAINT: { label: "شكوى وملاحظة", icon: "⚠️", badge: "bg-rose-50 text-rose-800 border-rose-300" },
  SCHEDULE_ISSUE: { label: "ملاحظة في الجدول", icon: "🗓️", badge: "bg-blue-50 text-blue-800 border-blue-300" },
  FACILITY: { label: "بيئة ومرافق المدرسة", icon: "🏫", badge: "bg-amber-50 text-amber-800 border-amber-300" },
  OTHER: { label: "أخرى", icon: "📌", badge: "bg-slate-50 text-slate-800 border-slate-300" },
};

const STATUS_CONFIG = {
  PENDING: { label: "قيد المراجعة", icon: "⏳", badge: "bg-amber-100 text-amber-900 border-amber-300" },
  IN_PROGRESS: { label: "جاري المعالجة", icon: "⚙️", badge: "bg-blue-100 text-blue-900 border-blue-300" },
  RESOLVED: { label: "تم الرد والمعالجة", icon: "✅", badge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  REJECTED: { label: "مرفوض / مغلق", icon: "❌", badge: "bg-slate-100 text-slate-700 border-slate-300" },
};

export default function TeacherFeedbackPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  // New feedback modal form
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    type: "SUGGESTION",
    category: "جدول الحصص",
    title: "",
    description: "",
    priority: "NORMAL",
    isAnonymous: false,
    attachments: [],
  });

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await feedbackService.getMyFeedback();
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Fetch feedbacks error:", err);
      toast.error("فشل في تحميل قائمة الشكاوى والمقترحات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, url],
      }));
      toast.success("تم رفع المرفق بنجاح 📎");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.message || "فشل في رفع المرفق");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("يرجى كتابة عنوان وتفاصيل الطلب");
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.create(formData);
      toast.success("تم إرسال طلبك إلى إدارة المدرسة بنجاح 📨");
      setModalOpen(false);
      setFormData({
        type: "SUGGESTION",
        category: "جدول الحصص",
        title: "",
        description: "",
        priority: "NORMAL",
        isAnonymous: false,
        attachments: [],
      });
      fetchFeedbacks();
    } catch (err) {
      console.error("Submit feedback error:", err);
      toast.error(err.response?.data?.message || "فشل في إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredList = feedbacks.filter((item) => {
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
    if (filterType !== "ALL" && item.type !== filterType) return false;
    return true;
  });

  const pendingCount = feedbacks.filter((f) => f.status === "PENDING").length;
  const resolvedCount = feedbacks.filter((f) => f.status === "RESOLVED").length;

  return (
    <ErrorBoundary>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto" dir="rtl">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold">
              <span>💬 صوت المعلم</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              الشكاوى والمقترحات
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed font-medium">
              مساحتك المباشرة للتواصل مع إدارة المدرسة؛ شاركونا مقترحاتكم التطويرية أو أبلغوا عن أي ملاحظات في الجدول والبيئة المدرسية لمتابعتها وحلها فوراً.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer whitespace-nowrap scale-100 hover:scale-105"
          >
            <span className="text-lg">➕</span>
            <span>إرسال شكوى أو مقترح جديد</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl font-bold">
              📑
            </div>
            <div>
              <span className="text-xs text-slate-500 font-bold block">إجمالي الطلبات</span>
              <span className="text-xl font-black text-slate-900">{feedbacks.length}</span>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl font-bold">
              ⏳
            </div>
            <div>
              <span className="text-xs text-amber-700 font-bold block">قيد المراجعة</span>
              <span className="text-xl font-black text-amber-950">{pendingCount}</span>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl font-bold">
              ✅
            </div>
            <div>
              <span className="text-xs text-emerald-700 font-bold block">تم الرد والمعالجة</span>
              <span className="text-xl font-black text-emerald-950">{resolvedCount}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-slate-500 ml-1">الحالة:</span>
            {["ALL", "PENDING", "IN_PROGRESS", "RESOLVED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === st
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "جميع الحالات" : STATUS_CONFIG[st]?.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-slate-500 ml-1">النوع:</span>
            {["ALL", "SUGGESTION", "COMPLAINT", "SCHEDULE_ISSUE", "FACILITY"].map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setFilterType(tp)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === tp
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tp === "ALL" ? "الكل" : TYPE_CONFIG[tp]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback List */}
        {loading ? (
          <TableSkeleton rows={4} />
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <span className="text-4xl block">📬</span>
            <h3 className="text-base font-bold text-slate-800">لا توجد شكاوى أو مقترحات مسجلة حالياً</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              يمكنك الضغط على زر "إرسال شكوى أو مقترح جديد" في الأعلى لمشاركة صوتك مع إدارة المدرسة.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((item) => {
              const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.OTHER;
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  {/* Item Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${typeCfg.badge}`}>
                        <span>{typeCfg.icon}</span>
                        <span>{typeCfg.label}</span>
                      </span>

                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                        📁 {item.category}
                      </span>

                      {item.isAnonymous && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                          🕵️ هوية مجهولة
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(item.createdAt).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <span className={`text-xs font-black px-3 py-1 rounded-xl border flex items-center gap-1 ${statusCfg.badge}`}>
                      <span>{statusCfg.icon}</span>
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      {item.description}
                    </p>
                  </div>

                  {/* Attachments */}
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-xs font-bold text-slate-500">المرفقات:</span>
                      {item.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-xl font-bold transition-all"
                        >
                          <span>📎</span>
                          <span>مرفق {i + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Admin Reply Box */}
                  {item.adminReply ? (
                    <div className="bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-300 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900 border-b border-emerald-200/60 pb-2">
                        <span className="flex items-center gap-1.5">
                          <span>🏫</span>
                          <span>رد إدارة المدرسة ({item.repliedBy?.name || "الإدارة"})</span>
                        </span>
                        {item.repliedAt && (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            {new Date(item.repliedAt).toLocaleDateString("ar-SA", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-950 whitespace-pre-line font-medium leading-relaxed">
                        {item.adminReply}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 pt-1">
                      <span>⏳</span>
                      <span>طلبك قيد المتابعة من قِبل إدارة المدرسة وسيصلك إشعار فور الرد.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for creating feedback */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✍️</span>
                  <h3 className="text-base font-black">إرسال شكوى أو مقترح جديد</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800">نوع الطلب:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: key })}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-right flex items-center gap-2 transition-all cursor-pointer ${
                          formData.type === key
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs scale-102"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{cfg.icon}</span>
                        <span className="truncate">{cfg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">التصنيف:</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="جدول الحصص">جدول وتوزيع الحصص</option>
                      <option value="نصاب الحصص">نصاب الحصص والمواد</option>
                      <option value="الخطة الأسبوعية">الخطة الأسبوعية والتحضير</option>
                      <option value="القاعات والمرافق">القاعات والبيئة المدرسية</option>
                      <option value="الأنشطة المدرسية">الأنشطة والريادة</option>
                      <option value="اقتراح تطويري">اقتراح تطويري عام</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">مستوى الأهمية:</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="NORMAL">عادي</option>
                      <option value="HIGH">مرتفع</option>
                      <option value="URGENT">عاجل وهام</option>
                      <option value="LOW">منخفض</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-800">عنوان الموضوع:</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: اقتراح تعديل ترتيب حصص يوم الثلاثاء / طلب تجهيز معمل الحاسب..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-800">التفاصيل والوصف:</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="اشرح المشكلة أو المقترح بوضوح..."
                    className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                {/* Anonymous Checkbox */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isAnon"
                    checked={formData.isAnonymous}
                    onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isAnon" className="text-xs font-bold text-slate-800 cursor-pointer">
                    إرسال بهوية مجهولة (لن يظهر اسمك للإدارة في هذا الطلب)
                  </label>
                </div>

                {/* Attachment */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">إرفاق صورة أو مستند (اختياري):</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploadingImage}
                    className="w-full text-xs text-slate-600 file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {uploadingImage && <p className="text-[11px] text-blue-600 font-bold">جاري رفع الملف...</p>}
                </div>

                {/* Submit button */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || uploadingImage}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
