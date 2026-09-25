"use client";

import { useState, useEffect, useCallback } from "react";
import { feedbackService } from "@/services/feedback.service";
import {
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
  Filter,
  RefreshCw,
} from "lucide-react";

const TYPE_CONFIG = {
  COMPLAINT: { label: "شكوى", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  SUGGESTION: { label: "اقتراح", icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-50" },
  SCHEDULE_ISSUE: { label: "مشكلة جدول", icon: CalendarX2, color: "text-blue-500", bg: "bg-blue-50" },
  FACILITY: { label: "مرفق", icon: Building2, color: "text-purple-500", bg: "bg-purple-50" },
  OTHER: { label: "أخرى", icon: HelpCircle, color: "text-gray-500", bg: "bg-gray-50" },
};

const STATUS_CONFIG = {
  PENDING: { label: "قيد المراجعة", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
  IN_REVIEW: { label: "جارٍ المراجعة", icon: Loader2, color: "text-blue-500", bg: "bg-blue-50" },
  RESOLVED: { label: "تم الحل", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  REJECTED: { label: "مرفوض", icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
};

const PRIORITY_LABELS = { LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", URGENT: "عاجلة" };

export default function AdminFeedbackPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", type: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      const res = await feedbackService.getAll(params);
      setItems(res.data || res || []);
    } catch {
      setError("تعذّر تحميل الشكاوى");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async (id) => {
    const text = replyText[id]?.trim();
    if (!text) return;
    setSubmittingReply(id);
    try {
      await feedbackService.reply(id, { adminReply: text, status: "RESOLVED" });
      setReplyText((prev) => ({ ...prev, [id]: "" }));
      load();
    } catch {
      setError("تعذّر إرسال الرد");
    } finally {
      setSubmittingReply(null);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await feedbackService.reply(id, { status });
      load();
    } catch {
      setError("تعذّر تحديث الحالة");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل تريد حذف هذا البند نهائيًا؟")) return;
    try {
      await feedbackService.remove(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {
      setError("تعذّر الحذف");
    }
  };

  const stats = {
    total: items.length,
    pending: items.filter((i) => i.status === "PENDING").length,
    resolved: items.filter((i) => i.status === "RESOLVED").length,
    urgent: items.filter((i) => i.priority === "URGENT").length,
  };

  return (
    <div className="p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الشكاوى والاقتراحات</h1>
          <p className="text-sm text-gray-500 mt-1">مراجعة والرد على شكاوى واقتراحات المعلمين</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "الإجمالي", value: stats.total, color: "bg-gray-100 text-gray-700" },
          { label: "قيد المراجعة", value: stats.pending, color: "bg-orange-50 text-orange-600" },
          { label: "تم الحل", value: stats.resolved, color: "bg-green-50 text-green-600" },
          { label: "عاجلة", value: stats.urgent, color: "bg-red-50 text-red-600" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <Filter size={16} className="text-gray-400 self-center" />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" />
            <p className="text-sm">جارٍ التحميل...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Inbox size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">لا توجد شكاوى أو اقتراحات</p>
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
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  item.priority === "URGENT" ? "border-red-200" : "border-gray-200"
                }`}
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
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.isAnonymous ? "مجهول" : item.teacher?.name || "معلم"} · {tCfg.label} ·{" "}
                      {PRIORITY_LABELS[item.priority]}
                    </p>
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
                    <p className="text-sm text-gray-600 pt-3 leading-relaxed whitespace-pre-wrap">
                      {item.description}
                    </p>

                    {item.adminReply && (
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 mb-1">ردك السابق:</p>
                        <p className="text-sm text-blue-800">{item.adminReply}</p>
                      </div>
                    )}

                    {/* Status change */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() => handleStatusChange(item._id, k)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                            item.status === k
                              ? `${v.bg} ${v.color} border-current font-semibold`
                              : "border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    {/* Reply box */}
                    <div className="flex gap-2">
                      <textarea
                        value={replyText[item._id] || ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [item._id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="اكتب ردك هنا..."
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                      />
                      <button
                        onClick={() => handleReply(item._id)}
                        disabled={submittingReply === item._id}
                        className="self-end flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                      >
                        {submittingReply === item._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        رد
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString("ar-EG", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </p>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={13} /> حذف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
