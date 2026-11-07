"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { usersService } from "@/services/users.service";
import { weeksService, schedulesService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import { timetableTemplatesService } from "@/services/timetableTemplates.service";
import TeacherTimetableGrid from "@/components/schedule/TeacherTimetableGrid";
import MasterTimetableGrid from "@/components/schedule/MasterTimetableGrid";
import PeriodTimingsModal from "@/components/schedule/PeriodTimingsModal";
import TemplateEntriesEditorModal from "@/components/schedule/TemplateEntriesEditorModal";
import PdfTimetableImportModal from "@/components/schedule/PdfTimetableImportModal";
import TeacherWeeklyPlanModal from "@/components/schedule/TeacherWeeklyPlanModal";
import ExportButtons from "@/components/schedule/ExportButtons";
import Modal from "@/components/ui/Modal";
import { Skeleton, ErrorBoundary } from "@/components/ui";

const COMMON_CLASSES = [
  "أول أول",
  "أول ثاني",
  "ثاني أول",
  "ثاني ثاني",
  "ثاني ثالث",
  "ثالث أول",
  "ثالث ثاني",
];

export default function AdminTeacherTimetablesPage() {
  const toast = useToast();

  const [activeMainTab, setActiveMainTab] = useState("master"); // 'master' | 'single' | 'templates'
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);

  // Single teacher schedules & all-week schedules
  const [singleSchedules, setSingleSchedules] = useState([]);
  const [allWeekSchedules, setAllWeekSchedules] = useState([]);

  // Timetable Templates (Vacant Slots)
  const [templates, setTemplates] = useState([]);
  const [newTemplateModalOpen, setNewTemplateModalOpen] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState({
    name: "",
    subjects: [],
  });
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTemplateForAssign, setSelectedTemplateForAssign] =
    useState(null);
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timingsModalOpen, setTimingsModalOpen] = useState(false);

  // Single Cell Edit Modal
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [activeDay, setActiveDay] = useState("");
  const [activePeriod, setActivePeriod] = useState(1);
  const [activeCellData, setActiveCellData] = useState({
    className: "",
    subject: "",
    room: "",
  });

  // Swap / Move Period States
  const [showSwapSection, setShowSwapSection] = useState(false);
  const [swapTargetDay, setSwapTargetDay] = useState("");
  const [swapTargetPeriod, setSwapTargetPeriod] = useState(1);
  const [swapping, setSwapping] = useState(false);

  // PDF Import Modal
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Plan Modal
  const [planModalOpen, setPlanModalOpen] = useState(false);

  // 1. Load Initial Metadata
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [teachersRes, weeksRes, currentWeekRes, subjectsRes, settingsRes] =
          await Promise.all([
            usersService.getTeachers(),
            weeksService.getAll(),
            weeksService.getCurrent(),
            subjectsService.getAll({ isActive: true }),
            settingsService.get(),
          ]);

        const teachersList = teachersRes.data || [];
        const weeksList = weeksRes.data || [];
        const currentWeek = currentWeekRes.data || weeksList[0] || null;
        setTeachers(teachersList);
        setWeeks(weeksList);
        setSubjects(subjectsRes.data || []);
        setSettings(settingsRes.data || null);

        if (teachersList.length > 0) setSelectedTeacherId(teachersList[0]._id);
        if (currentWeek?._id) setSelectedWeekId(currentWeek._id);
      } catch {
        toast.error("فشل تحميل البيانات الأساسية");
      } finally {
        setLoading(false);
      }
    };
    init();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await timetableTemplatesService.getAll({ includeAll: true });
      setTemplates(res.data || []);
    } catch {
      // ignore
    }
  };

  const fetchWeekData = async (weekId = selectedWeekId) => {
    if (!weekId) return;
    try {
      setLoading(true);
      const res = await schedulesService.getByWeek(weekId);
      const raw = res.data?.schedules || [];
      // Deduplicate to guarantee clean rendering
      const seen = new Set();
      const clean = [];
      for (const s of raw) {
        const key = `${s.day}_${s.period}_${s.teacher?._id || s.teacher || s.customTeacherName || ""}_${(s.className || "").trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          clean.push(s);
        }
      }
      setAllWeekSchedules(clean);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherSchedule = async (
    teacherId = selectedTeacherId,
    weekId = selectedWeekId,
  ) => {
    if (!teacherId || !weekId) return;
    try {
      const res = await schedulesService.getTeacherTimetable(teacherId, weekId);
      const raw = res.data?.schedules || [];
      // Deduplicate to guarantee strictly 1 schedule per slot
      const seen = new Set();
      const clean = [];
      for (const s of raw) {
        const key = `${s.day}_${s.period}`;
        if (!seen.has(key)) {
          seen.add(key);
          clean.push(s);
        }
      }
      setSingleSchedules(clean);
    } catch {
      toast.error("فشل جلب جدول حصص المعلم");
    }
  };

  useEffect(() => {
    if (selectedWeekId) {
      fetchWeekData(selectedWeekId);
    }
  }, [selectedWeekId]);

  useEffect(() => {
    if (selectedTeacherId && selectedWeekId) {
      fetchTeacherSchedule(selectedTeacherId, selectedWeekId);
    }
  }, [selectedTeacherId, selectedWeekId]);

  const selectedTeacher = teachers.find((t) => t._id === selectedTeacherId);
  const selectedWeek = weeks.find((w) => w._id === selectedWeekId);

  // Calculate teacher weekly periods count
  const teacherClassCounts = {};
  allWeekSchedules.forEach((s) => {
    const tId = s.teacher?._id || (typeof s.teacher === "string" ? s.teacher : null);
    if (tId) {
      teacherClassCounts[tId] = (teacherClassCounts[tId] || 0) + 1;
    }
  });

  // Filter teachers for tab 2
  const filteredTeachersForTab = teachers.filter((t) => {
    if (!teacherSearchQuery.trim()) return true;
    const q = teacherSearchQuery.toLowerCase();
    const matchName = t.name?.toLowerCase().includes(q);
    const matchSubj = t.subjects?.some((s) => s.name?.toLowerCase().includes(q));
    return matchName || matchSubj;
  });

  // Single View Cell Click
  const handleCellClick = (currentCell, day, period) => {
    setActiveDay(day);
    setActivePeriod(Number(period) || 1);
    setShowSwapSection(false);
    setSwapTargetDay(day);
    setSwapTargetPeriod(Number(period) === 1 ? 2 : 1);

    const defaultSubjectId =
      selectedTeacher?.subjects && selectedTeacher.subjects.length > 0
        ? selectedTeacher.subjects[0]._id || selectedTeacher.subjects[0]
        : subjects[0]?._id || "";

    if (currentCell) {
      setActiveCellData({
        className: currentCell.className || "",
        subject:
          currentCell.subject?._id || currentCell.subject || defaultSubjectId,
        room: currentCell.room || "",
      });
    } else {
      setActiveCellData({ className: "", subject: defaultSubjectId, room: "" });
    }
    setCellModalOpen(true);
  };

  const handleExecuteSwap = async () => {
    if (
      swapTargetDay === activeDay &&
      Number(swapTargetPeriod) === Number(activePeriod)
    ) {
      toast.error("يرجى اختيار يوم أو حصة مختلفة للنقل أو التبديل");
      return;
    }

    setSwapping(true);
    try {
      const res = await schedulesService.swapPeriod({
        weekId: selectedWeekId,
        teacherId: selectedTeacherId,
        fromDay: activeDay,
        fromPeriod: activePeriod,
        toDay: swapTargetDay,
        toPeriod: Number(swapTargetPeriod),
      });

      toast.success(res.message || "تم نقل / تبديل الحصة بنجاح ✅");
      setCellModalOpen(false);
      setShowSwapSection(false);
      fetchTeacherSchedule(selectedTeacherId, selectedWeekId);
      fetchWeekData(selectedWeekId);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل نقل أو تبديل الحصة");
    } finally {
      setSwapping(false);
    }
  };

  const persistSingleTimetable = async (updatedSchedules) => {
    if (!selectedTeacherId || !selectedWeekId) return;
    setSaving(true);
    try {
      // Deduplicate entries strictly before sending
      const seen = new Set();
      const payloadEntries = [];
      for (const s of updatedSchedules) {
        const key = `${s.day}_${Number(s.period)}`;
        if (!seen.has(key)) {
          seen.add(key);
          payloadEntries.push({
            day: s.day,
            period: Number(s.period),
            subject: s.subject?._id || s.subject,
            className: (s.className || "").trim(),
            room: (s.room || "").trim(),
            lessonTitle: s.lessonTitle || "",
            homework: s.homework || "",
            activities: s.activities || "",
            notes: s.notes || "",
          });
        }
      }

      await schedulesService.saveTeacherTimetable({
        teacherId: selectedTeacherId,
        weekId: selectedWeekId,
        entries: payloadEntries,
      });

      await fetchWeekData(selectedWeekId);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل الحفظ التلقائي");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCellData = async (e) => {
    e?.preventDefault();
    if (!activeCellData.className.trim()) {
      toast.error("يرجى تحديد أو كتابة اسم الفصل/الصف");
      return;
    }

    const fullSubject = subjects.find((s) => s._id === activeCellData.subject);
    const cellObj = {
      day: activeDay,
      period: Number(activePeriod),
      subject: fullSubject || activeCellData.subject,
      className: activeCellData.className.trim(),
      room: activeCellData.room.trim(),
      teacher: selectedTeacherId,
      week: selectedWeekId,
    };

    // Filter out any existing cell for this slot to eliminate duplicates
    const filtered = singleSchedules.filter(
      (s) => !(s.day === activeDay && Number(s.period) === Number(activePeriod)),
    );
    const updated = [...filtered, cellObj];

    const saved = await persistSingleTimetable(updated);
    if (!saved) return;
    setSingleSchedules(updated);
    setCellModalOpen(false);
    toast.success(
      "تم حفظ الحصة (" +
        activePeriod +
        ") يوم " +
        activeDay +
        " — " +
        activeCellData.className,
    );
  };

  // Create Timetable Template (No fake user!)
  const handleCreateTemplate = async (e) => {
    e?.preventDefault();
    if (!newTemplateData.name.trim()) {
      toast.error("يرجى إدخال اسم الجدول الشاغر (مثال: معلم رياضيات - شاغر 1)");
      return;
    }
    setCreatingTemplate(true);
    try {
      const res = await timetableTemplatesService.create({
        name: newTemplateData.name.trim(),
        subjects: newTemplateData.subjects,
      });

      toast.success(res.message || "تم إنشاء الجدول الشاغر بنجاح ✅");
      setNewTemplateModalOpen(false);
      setNewTemplateData({ name: "", subjects: [] });
      fetchTemplates();

      // Automatically open editor for newly created template
      if (res.data?._id) {
        setEditingTemplate(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل إنشاء الجدول الشاغر");
    } finally {
      setCreatingTemplate(false);
    }
  };

  // Assign template to existing registered teacher
  const handleAssignTemplate = async (e) => {
    e?.preventDefault();
    if (!selectedTemplateForAssign || !targetTeacherId) {
      toast.error("يرجى اختيار المعلم المستهدف للتعيين");
      return;
    }
    setAssigning(true);
    try {
      const res = await timetableTemplatesService.assignToTeacher(
        selectedTemplateForAssign._id,
        targetTeacherId,
        selectedWeekId || undefined,
      );

      toast.success(res.message || "تم تعيين الجدول للمعلم بنجاح ✅");
      setAssignModalOpen(false);
      setSelectedTemplateForAssign(null);
      setTargetTeacherId("");

      const teachersRes = await usersService.getTeachers();
      setTeachers(teachersRes.data || []);
      fetchTemplates();
      fetchWeekData(selectedWeekId);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل تعيين الجدول");
    } finally {
      setAssigning(false);
    }
  };

  // Delete vacant template
  const handleDeleteTemplate = async (templateId, templateName) => {
    if (
      !window.confirm(`هل أنت متأكد من حذف الجدول الشاغر "${templateName}"؟`)
    ) {
      return;
    }
    try {
      await timetableTemplatesService.remove(templateId);
      toast.success("تم حذف الجدول الشاغر بنجاح");
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل حذف الجدول");
    }
  };

  // Unclaim / release template
  const handleUnclaimTemplate = async (templateId, templateName) => {
    if (
      !window.confirm(
        `هل تريد إلغاء تعيين الجدول "${templateName}" وإتاحته كجدول شاغر مجدداً؟`,
      )
    ) {
      return;
    }
    try {
      await timetableTemplatesService.unclaim(templateId);
      toast.success("تم إلغاء تعيين الجدول وأصبح متاحاً للاختيار بنجاح ✅");
      fetchTemplates();
      fetchWeekData(selectedWeekId);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل إلغاء تعيين الجدول");
    }
  };

  const handleClearCell = async () => {
    const updated = singleSchedules.filter(
      (s) =>
        !(s.day === activeDay && Number(s.period) === Number(activePeriod)),
    );
    setSingleSchedules(updated);
    setCellModalOpen(false);
    const saved = await persistSingleTimetable(updated);
    if (saved) {
      toast.info("تم تفريغ الحصة (" + activePeriod + ") يوم " + activeDay);
    }
  };

  const handleMasterScheduleUpdated = () => {
    fetchWeekData(selectedWeekId);
    if (selectedTeacherId) {
      fetchTeacherSchedule(selectedTeacherId, selectedWeekId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 p-3 sm:p-5 lg:p-8 space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold mb-1.5">
            <span>🗓️ النظام المدرسي لتوزيع الحصص والجداول</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            إدارة وتوزيع جداول المعلمين
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            الجدول العام المجمع للمدرسة، جداول المعلمين الفردية للطباعة، وإدارة الجداول الشاغرة.
          </p>
        </div>

        {/* Global Action / Export based on active tab */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeMainTab !== "templates" && (
            <ExportButtons
              targetElementId={
                activeMainTab === "master"
                  ? "master-timetable-print-container"
                  : "teacher-paper-timetable-container"
              }
              weekLabel={
                activeMainTab === "master"
                  ? "الخطة_العامة_للمدرسة_" + (selectedWeek?.label || "")
                  : "خطة_المعلم_" +
                    (selectedTeacher?.name?.replace(/\s+/g, "_") || "") +
                    "_" +
                    (selectedWeek?.label || "")
              }
            />
          )}
        </div>
      </div>

      {/* 3 Main Distinct Sections Navigation */}
      <section className="bg-white rounded-[1.5rem] p-3.5 sm:p-4 border border-slate-200 shadow-sm space-y-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Tab 1: Master School Timetable */}
          <button
            type="button"
            onClick={() => setActiveMainTab("master")}
            className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex items-center gap-3 border ${
              activeMainTab === "master"
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="text-2xl">🏫</span>
            <div className="min-w-0">
              <p className="font-black text-xs sm:text-sm">الجدول العام للمدرسة</p>
              <p className={`text-[11px] truncate mt-0.5 ${activeMainTab === "master" ? "text-slate-300" : "text-gray-400"}`}>
                توزيع حصص المعلمين والفصول مجمعة
              </p>
            </div>
          </button>

          {/* Tab 2: Single Teacher Timetables */}
          <button
            type="button"
            onClick={() => setActiveMainTab("single")}
            className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex items-center gap-3 border ${
              activeMainTab === "single"
                ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="text-2xl">👨‍🏫</span>
            <div className="min-w-0">
              <p className="font-black text-xs sm:text-sm">جداول المعلمين الفردية</p>
              <p className={`text-[11px] truncate mt-0.5 ${activeMainTab === "single" ? "text-blue-100" : "text-gray-400"}`}>
                استعراض وطباعة جدول كل معلم أسبوعياً
              </p>
            </div>
          </button>

          {/* Tab 3: Vacant Slots & PDF Import */}
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("templates");
              fetchTemplates();
            }}
            className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex items-center gap-3 border ${
              activeMainTab === "templates"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="text-2xl">📋</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-black text-xs sm:text-sm">الجداول الشاغرة والاستيراد</p>
                {templates.filter((t) => !t.isClaimed).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-800 text-white">
                    {templates.filter((t) => !t.isClaimed).length}
                  </span>
                )}
              </div>
              <p className={`text-[11px] truncate mt-0.5 ${activeMainTab === "templates" ? "text-emerald-100" : "text-gray-400"}`}>
                إدارة الشواغر واستيراد الجداول من PDF
              </p>
            </div>
          </button>
        </div>

        {/* Global Week Selector for Tab 1 & Tab 2 */}
        {activeMainTab !== "templates" && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">📅 الأسبوع الدراسي المحدد:</span>
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="px-3.5 py-1.5 text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {weeks.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span>💡</span>
              <span>
                {activeMainTab === "master"
                  ? "الجدول العام يتيح لك رؤية المدرسة كخلية واحدة والتعيين السريع بنقرة على أي حصة."
                  : "اختر أي معلم من القائمة أدناه لعرض جدوله الورقي وتعديل حصصه أو طباعته."}
              </span>
            </div>
          </div>
        )}
      </section>

      <main className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <ErrorBoundary title="تعذر عرض جدول الحصص">
        {loading && !allWeekSchedules.length ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : activeMainTab === "master" ? (
          /* ========================================================== */
          /* TAB 1: MASTER SCHOOL TIMETABLE GRID (All Teachers & Classes)*/
          /* ========================================================== */
          <MasterTimetableGrid
            week={selectedWeek}
            schedules={allWeekSchedules}
            teachers={teachers}
            subjects={subjects}
            settings={settings}
            onScheduleUpdated={handleMasterScheduleUpdated}
            onOpenTimingsModal={() => setTimingsModalOpen(true)}
          />
        ) : activeMainTab === "single" ? (
          /* ========================================================== */
          /* TAB 2: SINGLE TEACHER OFFICIAL TIMETABLE                    */
          /* ========================================================== */
          <div className="space-y-4 p-4 sm:p-5">
            {/* Teacher Selection Bar with Search & Quick Chips */}
            <section className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 no-print">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">اختر المعلم لعرض جدوله:</span>
                  <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                    {teachers.length} معلماً
                  </span>
                </div>

                {/* Teacher Search Input */}
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    placeholder="بحث باسم المعلم أو المادة..."
                    className="w-full pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                  <span className="absolute right-2.5 top-2 text-slate-400 text-xs">🔍</span>
                </div>
              </div>

              {/* Horizontal Scrollable Teacher Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {filteredTeachersForTab.map((t) => {
                  const isSelected = t._id === selectedTeacherId;
                  const count = teacherClassCounts[t._id] || 0;
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => setSelectedTeacherId(t._id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-1"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>👨‍🏫</span>
                      <span>{t.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isSelected
                            ? "bg-blue-800 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {count} حصة
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Selected Teacher Details Card & Timetable Grid */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 no-print">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>👨‍🏫</span>
                    <span>جدول الحصص الأسبوعي: {selectedTeacher?.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedTeacher?.subjects && selectedTeacher.subjects.length > 0
                      ? `المواد: ${selectedTeacher.subjects.map((s) => s.name).join("، ")}`
                      : "المعلم"}
                    {" • "}
                    <span className="text-blue-700 font-bold">
                      إجمالي الحصص المسندة: {singleSchedules.length} حصة في الأسبوع
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPlanModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="استعراض دفتر تحضير وخطط المعلم"
                  >
                    <span>📋</span>
                    <span>دفتر تحضير الدروس</span>
                  </button>
                </div>
              </div>

              {/* The Clean Weekly Timetable Grid without plan clutter */}
              <TeacherTimetableGrid
                teacher={selectedTeacher}
                week={selectedWeek}
                schedules={singleSchedules}
                settings={settings}
                onCellClick={handleCellClick}
                editable={true}
                showPlanStatus={false}
                containerId="teacher-paper-timetable-container"
              />
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* TAB 3: TIMETABLE TEMPLATES & PDF IMPORT (Vacant Slots)     */
          /* ========================================================== */
          <div className="space-y-6 p-4 sm:p-6">
            {/* Header & Quick Action Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-lg border border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  إدارة الشواغر واستيراد الجداول
                </span>
                <h3 className="text-xl font-black">
                  الجداول الشاغرة وقوالب المعلمين الجدد
                </h3>
                <p className="text-xs text-emerald-100/80 max-w-xl leading-relaxed">
                  أنشئ جداول حصص مسبقة بدون حسابات وهمية، أو استورد جداول المدرسة بالكامل من ملف PDF دفعة واحدة لتوزيعها على المعلمين أو إتاحتها كشواغر جاهزة للملتحقين الجدد.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(true)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-base">📥</span>
                  <span>استيراد الجداول من PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewTemplateModalOpen(true)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-white"
                >
                  <span className="text-base">➕</span>
                  <span>إنشاء جدول شاغر جديد</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block mb-1">إجمالي القوالب والشواغر</span>
                <span className="text-2xl font-black text-slate-900">{templates.length}</span>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 block mb-1">🟢 شواغر متاحة للاختيار</span>
                <span className="text-2xl font-black text-emerald-800">
                  {templates.filter((t) => !t.isClaimed).length}
                </span>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200">
                <span className="text-xs font-bold text-blue-700 block mb-1">🔒 جداول تم تعيينها</span>
                <span className="text-2xl font-black text-blue-800">
                  {templates.filter((t) => t.isClaimed).length}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block mb-1">المعلمون المسجلون</span>
                <span className="text-2xl font-black text-slate-900">{teachers.length}</span>
              </div>
            </div>

            {/* Templates List */}
            {templates.length === 0 ? (
              <div className="bg-slate-50/60 rounded-3xl p-12 border border-slate-200 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-emerald-200">
                  📋
                </div>
                <h4 className="text-base font-black text-gray-900">
                  لا توجد جداول شاغرة حالياً
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  يمكنك إنشاء جدول شاغر الآن أو استيراده من PDF وتعبئة حصصه مسبقاً ليكون جاهزاً عندما يسجل أي معلم جديد في المدرسة.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPdfModalOpen(true)}
                    className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📥</span>
                    <span>استيراد من PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTemplateModalOpen(true)}
                    className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>➕</span>
                    <span>إنشاء جدول شاغر جديد</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl) => (
                  <div
                    key={tpl._id}
                    className={`bg-white border-2 rounded-3xl p-5 transition-all flex flex-col justify-between space-y-4 ${
                      tpl.isClaimed
                        ? "border-gray-200 bg-gray-50/40 opacity-90"
                        : "border-emerald-100 hover:border-emerald-500 hover:shadow-lg"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {tpl.isClaimed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mb-1">
                              🔒 تم الاختيار ({tpl.claimedBy?.name || "معلم مسجل"})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mb-1">
                              🟢 شاغر متاح للاختيار
                            </span>
                          )}
                          <h4 className="text-base font-black text-gray-900">
                            {tpl.name}
                          </h4>
                        </div>
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs px-2.5 py-1 rounded-xl flex-shrink-0">
                          {tpl.entries?.length || 0} حصة
                        </span>
                      </div>

                      {/* Subjects */}
                      {tpl.subjects && tpl.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tpl.subjects.map((sub) => (
                            <span
                              key={sub._id}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-lg border"
                              style={{
                                backgroundColor:
                                  (sub.color || "#3b82f6") + "15",
                                borderColor: (sub.color || "#3b82f6") + "30",
                                color: sub.color || "#1e40af",
                              }}
                            >
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Classes summary */}
                      {tpl.entries && tpl.entries.length > 0 && (
                        <div className="text-xs text-gray-500">
                          <span className="text-gray-400 font-bold block mb-1 text-[11px]">
                            الفصول:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {[
                              ...new Set(
                                tpl.entries
                                  .map((e) => e.className)
                                  .filter(Boolean),
                              ),
                            ].map((c) => (
                              <span
                                key={c}
                                className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-gray-200"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <button
                        type="button"
                        onClick={() => setEditingTemplate(tpl)}
                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>
                          تعديل وتعبئة حصص الجدول ({tpl.entries?.length || 0})
                        </span>
                      </button>

                      <div className="flex items-center gap-2">
                        {tpl.isClaimed ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUnclaimTemplate(tpl._id, tpl.name)
                            }
                            className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            title="إلغاء تعيين هذا الجدول وإتاحته مجدداً كجدول شاغر للمعلمين الجدد"
                          >
                            <span>🔓</span>
                            <span>إلغاء التعيين (إتاحته كشاغر)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTemplateForAssign(tpl);
                              setTargetTeacherId("");
                              setAssignModalOpen(true);
                            }}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>👤</span>
                            <span>تعيين لمدرس مسجل</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteTemplate(tpl._id, tpl.name)
                          }
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="حذف الجدول الشاغر"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ErrorBoundary>
      </main>

      {/* Single Cell Edit Modal */}
      <Modal
        isOpen={cellModalOpen}
        onClose={() => setCellModalOpen(false)}
        title={"تحديد الحصة (" + activePeriod + ") - يوم " + activeDay}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleClearCell}
              className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
            >
              تفريغ الحصة
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCellModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCellData}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {saving ? "جاري الحفظ..." : "تأكيد التعيين"}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveCellData} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 font-semibold flex items-center justify-between">
            <span>المعلم: {selectedTeacher?.name}</span>
            <span>
              اليوم: {activeDay} | الحصة: {activePeriod}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              اختيار سريع للصف / الفصل:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CLASSES.map((cls) => (
                <button
                  type="button"
                  key={cls}
                  onClick={() =>
                    setActiveCellData({ ...activeCellData, className: cls })
                  }
                  className={
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer " +
                    (activeCellData.className === cls
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                  }
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              اسم الفصل / الصف <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={activeCellData.className}
              onChange={(e) =>
                setActiveCellData({
                  ...activeCellData,
                  className: e.target.value,
                })
              }
              required
              placeholder="مثال: ثاني ثاني / أول أول / 3-2"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              المادة الدراسية
            </label>
            <select
              value={activeCellData.subject}
              onChange={(e) =>
                setActiveCellData({
                  ...activeCellData,
                  subject: e.target.value,
                })
              }
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              القاعة أو المعمل (اختياري)
            </label>
            <input
              type="text"
              value={activeCellData.room}
              onChange={(e) =>
                setActiveCellData({ ...activeCellData, room: e.target.value })
              }
              placeholder="مثال: معمل الحاسب 1 / قاعة 4"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Swap / Move Period Section */}
          <div className="pt-3 border-t border-gray-200">
            {!showSwapSection ? (
              <button
                type="button"
                onClick={() => {
                  setShowSwapSection(true);
                  setSwapTargetDay(activeDay || settings?.workDays?.[0] || "الأحد");
                  setSwapTargetPeriod(activePeriod === 1 ? 2 : 1);
                }}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer w-full justify-center"
              >
                <span>🔄</span>
                <span>
                  نقل أو تبديل هذه الحصة (مع الحفاظ التام على بيانات الدرس
                  والواجب)
                </span>
              </button>
            ) : (
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                    <span>🔄</span>
                    <span>نقل / تبديل الحصة دون فقدان بيانات الدرس:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSwapSection(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
                  >
                    ✕ إلغاء
                  </button>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  سيتم نقل محتويات الحصة (الفصل، المادة، عنوان الدرس، والواجب)
                  بالكامل إلى الموقع الجديد دون أي ضياع. وإذا كانت الحصة
                  المستهدفة تحتوي على حصة أخرى، سيتم تبديلهما معاً فوراً.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      اليوم المستهدف:
                    </label>
                    <select
                      value={swapTargetDay}
                      onChange={(e) => setSwapTargetDay(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {(
                        settings?.workDays || [
                          "الأحد",
                          "الإثنين",
                          "الثلاثاء",
                          "الأربعاء",
                          "الخميس",
                        ]
                      ).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      الحصة المستهدفة:
                    </label>
                    <select
                      value={swapTargetPeriod}
                      onChange={(e) =>
                        setSwapTargetPeriod(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {Array.from(
                        { length: settings?.periodsCount || 6 },
                        (_, i) => i + 1,
                      ).map((p) => (
                        <option key={p} value={p}>
                          حصة {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteSwap}
                  disabled={swapping}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {swapping
                    ? "جاري النقل والتبديل..."
                    : "تأكيد النقل أو التبديل 🔄"}
                </button>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Period Timings Customization Modal */}
      <PeriodTimingsModal
        isOpen={timingsModalOpen}
        onClose={() => setTimingsModalOpen(false)}
        settings={settings}
        onSettingsUpdated={(newSettings) => setSettings(newSettings)}
      />

      {/* Template Entries Visual Editor Modal */}
      <TemplateEntriesEditorModal
        isOpen={Boolean(editingTemplate)}
        onClose={() => setEditingTemplate(null)}
        template={editingTemplate}
        subjects={subjects}
        onSaved={fetchTemplates}
      />

      {/* Modal: Create Vacant Template */}
      <Modal
        isOpen={newTemplateModalOpen}
        onClose={() => {
          setNewTemplateModalOpen(false);
          setNewTemplateData({ name: "", subjects: [] });
        }}
        title="➕ إنشاء جدول شاغر جديد (قالب مستقل)"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => {
                setNewTemplateModalOpen(false);
                setNewTemplateData({ name: "", subjects: [] });
              }}
              className="px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleCreateTemplate}
              disabled={creatingTemplate || !newTemplateData.name.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {creatingTemplate ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <>
                  <span>➕</span>
                  <span>إنشاء والبدء بتعبئة الحصص</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 font-medium leading-relaxed">
            <span className="font-black">💡 ميزة النظام الجديد:</span> هذا
            الجدول لا ينشئ مستخدماً وهمياً في النظام! بعد إنشائه، ستفتح لك شاشة
            بصرية لتعبئة الحصص فوراً.
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              اسم الجدول / الشاغر <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newTemplateData.name}
              onChange={(e) =>
                setNewTemplateData({ ...newTemplateData, name: e.target.value })
              }
              placeholder="مثال: معلم رياضيات - شاغر 1 / معلم لغة عربية جديد"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              المواد الدراسية المرتبطة بهذا الجدول
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {subjects.map((s) => {
                const isSelected = newTemplateData.subjects.includes(s._id);
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => {
                      setNewTemplateData((prev) => ({
                        ...prev,
                        subjects: isSelected
                          ? prev.subjects.filter((id) => id !== s._id)
                          : [...prev.subjects, s._id],
                      }));
                    }}
                    className={`p-2 rounded-xl border text-right text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-black shadow-2xs"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color || "#3b82f6" }}
                    />
                    <span className="truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Assign Template to Existing Registered Teacher */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedTemplateForAssign(null);
          setTargetTeacherId("");
        }}
        title="👤 تعيين الجدول الشاغر لمعلم مسجل"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => {
                setAssignModalOpen(false);
                setSelectedTemplateForAssign(null);
                setTargetTeacherId("");
              }}
              className="px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleAssignTemplate}
              disabled={assigning || !targetTeacherId}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
            >
              {assigning ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>جاري التعيين...</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>تأكيد التعيين</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedTemplateForAssign && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-1">
              <p className="text-xs font-black text-blue-900">
                الجدول الشاغر المُراد تعيينه:
              </p>
              <p className="text-sm font-bold text-blue-800">
                {selectedTemplateForAssign.name}
              </p>
              <p className="text-xs text-blue-700 font-medium">
                {selectedTemplateForAssign.entries?.length || 0} حصة •{" "}
                {(selectedTemplateForAssign.subjects || [])
                  .map((s) => s.name)
                  .join("، ")}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              اختر المعلم المسجل لتعيين الجدول إليه{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              value={targetTeacherId}
              onChange={(e) => setTargetTeacherId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
            >
              <option value="">-- اختر المعلم --</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  👨‍🏫 {t.name}
                  {t.subjects?.length > 0
                    ? ` — ${t.subjects.map((s) => s.name).join("، ")}`
                    : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              سيتم نقل جميع حصص الجدول الشاغر إلى حساب المعلم المختار في الأسبوع
              الحالي مع دمج مواده تلقائياً.
            </p>
          </div>
        </div>
      </Modal>

      {/* PDF Timetable Import Modal */}
      <PdfTimetableImportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        weeks={weeks}
        currentWeek={selectedWeek}
        teachers={teachers}
        subjects={subjects}
        onImportSuccess={() => {
          fetchTemplates();
          fetchWeekData(selectedWeekId);
          if (selectedTeacherId) {
            fetchTeacherSchedule(selectedTeacherId, selectedWeekId);
          }
        }}
      />

      {/* Teacher Weekly Plan & Preparation Modal */}
      <TeacherWeeklyPlanModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        teacher={selectedTeacher}
        weeks={weeks}
        currentWeek={selectedWeek}
        subjects={subjects}
        settings={settings}
        onPlanUpdated={() => {
          if (selectedTeacherId) {
            fetchTeacherSchedule(selectedTeacherId, selectedWeekId);
          }
          fetchWeekData(selectedWeekId);
        }}
      />
    </div>
  );
}
