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
import { TableSkeleton, ErrorBoundary } from "@/components/ui";

export default function TeacherTimetablePage() {
  const { user } = useAuth();
  const toast = useToast();

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
        console.error("Error loading teacher timetable:", err);
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
      toast.info("هذه الحصة غير مسندة لجدولك الدراسي");
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
      if (activeCell && activeCell._id) {
        const res = await schedulesService.update(activeCell._id, formData);
        setSchedules((prev) =>
          prev.map((item) => (item._id === activeCell._id ? res.data : item)),
        );
        toast.success("تم تحديث بيانات الحصة والتحضير بنجاح ✅");
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ بيانات الحصة";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full overflow-hidden">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-2xl">📅</span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              جدول الحصص المدرسي الأسبوعي
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            عرض جدول حصصك الأسبوعية وتوزيع الحصص والفصول الدراسية المسندة إليك
          </p>
        </div>

        {/* User Badge */}
        {user && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {user.name ? user.name[0] : "م"}
            </div>
            <div>
              <p className="text-xs font-black text-blue-950">{user.name}</p>
              <p className="text-[11px] text-blue-700 font-semibold">
                {user.subjects
                  ?.map((s) => (typeof s === "object" ? s.name : s))
                  .join(" • ") || "معلم"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls: Week Navigator + Export Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1">
          <WeekNavigator
            weeks={weeks}
            currentWeek={currentWeek}
            onSelectWeek={handleSelectWeek}
          />
        </div>
        <ExportButtons
          targetElementId="teacher-official-timetable-container"
          weekLabel={`جدول_حصص_${user?.name || "معلم"}_${currentWeek?.label || ""}`}
        />
      </div>

      {/* Timetable Grid View */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <TeacherTimetableGrid
          teacher={user}
          week={currentWeek}
          schedules={schedules}
          settings={settings}
          onCellClick={handleEditCell}
          editable={true}
          containerId="teacher-official-timetable-container"
        />
        <ErrorBoundary title="تعذر عرض جدول الحصص">
          <TeacherTimetableGrid
            teacher={user}
            week={currentWeek}
            schedules={schedules}
            settings={settings}
            onCellClick={handleEditCell}
            editable={true}
            containerId="teacher-official-timetable-container"
          />
        </ErrorBoundary>
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
        onBulkFill={(updatedSchedules) => {
          if (!Array.isArray(updatedSchedules)) return;
          setSchedules((prev) => {
            const map = {};
            updatedSchedules.forEach((s) => { map[s._id] = s; });
            return prev.map((item) => map[item._id] || item);
          });
        }}
        loading={saving}
      />

      {/* Obligatory Teacher Onboarding Modal if not completed */}
      <TeacherOnboardingModal
        isOpen={Boolean(
          user && user.isProfileComplete === false && !user.role?.isSystem,
        )}
        onComplete={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
