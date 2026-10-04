"use client";

import { useState, useMemo } from "react";
import { aiService } from "@/services/ai.service";

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

  if (!cell || !cell._id) return null;

  // ── Current-week peer suggestions (purely local, no API call) ────────────
  const currentWeekSuggestions = useMemo(() => {
    if (!peerSchedules.length) return null;

    const cellSubjectId = typeof cell.subject === "object"
      ? String(cell.subject?._id || "")
      : String(cell.subject || "");

    const cellCategory = getClassCategory(cell.className || "");

    // Find schedules of the same subject + same class category (≠ current cell)
    const peers = peerSchedules.filter((s) => {
      if (String(s._id) === String(cell._id)) return false;       // skip self
      const sSubjectId = typeof s.subject === "object"
        ? String(s.subject?._id || "")
        : String(s.subject || "");
      if (sSubjectId !== cellSubjectId) return false;             // must be same subject
      const sCategory = getClassCategory(s.className || "");
      return sCategory === cellCategory && sCategory !== "";      // same grade category
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

  // ── Past-weeks suggestions (from backend API) ────────────────────────────
  const handleFetch = async () => {
    if (open && (suggestions || error)) { setOpen(false); return; }
    setOpen(true);
    if (suggestions) return; // already loaded

    setLoading(true);
    setError("");
    try {
      const payload = {
        scheduleId: cell._id,
        className: cell.className || "",
        subjectId: typeof cell.subject === "object" ? cell.subject?._id : cell.subject,
        day: cell.day,
        period: cell.period,
        weekId: typeof cell.week === "object" ? cell.week?._id : cell.week,
      };
      const res = await aiService.suggestLessonPlan(payload);
      setSuggestions(res.data || res);
    } catch (err) {
      setError(err?.response?.data?.message || "فشل جلب الاقتراحات");
    } finally {
      setLoading(false);
    }
  };

  const apply = (field, value) => {
    onApply(cell._id, field, value);
  };

  const hasPastSuggestions = suggestions && (
    suggestions.lessonTitle?.length ||
    suggestions.homework?.length ||
    suggestions.activities?.length ||
    suggestions.notes?.length
  );

  const hasCurrentWeekSugg = Boolean(currentWeekSuggestions);

  return (
    <div className="no-print no-export relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleFetch}
        title="اقتراحات ذكية بناء على الأسابيع السابقة والأسبوع الحالي"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all shadow-xs border ${
          open
            ? "bg-violet-600 text-white border-violet-700"
            : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
        }`}
      >
        <span>✨</span>
        <span>{open && !loading ? "إخفاء" : "اقتراح ذكي"}</span>
        {loading && <span className="animate-spin text-[8px]">⏳</span>}
      </button>

      {/* Suggestions Dropdown */}
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-80 bg-white border border-violet-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-violet-600 to-purple-600 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm">✨</span>
              <span className="text-white text-xs font-black">اقتراحات ذكية</span>
            </div>
            <div className="text-violet-200 text-[10px] font-semibold">
              {suggestions?.classContext
                ? `${suggestions.classContext.weeksAnalyzed} أسابيع سابقة`
                : ""}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">

            {/* ── Section 1: Current-week peer suggestions (instant, no API) ── */}
            {hasCurrentWeekSugg && (
              <div className="p-2 space-y-2 border-b border-emerald-100 bg-emerald-50/40">
                <p className="text-[10px] font-black text-emerald-700 flex items-center gap-1 px-1">
                  <span>🔄</span>
                  <span>من الأسبوع الحالي — فصول نفس الفئة</span>
                </p>

                {currentWeekSuggestions.lessonTitle?.length > 0 && (
                  <SuggestSection
                    icon="📖"
                    label="عنوان الدرس"
                    items={currentWeekSuggestions.lessonTitle}
                    field="lessonTitle"
                    color="emerald"
                    onApply={apply}
                  />
                )}
                {currentWeekSuggestions.homework?.length > 0 && (
                  <SuggestSection
                    icon="📝"
                    label="الواجب"
                    items={currentWeekSuggestions.homework}
                    field="homework"
                    color="emerald"
                    onApply={apply}
                  />
                )}
                {currentWeekSuggestions.activities?.length > 0 && (
                  <SuggestSection
                    icon="🎯"
                    label="الأنشطة"
                    items={currentWeekSuggestions.activities}
                    field="activities"
                    color="emerald"
                    onApply={apply}
                  />
                )}
                {currentWeekSuggestions.notes?.length > 0 && (
                  <SuggestSection
                    icon="💬"
                    label="الملاحظات"
                    items={currentWeekSuggestions.notes}
                    field="notes"
                    color="emerald"
                    onApply={apply}
                  />
                )}
              </div>
            )}

            {/* ── Section 2: Past-weeks suggestions (from API) ── */}
            {loading ? (
              <div className="p-4 text-center">
                <div className="text-2xl animate-pulse mb-1">🤔</div>
                <p className="text-xs text-gray-500 font-medium">جارٍ تحليل الأسابيع السابقة...</p>
              </div>
            ) : error ? (
              <div className="p-3 text-center">
                <p className="text-xs text-red-600 font-bold">{error}</p>
                <button
                  type="button"
                  onClick={() => { setSuggestions(null); handleFetch(); }}
                  className="mt-2 text-xs text-violet-600 hover:underline font-semibold"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : suggestions ? (
              <div className="p-2 space-y-2">
                {hasPastSuggestions && (
                  <p className="text-[10px] font-black text-slate-500 flex items-center gap-1 px-1">
                    <span>📚</span>
                    <span>من الأسابيع السابقة</span>
                  </p>
                )}

                {suggestions.lessonTitle?.length > 0 && (
                  <SuggestSection
                    icon="📖"
                    label="عنوان الدرس"
                    items={suggestions.lessonTitle}
                    field="lessonTitle"
                    color="blue"
                    onApply={apply}
                  />
                )}
                {suggestions.homework?.length > 0 && (
                  <SuggestSection
                    icon="📝"
                    label="الواجب المنزلي"
                    items={suggestions.homework}
                    field="homework"
                    color="amber"
                    onApply={apply}
                  />
                )}
                {suggestions.activities?.length > 0 && (
                  <SuggestSection
                    icon="🎯"
                    label="الأنشطة"
                    items={suggestions.activities}
                    field="activities"
                    color="blue"
                    onApply={apply}
                  />
                )}
                {suggestions.notes?.length > 0 && (
                  <SuggestSection
                    icon="💬"
                    label="الملاحظات"
                    items={suggestions.notes}
                    field="notes"
                    color="amber"
                    onApply={apply}
                  />
                )}

                {!hasPastSuggestions && !hasCurrentWeekSugg && (
                  <div className="p-3 text-center">
                    <div className="text-2xl mb-1">📭</div>
                    <p className="text-xs text-gray-500 font-semibold">
                      لا توجد بيانات كافية من الأسابيع السابقة
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      ستظهر الاقتراحات بعد تسجيل بضعة أسابيع
                    </p>
                  </div>
                )}

                {suggestions.classContext?.totalPastLessons > 0 && (
                  <div className="border-t border-gray-100 pt-1.5 text-center">
                    <p className="text-[10px] text-gray-400 font-medium">
                      بناءً على {suggestions.classContext.totalPastLessons} حصة سابقة
                      {cell.className ? ` لفصل ${cell.className}` : ""}
                    </p>
                  </div>
                )}
              </div>
            ) : !hasCurrentWeekSugg ? (
              <div className="p-4 text-center">
                <div className="text-2xl mb-1">📭</div>
                <p className="text-xs text-gray-500 font-semibold">لا توجد اقتراحات متاحة</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestSection({ icon, label, items, field, color, onApply }) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-100 text-blue-800 hover:bg-blue-100 hover:border-blue-300",
    amber: "bg-amber-50 border-amber-100 text-amber-800 hover:bg-amber-100 hover:border-amber-300",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300",
  };
  const headerColor = {
    blue: "text-blue-700",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
  };

  return (
    <div className="space-y-1">
      <p className={`text-[10px] font-black ${headerColor[color]} flex items-center gap-1`}>
        <span>{icon}</span>
        <span>{label}</span>
      </p>
      <div className="space-y-0.5">
        {items.slice(0, 4).map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onApply(field, item)}
            title={`انقر لتطبيق: ${item}`}
            className={`w-full text-right text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${colorMap[color]}`}
          >
            <span className="text-[9px] font-black opacity-60 ml-1">{idx + 1}.</span>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
