"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { aiService } from "@/services/ai.service";
import { Sparkles, X, Check, Loader2, BookOpen, PenLine, Target, MessageSquare } from "lucide-react";

/** Extract the grade category from a class name.
 *  e.g. "ثاني أول" → "ثاني",  "أول ب" → "أول"
 */
function getClassCategory(className) {
  return String(className || "")
    .trim()
    .split(/\s+/)[0]
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/^ال/, "");
}

/** Deduplicate an array of strings (case-insensitive trim) */
function unique(arr) {
  const seen = new Set();
  return arr.filter((v) => {
    const k = v.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * AI Suggestion Panel for lesson planning.
 *
 * Props:
 *  cell           – the schedule object for this slot
 *  onApply        – (scheduleId, field, value) => void
 *  peerSchedules  – all schedules for the current week (used for same-week peer suggestions)
 */
export default function AILessonSuggest({ cell, onApply, peerSchedules = [] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState("");
  const [appliedKey, setAppliedKey] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // إغلاق النافذة عند الضغط على زر Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!cell || !cell._id) return null;

  const subjectName =
    typeof cell.subject === "object"
      ? cell.subject?.name || ""
      : cell.subject || "";
  const className = cell.className || "";
  const dayName = cell.day || "";
  const periodNum = cell.period || "";

  // ── 1. اقتراحات الأسبوع الحالي (فصول نفس الفئة والمادة) ─────────────────────
  const currentWeekSuggestions = useMemo(() => {
    if (!peerSchedules.length) return null;

    const cellSubjectId =
      typeof cell.subject === "object"
        ? String(cell.subject?._id || "")
        : String(cell.subject || "");

    const cellCategory = getClassCategory(cell.className || "");

    const peers = peerSchedules.filter((s) => {
      if (String(s._id) === String(cell._id)) return false; // تخطي نفس الحصة
      const sSubjectId =
        typeof s.subject === "object"
          ? String(s.subject?._id || "")
          : String(s.subject || "");
      if (sSubjectId !== cellSubjectId) return false; // نفس المادة
      const sCategory = getClassCategory(s.className || "");
      return sCategory === cellCategory && sCategory !== ""; // نفس الفئة الدراسية
    });

    if (!peers.length) return null;

    const fields = ["lessonTitle", "homework", "activities", "notes"];
    const result = {};

    for (const f of fields) {
      const vals = unique(
        peers.map((s) => (s[f] || "").trim()).filter(Boolean)
      );
      if (vals.length) result[f] = vals;
    }

    return Object.keys(result).length ? result : null;
  }, [peerSchedules, cell._id, cell.subject, cell.className]);

  // ── 2. جلب اقتراحات الأسابيع السابقة من الخادم ────────────────────────────
  const fetchPastSuggestions = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        scheduleId: cell._id,
        className: cell.className || "",
        subjectId:
          typeof cell.subject === "object" ? cell.subject?._id : cell.subject,
        day: cell.day,
        period: cell.period,
        weekId: typeof cell.week === "object" ? cell.week?._id : cell.week,
      };
      const res = await aiService.suggestLessonPlan(payload);
      setSuggestions(res.data || res);
    } catch (err) {
      setError(
        err?.response?.data?.message || "تعذر جلب الاقتراحات من الأسابيع السابقة"
      );
    } finally {
      setLoading(false);
    }
  };

  // تبديل الفتح والإغلاق
  const handleToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);

    if (!suggestions && !loading) {
      fetchPastSuggestions();
    }
  };

  const apply = (field, value) => {
    onApply(cell._id, field, value);
    const key = `${field}:::${value}`;
    setAppliedKey(key);
    setTimeout(() => {
      setAppliedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const hasPastSuggestions =
    suggestions &&
    (suggestions.lessonTitle?.length ||
      suggestions.homework?.length ||
      suggestions.activities?.length ||
      suggestions.notes?.length);

  const hasCurrentWeekSugg = Boolean(currentWeekSuggestions);

  return (
    <div className="no-print no-export inline-block">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        title="اقتراحات ذكية بناءً على الأسبوع الحالي والأسابيع السابقة"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black transition-all shadow-xs border cursor-pointer ${
          open
            ? "bg-violet-600 text-white border-violet-700 ring-2 ring-violet-300"
            : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300"
        }`}
      >
        <Sparkles size={13} className={loading ? "animate-spin text-amber-300" : "text-violet-600"} />
        <span>{open ? "إخفاء" : "اقتراح ذكي"}</span>
        {loading && <Loader2 size={11} className="animate-spin text-violet-500" />}
      </button>

      {/* بوب اب مدمج وصغير لا يملأ الشاشة أبداً — بأبعاد محددة وسهولة خروج تامة */}
      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 text-right"
            dir="rtl"
          >
            {/* Backdrop شفاف يغطي الشاشة: النقر في أي مكان خارج البوب اب يغلقه فوراً */}
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* بطاقة البوب اب المدمجة: أقصى عرض 420px وأقصى ارتفاع 70vh */}
            <div
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-[92%] sm:w-[420px] max-w-[420px] max-h-[70vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: شريط علوي أنيق ومدمج مع زر إغلاق صريح ومباشر */}
              <div className="bg-linear-to-r from-violet-700 to-indigo-700 px-3.5 py-2.5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles size={15} className="text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black truncate">اقتراحات التحضير الذكية</h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-violet-200 font-bold truncate">
                      {subjectName && <span>{subjectName}</span>}
                      {className && <span>• فصل {className}</span>}
                      {dayName && <span>• {dayName} (حصة {periodNum})</span>}
                    </div>
                  </div>
                </div>

                {/* زر الخروج الصريح (✕) في رأس النافذة */}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer shrink-0 ml-1 font-bold text-xs"
                  title="إغلاق النافذة"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body: قائمة الاقتراحات مع سكرول داخلي مريح */}
              <div className="overflow-y-auto flex-1 p-3 space-y-3 overscroll-contain">
                {/* ── 1. اقتراحات الأسبوع الحالي ── */}
                {hasCurrentWeekSugg && (
                  <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                      <p className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                        <span>🔄</span>
                        <span>من الأسبوع الحالي (فصول نفس المادة)</span>
                      </p>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                        تطابق مباشر
                      </span>
                    </div>

                    {currentWeekSuggestions.lessonTitle?.length > 0 && (
                      <SuggestSection
                        icon={<BookOpen size={12} className="text-emerald-700" />}
                        label="عنوان الدرس"
                        items={currentWeekSuggestions.lessonTitle}
                        field="lessonTitle"
                        color="emerald"
                        onApply={apply}
                        appliedKey={appliedKey}
                      />
                    )}
                    {currentWeekSuggestions.homework?.length > 0 && (
                      <SuggestSection
                        icon={<PenLine size={12} className="text-emerald-700" />}
                        label="الواجب المنزلي"
                        items={currentWeekSuggestions.homework}
                        field="homework"
                        color="emerald"
                        onApply={apply}
                        appliedKey={appliedKey}
                      />
                    )}
                    {currentWeekSuggestions.activities?.length > 0 && (
                      <SuggestSection
                        icon={<Target size={12} className="text-emerald-700" />}
                        label="الأنشطة"
                        items={currentWeekSuggestions.activities}
                        field="activities"
                        color="emerald"
                        onApply={apply}
                        appliedKey={appliedKey}
                      />
                    )}
                    {currentWeekSuggestions.notes?.length > 0 && (
                      <SuggestSection
                        icon={<MessageSquare size={12} className="text-emerald-700" />}
                        label="الملاحظات"
                        items={currentWeekSuggestions.notes}
                        field="notes"
                        color="emerald"
                        onApply={apply}
                        appliedKey={appliedKey}
                      />
                    )}
                  </div>
                )}

                {/* ── 2. اقتراحات الأسابيع السابقة ── */}
                <div className="space-y-2.5">
                  {loading ? (
                    <div className="p-5 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <Loader2 size={22} className="animate-spin text-violet-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-700">جارٍ فحص خطط الأسابيع السابقة...</p>
                    </div>
                  ) : error ? (
                    <div className="p-3 text-center bg-red-50 rounded-xl border border-red-200">
                      <p className="text-xs font-bold text-red-700">{error}</p>
                      <button
                        type="button"
                        onClick={fetchPastSuggestions}
                        className="mt-1.5 text-xs font-black text-violet-700 hover:underline"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : suggestions ? (
                    <div className="space-y-2.5">
                      {hasPastSuggestions && (
                        <div className="flex items-center gap-1.5 px-0.5">
                          <span className="text-xs">📚</span>
                          <span className="text-[11px] font-black text-slate-700">من الأسابيع السابقة</span>
                          {suggestions.classContext?.weeksAnalyzed > 0 && (
                            <span className="text-[9px] font-bold text-slate-500 mr-auto bg-slate-100 px-1.5 py-0.2 rounded-md">
                              {suggestions.classContext.weeksAnalyzed} أسابيع
                            </span>
                          )}
                        </div>
                      )}

                      {suggestions.lessonTitle?.length > 0 && (
                        <SuggestSection
                          icon={<BookOpen size={12} className="text-blue-700" />}
                          label="عنوان الدرس"
                          items={suggestions.lessonTitle}
                          field="lessonTitle"
                          color="blue"
                          onApply={apply}
                          appliedKey={appliedKey}
                        />
                      )}
                      {suggestions.homework?.length > 0 && (
                        <SuggestSection
                          icon={<PenLine size={12} className="text-amber-700" />}
                          label="الواجب"
                          items={suggestions.homework}
                          field="homework"
                          color="amber"
                          onApply={apply}
                          appliedKey={appliedKey}
                        />
                      )}
                      {suggestions.activities?.length > 0 && (
                        <SuggestSection
                          icon={<Target size={12} className="text-blue-700" />}
                          label="الأنشطة"
                          items={suggestions.activities}
                          field="activities"
                          color="blue"
                          onApply={apply}
                          appliedKey={appliedKey}
                        />
                      )}
                      {suggestions.notes?.length > 0 && (
                        <SuggestSection
                          icon={<MessageSquare size={12} className="text-amber-700" />}
                          label="الملاحظات"
                          items={suggestions.notes}
                          field="notes"
                          color="amber"
                          onApply={apply}
                          appliedKey={appliedKey}
                        />
                      )}

                      {!hasPastSuggestions && !hasCurrentWeekSugg && (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <div className="text-2xl mb-1">📭</div>
                          <p className="text-xs font-bold text-slate-700">لا توجد اقتراحات سابقة كافية لهذه المادة بعد</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">ستتوفر فور تسجيل خطط الأسابيع القادمة</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Footer: شريط سفلي مدمج مع زر إغلاق صريح */}
              <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold text-slate-500">
                  💡 انقر على الاقتراح لإدراجه فوراً
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-lg transition cursor-pointer shadow-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function SuggestSection({ icon, label, items, field, color, onApply, appliedKey }) {
  const colorMap = {
    blue: "bg-blue-50/70 border-blue-200 text-blue-900 hover:bg-blue-100 hover:border-blue-400",
    amber: "bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100 hover:border-amber-400",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400",
  };
  const headerColor = {
    blue: "text-blue-800",
    amber: "text-amber-800",
    emerald: "text-emerald-800",
  };

  return (
    <div className="space-y-1">
      <p className={`text-[10px] font-black ${headerColor[color]} flex items-center gap-1`}>
        <span>{icon}</span>
        <span>{label}</span>
      </p>
      <div className="grid grid-cols-1 gap-1">
        {items.slice(0, 4).map((item, idx) => {
          const isApplied = appliedKey === `${field}:::${item}`;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onApply(field, item)}
              title={`انقر لتطبيق: ${item}`}
              className={`w-full text-right text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all flex items-start justify-between gap-2 cursor-pointer shadow-2xs ${
                isApplied
                  ? "bg-emerald-500 text-white border-emerald-600 ring-1 ring-emerald-300"
                  : colorMap[color]
              }`}
            >
              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                <span className="text-[9px] font-black opacity-60 mt-0.5 shrink-0">
                  {idx + 1}.
                </span>
                <span className="leading-snug break-words">{item}</span>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-[9px] font-black mt-0.5">
                {isApplied ? (
                  <span className="flex items-center gap-1">
                    <Check size={11} strokeWidth={3} />
                    <span>تم</span>
                  </span>
                ) : (
                  <span className="opacity-60 hover:opacity-100">
                    تطبيق ↵
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
