"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService } from "@/services/schedules.service";

const DAYS_ORDER = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function PdfTimetableImportModal({
  isOpen,
  onClose,
  weeks = [],
  currentWeek,
  teachers = [],
  subjects = [],
  onImportSuccess,
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  // States
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState(
    currentWeek?._id || weeks[0]?._id || ""
  );

  // Parsed results
  const [parsedTimetables, setParsedTimetables] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [step, setStep] = useState("upload"); // "upload" | "review"

  // Previewing a single timetable's grid
  const [previewTimetable, setPreviewTimetable] = useState(null);

  // Filter in review step
  const [filterAction, setFilterAction] = useState("all"); // "all" | "assign" | "vacant" | "skip"

  const handleReset = () => {
    setFile(null);
    setParsedTimetables([]);
    setStep("upload");
    setPreviewTimetable(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        toast.error("يرجى اختيار ملف بصيغة PDF فقط");
        return;
      }
      setFile(selected);
    }
  };

  const handleUploadAndParse = async () => {
    if (!file) {
      toast.error("يرجى اختيار ملف PDF أولاً");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await schedulesService.importPdf(formData);
      const list = res.data?.timetables || [];

      if (list.length === 0) {
        toast.error("لم يتم العثور على جداول صالحة داخل الملف");
        return;
      }

      setParsedTimetables(list);
      setAvailableTeachers(res.data?.availableTeachers || teachers);
      setStep("review");
      toast.success(res.message || `تم استخراج ${list.length} جدول بنجاح 📄`);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "فشل استخراج الجداول من ملف الـ PDF. تأكد من سلامة الملف."
      );
    } finally {
      setLoading(false);
    }
  };

  // Update a specific timetable's action or target teacher
  const handleUpdateTimetable = (index, updates) => {
    setParsedTimetables((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Bulk actions
  const handleSetAllAction = (newAction) => {
    setParsedTimetables((prev) =>
      prev.map((t) => ({
        ...t,
        action: newAction,
      }))
    );
  };

  // Confirm import
  const handleConfirmImport = async () => {
    const activeWeekId = selectedWeekId || currentWeek?._id || weeks[0]?._id;
    if (!activeWeekId) {
      toast.error("يرجى تحديد الأسبوع المستهدف لتطبيق الجداول");
      return;
    }

    const payloadTimetables = parsedTimetables.map((t) => ({
      extractedName: t.extractedName,
      action: t.action, // "assign" | "vacant" | "skip"
      targetTeacherId: t.action === "assign" ? t.matchedTeacherId : null,
      subjects: t.subjects,
      entries: t.entries,
    }));

    setConfirming(true);
    try {
      const res = await schedulesService.confirmImportPdf({
        weekId: activeWeekId,
        timetables: payloadTimetables,
      });

      toast.success(res.message || "تم حفظ واستيراد الجداول بنجاح 🎉");
      if (onImportSuccess) {
        onImportSuccess(res.data);
      }
      handleReset();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل إتمام عملية الاستيراد");
    } finally {
      setConfirming(false);
    }
  };

  const assignedCount = parsedTimetables.filter((t) => t.action === "assign").length;
  const vacantCount = parsedTimetables.filter((t) => t.action === "vacant").length;
  const skippedCount = parsedTimetables.filter((t) => t.action === "skip").length;

  const filteredTimetables = parsedTimetables.filter((t) => {
    if (filterAction === "all") return true;
    return t.action === filterAction;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!confirming && !loading) {
          handleReset();
          onClose();
        }
      }}
      title="📥 استيراد جداول المعلمين من ملف PDF"
      size="2xl"
      footer={
        step === "upload" ? (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleUploadAndParse}
              disabled={!file || loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>جاري قراءة واستخراج الجداول...</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>معالجة واستخراج الجداول</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
            <button
              type="button"
              onClick={() => setStep("upload")}
              disabled={confirming}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
            >
              ← رجوع لاختيار ملف آخر
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold hidden sm:inline">
                ({assignedCount} معلم، {vacantCount} شاغر)
              </span>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={confirming || (assignedCount === 0 && vacantCount === 0)}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
              >
                {confirming ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>جاري الحفظ في النظام...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>
                      اعتماد واستيراد الجداول ({assignedCount + vacantCount})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )
      }
    >
      {/* ── STEP 1: UPLOAD ── */}
      {step === "upload" && (
        <div className="space-y-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 font-medium leading-relaxed space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-sm text-emerald-900">
              <span>💡</span>
              <span>كيف تعمل خاصية استيراد الجداول من PDF؟</span>
            </p>
            <p>
              ارفع ملف الـ PDF المصدّر من برنامج الجداول المدرسية (مثل <strong>aSc Timetables</strong> أو <strong>نظام نور</strong> أو جداول الإكسل المصدرة كـ PDF).
              سيقوم النظام آلياً بقراءة الجداول، والتعرف على أسماء المعلمين وحصصهم، ومطابقتها مع المعلمين المسجلين لديك.
            </p>
            <p className="text-emerald-800 text-[11px]">
              ✨ الجداول التي ليس لها معلّم مسجل سيتم تحويلها تلقائياً إلى <strong>جداول شاغرة (قوالب مستقلة)</strong> يختار منها المعلمون الجدد عند تسجيلهم!
            </p>
          </div>

          {/* Drag & Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              file
                ? "border-emerald-500 bg-emerald-50/40"
                : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl shadow-xs">
              📄
            </div>

            <div>
              <p className="font-black text-sm text-gray-900">
                {file ? file.name : "انقر لاختيار ملف PDF أو اسحبه وأفلته هنا"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {file
                  ? `الحجم: ${(file.size / (1024 * 1024)).toFixed(2)} ميجابايت`
                  : "ملف PDF يحتوي على جدول عام أو جداول المعلمين (حتى 25 ميجابايت)"}
              </p>
            </div>

            {file && (
              <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-3 py-1 rounded-full">
                تم اختيار الملف بنجاح ✅
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: REVIEW & ASSIGN ── */}
      {step === "review" && (
        <div className="space-y-5">
          {/* Target Week Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                📅 الأسبوع المستهدف لتطبيق الجداول:
              </span>
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="px-3 py-1.5 text-xs font-black bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {weeks.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500 font-bold">تحديد الكل:</span>
              <button
                type="button"
                onClick={() => handleSetAllAction("vacant")}
                className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-emerald-800 cursor-pointer"
              >
                جداول شاغرة 📋
              </button>
              <button
                type="button"
                onClick={() => handleSetAllAction("skip")}
                className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 cursor-pointer"
              >
                تخطي الكل ⏭️
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setFilterAction("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterAction === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              الكل ({parsedTimetables.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAction("assign")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                filterAction === "assign"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100"
              }`}
            >
              <span>👤 تعيين لمعلم مسجل</span>
              <span className="bg-white/25 px-1.5 py-0.2 rounded-full text-[10px]">
                {assignedCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterAction("vacant")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                filterAction === "vacant"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <span>📋 جدول شاغر (قالب)</span>
              <span className="bg-white/25 px-1.5 py-0.2 rounded-full text-[10px]">
                {vacantCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterAction("skip")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterAction === "skip"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              تخطي ({skippedCount})
            </button>
          </div>

          {/* Timetable Cards List */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredTimetables.map((tpl, idx) => {
              const realIndex = parsedTimetables.findIndex(
                (p) => p.pageNumber === tpl.pageNumber && p.extractedName === tpl.extractedName
              );

              return (
                <div
                  key={`${tpl.pageNumber}-${idx}`}
                  className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                    tpl.action === "assign"
                      ? "bg-blue-50/40 border-blue-200"
                      : tpl.action === "vacant"
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-gray-50 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-gray-900">
                          {tpl.extractedName}
                        </span>
                        <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-md text-gray-600 font-bold">
                          صفحة {tpl.pageNumber}
                        </span>
                        {tpl.matchConfidence >= 55 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-md">
                            تطابق اسم {tpl.matchConfidence}%
                          </span>
                        )}
                      </div>

                      {/* Stats & badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-lg">
                          📊 {tpl.entriesCount} حصة
                        </span>
                        {tpl.subjects && tpl.subjects.length > 0 && (
                          <span className="font-semibold text-slate-700">
                            📚 المواد: {tpl.subjects.join("، ")}
                          </span>
                        )}
                        {tpl.classes && tpl.classes.length > 0 && (
                          <span className="font-semibold text-slate-600">
                            🏫 الفصول: {tpl.classes.slice(0, 4).join("، ")}
                            {tpl.classes.length > 4 ? "..." : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preview Grid Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewTimetable(tpl)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      👁️ معاينة الحصص ({tpl.entriesCount})
                    </button>
                  </div>

                  {/* Action Selector Bar */}
                  <div className="pt-2 border-t border-gray-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-gray-700 shrink-0">
                        الإجراء:
                      </span>
                      <select
                        value={tpl.action}
                        onChange={(e) =>
                          handleUpdateTimetable(realIndex, { action: e.target.value })
                        }
                        className="px-3 py-1.5 text-xs font-black bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="assign">👤 تعيين لمعلم مسجل</option>
                        <option value="vacant">📋 جدول شاغر (قالب مستقل)</option>
                        <option value="skip">⏭️ تخطي (عدم الاستيراد)</option>
                      </select>
                    </div>

                    {tpl.action === "assign" && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs font-bold text-blue-900 shrink-0">
                          اختر المعلم:
                        </span>
                        <select
                          value={tpl.matchedTeacherId || ""}
                          onChange={(e) =>
                            handleUpdateTimetable(realIndex, {
                              matchedTeacherId: e.target.value,
                              matchedTeacherName:
                                availableTeachers.find((t) => t._id === e.target.value)?.name || "",
                            })
                          }
                          className="flex-1 sm:w-64 px-3 py-1.5 text-xs font-black bg-white border border-blue-300 text-blue-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">-- اختر المعلم من القائمة --</option>
                          {availableTeachers.map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.name}
                              {t.subjects && t.subjects.length > 0
                                ? ` (${t.subjects.map((s) => s.name).join("، ")})`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PREVIEW SINGLE TIMETABLE MODAL / DRAWER ── */}
      {previewTimetable && (
        <Modal
          isOpen={Boolean(previewTimetable)}
          onClose={() => setPreviewTimetable(null)}
          title={`👁️ معاينة حصص: ${previewTimetable.extractedName}`}
          size="lg"
          footer={
            <button
              type="button"
              onClick={() => setPreviewTimetable(null)}
              className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl cursor-pointer"
            >
              إغلاق المعاينة
            </button>
          }
        >
          <div className="space-y-4">
            <div className="text-xs text-gray-500 font-semibold">
              إجمالي الحصص المستخرجة:{" "}
              <strong className="text-blue-600">
                {previewTimetable.entriesCount}
              </strong>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-center">
                    <th className="p-2 border border-slate-700">اليوم</th>
                    {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                      <th key={p} className="p-2 border border-slate-700 w-24">
                        حصة {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS_ORDER.map((day) => (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="p-2 border border-gray-200 font-black text-center bg-gray-100 text-slate-800">
                        {day}
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                        const entry = (previewTimetable.entries || []).find(
                          (e) => e.day === day && Number(e.period) === p
                        );
                        return (
                          <td
                            key={p}
                            className="p-1.5 border border-gray-200 text-center align-top"
                          >
                            {entry ? (
                              <div className="bg-blue-50 border border-blue-200 p-1 rounded-lg">
                                <p className="font-bold text-slate-900">
                                  {entry.className || "عام"}
                                </p>
                                <p className="text-[10px] text-blue-700 font-semibold">
                                  {entry.subjectName}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[10px]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

