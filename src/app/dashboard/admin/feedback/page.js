"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { feedbackService } from "@/services/feedback.service";
import { TableSkeleton, ErrorBoundary } from "@/components/ui";

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

export default function AdminFeedbackPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Reply Modal State
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("RESOLVED");
  const [savingReply, setSavingReply] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await feedbackService.getAll({
        status: filterStatus === "ALL" ? "" : filterStatus,
        type: filterType === "ALL" ? "" : filterType,
        search: searchTerm,
      });
      setFeedbacks(res.data?.feedbacks || []);
      setStats(res.data?.stats || { total: 0, pending: 0, resolved: 0 });
    } catch (err) {
      console.error("Fetch admin feedbacks error:", err);
      toast.error("فشل في تحميل الشكاوى والمقترحات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [filterStatus, filterType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFeedbacks();
  };

  const handleOpenReply = (item) => {
    setSelectedFeedback(item);
    setReplyText(item.adminReply || "");
    setReplyStatus(item.status === "PENDING" ? "RESOLVED" : item.status);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    setSavingReply(true);
    try {
      await feedbackService.reply(selectedFeedback._id, {
        adminReply: replyText,
        status: replyStatus,
      });

      toast.success("تم إرسال الرد وتحديث حالة الطلب وإشعار المعلم بنجاح ✅");
      setSelectedFeedback(null);
      fetchFeedbacks();
    } catch (err) {
      console.error("Reply error:", err);
      toast.error(err.response?.data?.message || "فشل إرسال الرد");
    } finally {
      setSavingReply(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;
    try {
      await feedbackService.remove(id);
      toast.success("تم حذف السجل بنجاح");
      fetchFeedbacks();
    } catch (err) {
      toast.error("فشل الحذف");
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto" dir="rtl">
        {/* Header */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold">
              <span>🏛️ إدارة الشكاوى والمقترحات</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              صندوق شكاوى ومقترحات المعلمين
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-2xl">
              استعراض ومتابعة ومراجعة كافة الشكاوى والمقترحات المقدمة من المعلمين والرد عليها مع إشعارهم فورياً.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchFeedbacks}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>🔄</span>
              <span>تحديث القائمة</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl font-bold">
              📊
            </div>
            <div>
              <span className="text-xs text-slate-500 font-bold block">إجمالي الشكاوى والمقترحات</span>
              <span className="text-xl font-black text-slate-900">{stats.total}</span>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl font-bold">
              ⏳
            </div>
            <div>
              <span className="text-xs text-amber-700 font-bold block">بانتظار الرد والمراجعة</span>
              <span className="text-xl font-black text-amber-950">{stats.pending}</span>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl font-bold">
              ✅
            </div>
            <div>
              <span className="text-xs text-emerald-700 font-bold block">تم الرد والمعالجة</span>
              <span className="text-xl font-black text-emerald-950">{stats.resolved}</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
            <span className="text-xs font-bold text-slate-500 ml-1">الحالة:</span>
            {["ALL", "PENDING", "IN_PROGRESS", "RESOLVED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === st
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "الكل" : STATUS_CONFIG[st]?.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في العنوان أو التفاصيل..."
              className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 cursor-pointer shrink-0"
            >
              بحث
            </button>
          </form>
        </div>

        {/* Feedbacks Feed */}
        {loading ? (
          <TableSkeleton rows={4} />
        ) : feedbacks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <span className="text-4xl block">📭</span>
            <h3 className="text-base font-bold text-slate-800">لا توجد شكاوى أو مقترحات تطابق معايير التصفية</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((item) => {
              const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.OTHER;
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-xs font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${typeCfg.badge}`}>
                        <span>{typeCfg.icon}</span>
                        <span>{typeCfg.label}</span>
                      </span>

                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                        {item.isAnonymous ? "🕵️ مرسل مجهول" : `👨‍🏫 ${item.teacher?.name || "معلم"}`}
                      </span>

                      <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                        📁 {item.category}
                      </span>

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

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-3 py-1 rounded-xl border flex items-center gap-1 ${statusCfg.badge}`}>
                        <span>{statusCfg.icon}</span>
                        <span>{statusCfg.label}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenReply(item)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-all flex items-center gap-1"
                      >
                        <span>✍️</span>
                        <span>{item.adminReply ? "تعديل الرد" : "الرد على الطلب"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-normal">
                      {item.description}
                    </p>
                  </div>

                  {/* Attachments */}
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500">المرفقات:</span>
                      {item.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-xl font-bold"
                        >
                          <span>📎</span>
                          <span>مرفق {i + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Admin Reply */}
                  {item.adminReply && (
                    <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900 border-b border-emerald-200 pb-1.5">
                        <span>رد الإدارة المسجل ({item.repliedBy?.name || "الإدارة"}):</span>
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
                      <p className="text-xs text-emerald-950 font-medium whitespace-pre-line leading-relaxed">
                        {item.adminReply}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Admin Reply */}
        {selectedFeedback && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedFeedback(null);
            }}
          >
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <h3 className="text-base font-black">الرد على الشكوى أو المقترح</h3>
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendReply} className="p-6 space-y-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[11px] text-slate-500 font-bold block">
                    الموضوع ({selectedFeedback.isAnonymous ? "مرسل مجهول" : selectedFeedback.teacher?.name}):
                  </span>
                  <h4 className="text-xs font-black text-slate-900">{selectedFeedback.title}</h4>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تحديث حالة الطلب:</label>
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RESOLVED">تم الرد والمعالجة (RESOLVED)</option>
                    <option value="IN_PROGRESS">جاري المعالجة والمتابعة (IN_PROGRESS)</option>
                    <option value="PENDING">قيد المراجعة (PENDING)</option>
                    <option value="REJECTED">مرفوض / غير قابل للتنفيذ (REJECTED)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-800">نص الرد والتوجيه:</label>
                  <textarea
                    required
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب رد إدارة المدرسة بوضوح، وسيصل إشعار فوري للمعلم بالرد..."
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedFeedback(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={savingReply}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingReply ? "جاري الإرسال..." : "اعتماد الرد وإشعار المعلم"}
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
