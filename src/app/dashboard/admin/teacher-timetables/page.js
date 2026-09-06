"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { usersService } from "@/services/users.service";
import { weeksService, schedulesService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import TeacherTimetableGrid from "@/components/schedule/TeacherTimetableGrid";
import MasterTimetableGrid from "@/components/schedule/MasterTimetableGrid";
import PeriodTimingsModal from "@/components/schedule/PeriodTimingsModal";
import ExportButtons from "@/components/schedule/ExportButtons";
import Modal from "@/components/ui/Modal";
import { Skeleton, ErrorBoundary } from "@/components/ui";

const COMMON_CLASSES = [
  "أول أول",
  "أول ثاني",
  "أول ثالث",
  "ثاني أول",
  "ثاني ثاني",
  "ثاني ثالث",
  "ثالث أول",
  "ثالث ثاني",
  "ثالث ثالث",
];

export default function AdminTeacherTimetablesPage() {
  const toast = useToast();

  const [activeMainTab, setActiveMainTab] = useState("master"); // 'master' | 'single'
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);

  // Single teacher schedules & all-week schedules
  const [singleSchedules, setSingleSchedules] = useState([]);
  const [allWeekSchedules, setAllWeekSchedules] = useState([]);

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

  // 1. Load Initial Metadata
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [teachersRes, weeksRes, subjectsRes, settingsRes] =
          await Promise.all([
            usersService.getTeachers(),
            weeksService.getAll(),
            subjectsService.getAll({ isActive: true }),
            settingsService.get(),
          ]);

        const teachersList = teachersRes.data || [];
        const weeksList = weeksRes.data || [];
        setTeachers(teachersList);
        setWeeks(weeksList);
        setSubjects(subjectsRes.data || []);
        setSettings(settingsRes.data || null);

        if (teachersList.length > 0) setSelectedTeacherId(teachersList[0]._id);
        if (weeksList.length > 0) setSelectedWeekId(weeksList[0]._id);
      } catch (err) {
        toast.error("فشل تحميل البيانات الأساسية");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. Fetch all schedules for the week (for master grid) & for selected teacher
  const fetchWeekData = async (weekId = selectedWeekId) => {
    if (!weekId) return;
    try {
      setLoading(true);
      const res = await schedulesService.getByWeek(weekId);
      setAllWeekSchedules(res.data?.schedules || []);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherSchedule = async (
    teacherId = selectedTeacherId,
    weekId = selectedWeekId
  ) => {
    if (!teacherId || !weekId) return;
    try {
      const res = await schedulesService.getTeacherTimetable(teacherId, weekId);
      setSingleSchedules(res.data?.schedules || []);
    } catch (err) {
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

  // Single View Cell Click
  const handleCellClick = (currentCell, day, period) => {
    setActiveDay(day);
    setActivePeriod(Number(period) || 1);
    const defaultSubjectId =
      selectedTeacher?.subjects && selectedTeacher.subjects.length > 0
        ? selectedTeacher.subjects[0]._id || selectedTeacher.subjects[0]
        : subjects[0]?._id || "";

    if (currentCell) {
      setActiveCellData({
        className: currentCell.className || "",
        subject:
          currentCell.subject?._id ||
          currentCell.subject ||
          defaultSubjectId,
        room: currentCell.room || "",
      });
    } else {
      setActiveCellData({ className: "", subject: defaultSubjectId, room: "" });
    }
    setCellModalOpen(true);
  };

  const persistSingleTimetable = async (updatedSchedules) => {
    if (!selectedTeacherId || !selectedWeekId) return;
    setSaving(true);
    try {
      const payloadEntries = updatedSchedules.map((s) => ({
        day: s.day,
        period: s.period,
        subject: s.subject?._id || s.subject,
        className: s.className,
        room: s.room,
        lessonTitle: s.lessonTitle || "",
        homework: s.homework || "",
        activities: s.activities || "",
        notes: s.notes || "",
      }));

      await schedulesService.saveTeacherTimetable({
        teacherId: selectedTeacherId,
        weekId: selectedWeekId,
        entries: payloadEntries,
      });

      // Refresh master week schedules in background
      fetchWeekData(selectedWeekId);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل الحفظ التلقائي");
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

    const updated = [...singleSchedules];
    const existingIndex = updated.findIndex(
      (s) => s.day === activeDay && Number(s.period) === Number(activePeriod)
    );

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

    if (existingIndex !== -1) {
      updated[existingIndex] = { ...updated[existingIndex], ...cellObj };
    } else {
      updated.push(cellObj);
    }

    setSingleSchedules(updated);
    setCellModalOpen(false);
    await persistSingleTimetable(updated);
    toast.success(
      "تم حفظ الحصة (" +
        activePeriod +
        ") يوم " +
        activeDay +
        " — " +
        activeCellData.className
    );
  };

  const handleClearCell = async () => {
    const updated = singleSchedules.filter(
      (s) => !(s.day === activeDay && Number(s.period) === Number(activePeriod))
    );
    setSingleSchedules(updated);
    setCellModalOpen(false);
    await persistSingleTimetable(updated);
    toast.info("تم تفريغ الحصة (" + activePeriod + ") يوم " + activeDay);
  };

  // Callback when master grid updates a cell
  const handleMasterScheduleUpdated = (updatedCell) => {
    fetchWeekData(selectedWeekId);
    if (selectedTeacherId) {
      fetchTeacherSchedule(selectedTeacherId, selectedWeekId);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold mb-1.5">
            <span>🗓️ النظام المدرسي لتوزيع الحصص والجداول</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            توزيع وجداول حصص المعلمين
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            الجدول الرئيسي العام المجمع لجميع المعلمين والفصول مع الحفظ التلقائي
            الفوري.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl font-semibold">
              <svg
                className="animate-spin w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              جاري الحفظ...
            </span>
          )}

          <ExportButtons
            targetElementId={
              activeMainTab === "master"
                ? "master-timetable-export-container"
                : "teacher-paper-timetable-container"
            }
            weekLabel={
              activeMainTab === "master"
                ? "الجدول_المدرسي_العام_المجمع"
                : "جدول_حصص_" + (selectedTeacher?.name || "")
            }
          />
        </div>
      </div>

      {/* Main Tabs Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2 bg-gray-200/80 p-1.5 rounded-2xl max-w-lg">
          <button
            onClick={() => setActiveMainTab("master")}
            className={
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer " +
              (activeMainTab === "master"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900")
            }
          >
            <span>📊</span>
            <span>الجدول المدرسي العام المجمع</span>
          </button>

          <button
            onClick={() => setActiveMainTab("single")}
            className={
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer " +
              (activeMainTab === "single"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900")
            }
          >
            <span>👤</span>
            <span>جدول المعلم الفردي</span>
          </button>
        </div>

        {/* Adjust Period Timings Button */}
        <button
          onClick={() => setTimingsModalOpen(true)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <span>⚙️</span>
          <span>ضبط وتعديل أوقات الحصص</span>
        </button>
      </div>

      {/* Week Selector Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="min-w-[260px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              الأسبوع الدراسي
            </label>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-bold bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {weeks.map((w) => (
                <option key={w._id} value={w._id}>
                  📅 {w.label}
                </option>
              ))}
            </select>
          </div>

          {activeMainTab === "single" && (
            <div className="min-w-[260px]">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اختر المعلم <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-bold bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    👨‍🏫 {t.name} (
                    {t.subjects?.map((s) => s.name).join("، ") ||
                      "لا توجد مادة"}
                    )
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-amber-50 text-amber-900 border border-amber-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>💡</span>
          <span>
            {activeMainTab === "master"
              ? "يمكنك تعيين حصص المعلمين بالكامل في شاشة واحدة — تُحفظ وتنعكس فوراً."
              : "انقر على أي خلية لتحديد الفصل وتعيين الحصة — يُحفظ تلقائياً."}
          </span>
        </div>
      </div>

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
        ) : (
          /* ========================================================== */
          /* TAB 2: SINGLE TEACHER OFFICIAL TIMETABLE                    */
          /* ========================================================== */
          <div className="space-y-4">
            <TeacherTimetableGrid
              teacher={selectedTeacher}
              week={selectedWeek}
              schedules={singleSchedules}
              settings={settings}
              onCellClick={handleCellClick}
              editable={true}
              containerId="teacher-paper-timetable-container"
            />
          </div>
        )}
      </ErrorBoundary>

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
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl"
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
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all " +
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
        </form>
      </Modal>

      {/* Period Timings Customization Modal */}
      <PeriodTimingsModal
        isOpen={timingsModalOpen}
        onClose={() => setTimingsModalOpen(false)}
        settings={settings}
        onSettingsUpdated={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}
