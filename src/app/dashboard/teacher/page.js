"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import WeekNavigator from "@/components/schedule/WeekNavigator";
import TeacherTimetableGrid from "@/components/schedule/TeacherTimetableGrid";
import ScheduleCellEditModal from "@/components/schedule/ScheduleCellEditModal";
import ExportButtons from "@/components/schedule/ExportButtons";
import TeacherOnboardingModal from "@/components/auth/TeacherOnboardingModal";
import { TableSkeleton } from "@/components/ui";

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("plan"); // 'plan' | 'timetable'
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [activeDay, setActiveDay] = useState("");
  const [activePeriod, setActivePeriod] = useState(1);
  const [planViewMode, setPlanViewMode] = useState("table"); // 'table' | 'cards'
  const [planScale, setPlanScale] = useState(85); // 70 | 85 | 100
  const [selectedPlanDay, setSelectedPlanDay] = useState("الأحد");
  const [saving, setSaving] = useState(false);

  const daysList = settings?.workDays || [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
  ];
  const periodsCount = settings?.periodsCount || 6;
  const periodsList = Array.from({ length: periodsCount }, (_, i) => i + 1);

  // Group teacher's schedules into day-period matrix
  const teacherMatrix = {};
  daysList.forEach((day) => {
    teacherMatrix[day] = {};
    periodsList.forEach((p) => {
      teacherMatrix[day][p] = null;
    });
  });

  schedules.forEach((item) => {
    if (
      teacherMatrix[item.day] &&
      teacherMatrix[item.day][item.period] !== undefined
    ) {
      teacherMatrix[item.day][item.period] = item;
    }
  });

  // Load Initial Metadata
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [weeksRes, currWeekRes, subjectsRes, settingsRes] =
          await Promise.all([
            weeksService.getAll(),
            weeksService.getCurrent(),
            subjectsService.getAll({ isActive: true }),
            settingsService.get(),
          ]);

        setWeeks(weeksRes.data || []);
        const activeWk = currWeekRes.data || weeksRes.data?.[0] || null;
        setCurrentWeek(activeWk);
        setSubjects(subjectsRes.data || []);
        setSettings(settingsRes.data || null);

        if (activeWk) {
          const schedRes = await schedulesService.getForTeacher(activeWk._id);
          setSchedules(schedRes.data?.schedules || []);
        }
      } catch (err) {
        console.error("Error loading teacher schedule:", err);
        toast.error("حدث خطأ أثناء تحميل بيانات الجدول");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Fetch Schedules when Week Changes
  const handleSelectWeek = async (week) => {
    setCurrentWeek(week);
    try {
      setLoading(true);
      const res = await schedulesService.getForTeacher(week._id);
      setSchedules(res.data?.schedules || []);
    } catch (err) {
      toast.error("فشل جلب جدول الأسبوع المختار");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCell = (cell, day, period) => {
    if (!cell) {
      toast.warning("هذه الحصة غير مسندة إليك في جدول الحصص (حصة فراغ)");
      return;
    }
    setActiveCell(cell);
    setActiveDay(day);
    setActivePeriod(period);
    setModalOpen(true);
  };

  const handleSaveCell = async (formData) => {
    setSaving(true);
    try {
      if (formData.id) {
        const res = await schedulesService.update(formData.id, {
          lessonTitle: formData.lessonTitle,
          homework: formData.homework,
          activities: formData.activities,
          notes: formData.notes,
        });
        setSchedules((prev) =>
          prev.map((item) => (item._id === formData.id ? res.data : item)),
        );
        toast.success("تم حفظ تحضير الحصة بنجاح ✅");
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ التعديلات";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Update local schedules state after bulk-fill
  const handleBulkFill = (updatedSchedules) => {
    if (!Array.isArray(updatedSchedules)) return;
    setSchedules((prev) => {
      const updatedMap = {};
      updatedSchedules.forEach((s) => {
        updatedMap[s._id] = s;
      });
      return prev.map((item) => updatedMap[item._id] || item);
    });
    toast.success(`تم الملئ التلقائي لجميع فصول نفس الصف ✅`);
  };

  // Calculate day date formatted
  const getDayDateFormatted = (dayName) => {
    if (!currentWeek?.startDate) return "";
    const dayNames = [
      "الأحد",
      "الإثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    const start = new Date(currentWeek.startDate);
    const startIdx = start.getDay();
    const targetIdx = dayNames.indexOf(dayName);
    if (targetIdx === -1) return "";

    let diff = targetIdx - startIdx;
    if (diff < 0) diff += 7;

    const targetDate = new Date(start);
    targetDate.setDate(start.getDate() + diff);

    return targetDate.toLocaleDateString("ar-SA", {
      month: "numeric",
      day: "numeric",
    });
  };

  // Stats
  const totalAssignedClasses = schedules.length;
  const completedPlansCount = schedules.filter(
    (s) => s.lessonTitle && s.lessonTitle.trim() !== "",
  ).length;
  const homeworksCount = schedules.filter(
    (s) => s.homework && s.homework.trim() !== "",
  ).length;
  const incompleteSlotsCount = schedules.filter(
    (s) =>
      !s.lessonTitle ||
      s.lessonTitle.trim() === "" ||
      !s.homework ||
      s.homework.trim() === "",
  ).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Teacher Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold">
            <span>👨‍🏫 بوابة المعلم الرسمية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            مرحباً، {user?.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-blue-200 font-medium">
              المادة المسندة:
            </span>
            {user?.subjects?.map((subj) => (
              <span
                key={subj._id || subj}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: subj.color || "#2563eb" }}
              >
                <span>📖</span>
                <span>{subj.name || "مادة"}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Teacher Stats Pill */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/15 text-center">
          <div>
            <span className="text-2xl font-black block text-white">
              {totalAssignedClasses}
            </span>
            <span className="text-[11px] text-blue-200 font-semibold">
              حصصك بالجدول
            </span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <span className="text-2xl font-black block text-emerald-300">
              {completedPlansCount}
            </span>
            <span className="text-[11px] text-blue-200 font-semibold">
              دروس تم تحضيرها
            </span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <span className="text-2xl font-black block text-amber-300">
              {homeworksCount}
            </span>
            <span className="text-[11px] text-blue-200 font-semibold">
              واجبات مسجلة
            </span>
          </div>
        </div>
      </div>

      {/* System Incomplete Plan Alert Banner */}
      {incompleteSlotsCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-3xl flex-shrink-0">⚠️</span>
            <div>
              <h3 className="text-sm font-black text-amber-950">
                تنبيه من النظام: خطة التحضير غير مكتملة لهذا الأسبوع!
              </h3>
              <p className="text-xs font-semibold text-amber-800 mt-0.5">
                لديك{" "}
                <span className="font-black underline">
                  {incompleteSlotsCount} حصة
                </span>{" "}
                لم يتم تعبئة عنوان وموضوع الدرس أو الواجب المنزلي بها في{" "}
                {currentWeek?.label || "هذا الأسبوع"}. يُرجى تعبئتها قبل نهاية
                الأسبوع.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("plan")}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            ✏️ استكمال التحضير الآن
          </button>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2 bg-gray-200/70 p-1 rounded-2xl max-w-md">
          <button
            onClick={() => setActiveTab("plan")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "plan"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>📝</span>
            <span>الخطة والتحضير الأسبوعي</span>
          </button>

          <button
            onClick={() => setActiveTab("timetable")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "timetable"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>🗓️</span>
            <span>جدول الحصص المدرسي</span>
          </button>
        </div>

        {/* Export Buttons */}
        <ExportButtons
          targetElementId={
            activeTab === "plan"
              ? "teacher-weekly-plan-container"
              : "teacher-official-timetable-container"
          }
          weekLabel={
            activeTab === "plan"
              ? `خطة_${user?.name}_${currentWeek?.label || ""}`
              : `جدول_حصص_${user?.name}`
          }
        />
      </div>

      {/* Week Navigator Bar */}
      <WeekNavigator
        weeks={weeks}
        currentWeek={currentWeek}
        onSelectWeek={handleSelectWeek}
        canCopy={false}
        canAdd={false}
      />

      {loading ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : activeTab === "timetable" ? (
        /* ========================================================================= */
        /* TAB 1: Official Timetable View (Matching aSc Timetables user reference)   */
        /* ========================================================================= */
        <div className="space-y-4">
          <TeacherTimetableGrid
            teacher={user}
            week={currentWeek}
            schedules={schedules}
            settings={settings}
            editable={false}
            containerId="teacher-official-timetable-container"
          />
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: Weekly Plan & Preparation View (Only assigned classes are editable) */
        /* ========================================================================= */
        <div
          id="teacher-weekly-plan-container"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-4 sm:p-6 space-y-6"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                خطة التحضير والدروس الأسبوعية — {user?.name}
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {currentWeek?.label} |{" "}
                {settings?.schoolName || "مدرسة المستقبل النموذجية"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-blue-50 text-blue-900 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold hidden sm:block">
                الخانات المفتوحة هي الحصص المسندة إليك من الإدارة
              </div>

              {/* View Switcher: Table vs Cards */}
              <div className="flex flex-wrap items-center gap-2 no-print">
                {/* Scale Controller */}
                {planViewMode === "table" && (
                  <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs border border-gray-200">
                    <span className="text-[10px] font-black text-gray-500 px-1">
                      🔍 المقياس:
                    </span>
                    {[70, 85, 100].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setPlanScale(sc)}
                        className={
                          "px-2 py-0.5 rounded-lg font-bold transition-all text-xs cursor-pointer " +
                          (planScale === sc
                            ? "bg-blue-600 text-white shadow-xs font-black"
                            : "text-gray-600 hover:text-gray-900")
                        }
                      >
                        {sc}%
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setPlanViewMode("table")}
                    className={
                      "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer " +
                      (planViewMode === "table"
                        ? "bg-white text-blue-900 shadow-xs font-black"
                        : "text-gray-600 hover:text-gray-900")
                    }
                  >
                    <span>📊</span>
                    <span>عرض كجدول</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanViewMode("cards")}
                    className={
                      "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer " +
                      (planViewMode === "cards"
                        ? "bg-white text-blue-900 shadow-xs font-black"
                        : "text-gray-600 hover:text-gray-900")
                    }
                  >
                    <span>📱</span>
                    <span>عرض كبطاقات</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MOBILE CARDS VIEW: Teacher Weekly Plan (No Horizontal Overflow)           */}
          {/* ========================================================================= */}
          <div
            className={
              planViewMode === "cards" ? "block space-y-3.5" : "hidden"
            }
          >
            {/* Day Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {daysList.map((day) => {
                const isSel = (selectedPlanDay || daysList[0]) === day;
                const assignedCount = periodsList.filter(
                  (p) => !!teacherMatrix[day]?.[p],
                ).length;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedPlanDay(day)}
                    className={
                      "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 " +
                      (isSel
                        ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                    }
                  >
                    <span>{day}</span>
                    <span
                      className={
                        "text-[10px] px-1.5 py-0.2 rounded-full " +
                        (isSel
                          ? "bg-white/25 text-white"
                          : "bg-gray-200 text-gray-600")
                      }
                    >
                      {assignedCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Day Banner */}
            <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-900">
              <span>
                📅 تحضير حصص يوم {selectedPlanDay || daysList[0]} (
                {getDayDateFormatted(selectedPlanDay || daysList[0])})
              </span>
            </div>

            {/* Period Cards */}
            <div className="space-y-3">
              {periodsList.map((period) => {
                const currentDay = selectedPlanDay || daysList[0];
                const cell = teacherMatrix[currentDay]?.[period];
                const hasAssignedClass = !!cell;
                const hasLesson =
                  cell && cell.lessonTitle && cell.lessonTitle.trim();
                const hasHomework =
                  cell && cell.homework && cell.homework.trim();

                if (!hasAssignedClass) {
                  return (
                    <div
                      key={period}
                      className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-between text-xs text-gray-400"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs">
                          {period}
                        </span>
                        <span>حصة فراغ — غير مسندة إليك</span>
                      </div>
                      <span>—</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={period}
                    className="p-3.5 rounded-2xl border border-blue-200 bg-white shadow-xs space-y-2.5"
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                          {period}
                        </span>
                        <span className="font-black text-sm text-slate-900">
                          🏫 {cell.className || "حصة مسندة"}
                        </span>
                      </div>

                      <div>
                        {hasLesson && hasHomework ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            مكتمل ✅
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            تحضير ناقص ⚠️
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lesson Title */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                        📖 عنوان وموضوع الدرس:
                      </span>
                      <p className="font-bold text-slate-900">
                        {cell.lessonTitle || (
                          <span className="text-red-500 italic font-normal">
                            لم يتم إدخال عنوان الدرس بعد
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Homework & Activities */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                        📝 الواجبات والأنشطة:
                      </span>
                      <p className="text-slate-800 font-medium">
                        {cell.homework || (
                          <span className="text-amber-600 italic font-normal">
                            لا يوجد واجب مسجل
                          </span>
                        )}
                      </p>
                      {cell.activities && (
                        <p className="text-[11px] text-gray-500 mt-1 border-t border-gray-200/50 pt-1">
                          🎯 أنشطة: {cell.activities}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-400 truncate max-w-[170px]">
                        {cell.notes ? "💬 " + cell.notes : ""}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleEditCell(cell, currentDay, period)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>تحضير الحصة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DESKTOP / FULL TABLE VIEW (Weekly Plan)                                   */}
          {/* ========================================================================= */}
          <div className={planViewMode === "table" ? "block" : "hidden"}>
            {/* Mobile Swipe Hint Banner */}
            <div className="md:hidden flex items-center justify-between text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg mb-2.5 no-print">
              <span>
                👈 اسحب الجدول يميناً ويساراً لاستعراض باقي الحصص والتحضير
              </span>
              <span className="font-bold">👉</span>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse border border-slate-300 min-w-[900px]">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs sm:text-sm">
                    <th className="border border-slate-700 px-2 py-2 w-24 text-center font-bold text-xs">
                      اليوم والتاريخ
                    </th>
                    <th className="border border-slate-700 px-1.5 py-2 w-12 text-center font-bold text-xs">
                      الحصة
                    </th>
                    <th className="border border-slate-700 px-2 py-2 w-28 font-bold text-xs">
                      الصف / الفصل
                    </th>
                    <th className="border border-slate-700 px-2 py-2 w-48 font-bold text-xs">
                      عنوان وموضوع الدرس
                    </th>
                    <th className="border border-slate-700 px-2 py-2 font-bold text-xs">
                      الواجبات والأنشطة الصفية
                    </th>
                    <th className="border border-slate-700 px-2 py-2 w-32 font-bold text-xs">
                      الملاحظات
                    </th>
                    <th className="border border-slate-700 px-1.5 py-2 w-14 text-center font-bold text-xs no-export no-print">
                      تحضير
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm divide-y divide-slate-200 text-slate-800">
                  {daysList.map((day, dayIndex) => {
                    const dayDateFormatted = getDayDateFormatted(day);
                    const dayBg =
                      dayIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50";

                    return periodsList.map((period, periodIndex) => {
                      const cell = teacherMatrix[day]?.[period];
                      const hasAssignedClass = !!cell;

                      return (
                        <tr
                          key={`${day}-${period}`}
                          className={`${dayBg} transition-colors ${
                            hasAssignedClass
                              ? "bg-blue-50/70 hover:bg-blue-100/50 font-medium"
                              : "opacity-60 hover:bg-gray-50"
                          }`}
                        >
                          {/* Day Column with Rowspan */}
                          {periodIndex === 0 && (
                            <td
                              rowSpan={periodsCount}
                              className="border border-slate-300 p-3 text-center align-middle font-bold bg-slate-100 text-slate-900 border-r-4 border-r-blue-700"
                            >
                              <div className="text-base font-extrabold text-blue-900">
                                {day}
                              </div>
                              <div className="text-xs text-slate-500 font-medium mt-1">
                                {dayDateFormatted}
                              </div>
                            </td>
                          )}

                          {/* Period Number */}
                          <td className="border border-slate-300 px-2 py-2.5 text-center font-bold text-slate-700 bg-slate-100/50">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                                hasAssignedClass
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {period}
                            </span>
                          </td>

                          {/* Class Name / Grade */}
                          <td className="border border-slate-300 p-2.5 align-middle">
                            {hasAssignedClass ? (
                              <div className="space-y-1">
                                <span className="inline-block bg-blue-700 text-white font-black px-2.5 py-1 rounded-lg text-xs shadow-xs">
                                  {cell.className || "حصة مسندة"}
                                </span>
                                {cell.subject?.name && (
                                  <p className="text-[11px] text-blue-900 font-semibold">
                                    {cell.subject.name}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic font-normal">
                                حصة فراغ (بدون فصل)
                              </span>
                            )}
                          </td>

                          {/* Lesson Title */}
                          <td className="border border-slate-300 p-2.5 align-top">
                            {hasAssignedClass ? (
                              cell.lessonTitle ? (
                                <p className="text-slate-900 font-bold leading-relaxed">
                                  {cell.lessonTitle}
                                </p>
                              ) : (
                                <span className="text-amber-700 text-xs italic font-medium bg-amber-50 px-2 py-0.5 rounded">
                                  ✏️ انقر لتحضير موضوع الدرس
                                </span>
                              )
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Homework & Activities */}
                          <td className="border border-slate-300 p-2.5 align-top">
                            {hasAssignedClass ? (
                              <div className="space-y-1.5">
                                {cell.homework && (
                                  <div className="flex items-start gap-1.5 text-xs text-slate-800">
                                    <span className="font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                                      واجب:
                                    </span>
                                    <span className="leading-snug">
                                      {cell.homework}
                                    </span>
                                  </div>
                                )}
                                {cell.activities && (
                                  <div className="flex items-start gap-1.5 text-xs text-slate-800">
                                    <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                                      نشاط:
                                    </span>
                                    <span className="leading-snug">
                                      {cell.activities}
                                    </span>
                                  </div>
                                )}
                                {!cell.homework && !cell.activities && (
                                  <span className="text-slate-400 text-xs italic">
                                    لم تسجل واجبات
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="border border-slate-300 p-2.5 align-top">
                            {hasAssignedClass ? (
                              cell.notes ? (
                                <p className="text-xs text-amber-900 bg-amber-50/80 p-1.5 rounded border border-amber-200/60 leading-relaxed">
                                  {cell.notes}
                                </p>
                              ) : (
                                <span className="text-slate-300 text-xs italic">
                                  —
                                </span>
                              )
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Edit Action Button */}
                          <td className="border border-slate-300 p-2 text-center align-middle no-export no-print">
                            {hasAssignedClass ? (
                              <button
                                onClick={() =>
                                  handleEditCell(cell, day, period)
                                }
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                title="تعديل تحضير الحصة"
                              >
                                <span>✏️</span>
                                <span>تحضير</span>
                              </button>
                            ) : (
                              <span
                                className="text-gray-300 text-xs"
                                title="حصة فراغ"
                              >
                                🔒
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cell Modal */}
      <ScheduleCellEditModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        schedule={activeCell}
        week={currentWeek}
        day={activeDay}
        period={activePeriod}
        subjects={subjects}
        teachers={[user]}
        onSave={handleSaveCell}
        onBulkFill={handleBulkFill}
        loading={saving}
      />

      {/* Obligatory Teacher Onboarding Modal if not completed */}
      <TeacherOnboardingModal
        isOpen={Boolean(
          user && !user.isProfileComplete && !user.role?.isSystem,
        )}
        onComplete={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
