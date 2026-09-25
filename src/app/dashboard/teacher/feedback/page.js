"use client";

import { useState, useEffect, useCallback } from "react";
import { feedbackService } from "@/services/feedback.service";
import {
  MessageSquarePlus,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Send,
  Trash2,
  AlertTriangle,
  Lightbulb,
  CalendarX2,
  Building2,
  HelpCircle,
  Loader2,
} from "lucide-react";

const TYPE_CONFIG = {
  COMPLAINT: { label: "شكوى", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  SUGGESTION: { label: "اقتراح", icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-50" },
  SCHEDULE_ISSUE: { label: "مشكلة جدول", icon: CalendarX2, color: "text-blue-500", bg: "bg-blue-50" },
  FACILITY: { label: "مرفق / بنية تحتية", icon: Building2, color: "text-purple-500", bg: "bg-purple-50" },
  OTHER: { label: "أخرى", icon: HelpCircle, color: "text-gray-500", bg: "bg-gray-50" },
  GENERAL: { label: "عامة", icon: MessageSquarePlus, color: "text-gray-500", bg: "bg-gray-50" },
  BUG: { label: "خلل تقني", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
};

const STATUS_CONFIG = {
  PENDING: { label: "قيد المراجعة", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
  IN_REVIEW: { label: "جارٍ المراجعة", icon: Loader2, color: "text-blue-500", bg: "bg-blue-50" },
  RESOLVED: { label: "تم الحل", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  REJECTED: { label: "مرفوض", icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  REPLIED: { label: "تم الرد", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  CLOSED: { label: "مغلقة", icon: XCircle, color: "text-gray-500", bg: "bg-gray-50" },
};

const INITIAL_FORM = {
  type: "COMPLAINT",
  title: "",
  description: "",
  priority: "MEDIUM",
  isAnonymous: false,
};

const normalizeFeedbackItem = (item = {}) => ({
  ...item,
  // توافق مع بيانات الواجهة القديمة وبيانات الـ API الجديدة
  type: item.type || item.category || "OTHER",
  title: item.title || item.subject || "بدون عنوان",
  description: item.description || item.message || item.content || "لا يوجد محتوى",
  adminReply: item.adminReply || item.reply || "",
  // يظهر الاسم في شاشة الأدمن عندما يرجعه populate("user")
  senderName: item.user?.name || item.teacher?.name || item.createdBy?.name || "",
  senderEmail: item.user?.email || item.teacher?.email || item.createdBy?.email || "",
  status: item.status || "PENDING",
});

export default function TeacherFeedbackPage() {
  const [view, setView] = useState("list"); // list | new
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feedbackService.getMyFeedback();
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setItems(rows.map(normalizeFeedbackItem));
    } catch {
      setError("تعذّر تحميل الشكاوى والاقتراحات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("يرجى ملء العنوان والتفاصيل");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await feedbackService.create({
        subject: form.title.trim(),
        message: form.description.trim(),
        category: form.type,
        // نرسل الحقول القديمة أيضًا للتوافق مع أي Backend قديم
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        priority: form.priority,
        isAnonymous: form.isAnonymous,
      });
      setSuccessMsg("تم إرسال الشكوى/الاقتراح بنجاح ✅");
      setForm(INITIAL_FORM);
      setView("list");
      load();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || "حدث خطأ أثناء الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل تريد حذف هذا البند؟")) return;
    try {
      await feedbackService.remove(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {
      setError("تعذّر الحذف");
    }
  };

  const pendingCount = items.filter((i) => i.status === "PENDING").length;
  const resolvedCount = items.filter((i) =>
    ["RESOLVED", "REPLIED", "CLOSED"].includes(i.status),
  ).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الشكاوى والاقتراحات</h1>
          <p className="text-sm text-gray-500 mt-1">أرسل ملاحظاتك أو اقتراحاتك للإدارة</p>
        </div>
        <button
          onClick={() => setView(view === "new" ? "list" : "new")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow"
        >
          <MessageSquarePlus size={16} />
          {view === "new" ? "عرض القائمة" : "إرسال جديد"}
        </button>
      </div>

      {/* Stats */}
      {view === "list" && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "الإجمالي", value: items.length, color: "bg-gray-100 text-gray-700" },
            { label: "قيد المراجعة", value: pendingCount, color: "bg-orange-50 text-orange-600" },
            { label: "تم الحل", value: resolvedCount, color: "bg-green-50 text-green-600" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-700 text-sm border border-green-200">
          {successMsg}
        </div>
      )}

      {/* New Feedback Form */}
      {view === "new" && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">إرسال شكوى / اقتراح</h2>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">النوع</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: key }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      form.type === key
                        ? `${cfg.bg} ${cfg.color} border-current font-semibold`
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={14} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">الأولوية</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="LOW">منخفضة</option>
                <option value="MEDIUM">متوسطة</option>
                <option value="HIGH">عالية</option>
                <option value="URGENT">عاجلة</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAnonymous}
                  onChange={(e) => setForm((f) => ({ ...f, isAnonymous: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-600">إرسال بشكل مجهول</span>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">العنوان *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="اكتب عنوانًا موجزًا..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">التفاصيل *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="اشرح المشكلة أو الاقتراح بالتفصيل..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {submitting ? "جارٍ الإرسال..." : "إرسال"}
            </button>
            <button
              type="button"
              onClick={() => { setView("list"); setError(""); }}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {view === "list" && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <Loader2 size={32} className="animate-spin mx-auto mb-3" />
              <p className="text-sm">جارٍ التحميل...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Inbox size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">لا توجد شكاوى أو اقتراحات بعد</p>
              <button
                onClick={() => setView("new")}
                className="mt-4 text-blue-600 text-sm underline"
              >
                أرسل أول شكوى أو اقتراح
              </button>
            </div>
          ) : (
            items.map((item) => {
              const tCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.OTHER;
              const sCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
              const TIcon = tCfg.icon;
              const SIcon = sCfg.icon;
              const isOpen = expanded === item._id;
              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <button
                    className="w-full flex items-center gap-3 p-4 text-right"
                    onClick={() => setExpanded(isOpen ? null : item._id)}
                  >
                    <span className={`p-2 rounded-lg ${tCfg.bg}`}>
                      <TIcon size={16} className={tCfg.color} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tCfg.label}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sCfg.bg} ${sCfg.color}`}>
                      <SIcon size={12} className={item.status === "IN_REVIEW" ? "animate-spin" : ""} />
                      {sCfg.label}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      {item.senderName && (
                        <div className="flex items-center gap-2 pt-3 text-xs text-gray-500">
                          <span className="font-semibold text-gray-700">المرسل:</span>
                          <span>{item.senderName}</span>
                          {item.senderEmail && (
                            <span dir="ltr" className="text-gray-400">({item.senderEmail})</span>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 pt-3 leading-relaxed whitespace-pre-wrap">
                        {item.description}
                      </p>

                      {item.adminReply && (
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                          <p className="text-xs font-semibold text-blue-700 mb-1">رد الإدارة:</p>
                          <p className="text-sm text-blue-800">{item.adminReply}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-gray-400">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString("ar-EG", {
                                year: "numeric", month: "short", day: "numeric",
                              })
                            : "تاريخ غير متاح"}
                        </p>
                        {item.status === "PENDING" && (
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={13} /> حذف
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
