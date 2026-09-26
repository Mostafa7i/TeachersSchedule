"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import WeekNavigator from "@/components/schedule/WeekNavigator";
import TeacherTimetableGrid from "@/components/schedule/TeacherTimetableGrid";
import WeeklyScheduleTable from "@/components/schedule/WeeklyScheduleTable";
import LessonPreparationWorkspace from "@/components/schedule/LessonPreparationWorkspace";
import ExportButtons from "@/components/schedule/ExportButtons";
import TeacherOnboardingModal from "@/components/auth/TeacherOnboardingModal";
import AvailableTimetablesModal from "@/components/schedule/AvailableTimetablesModal";
import TeacherSettingsView from "@/components/teacher/TeacherSettingsView";
import { TableSkeleton, ErrorBoundary } from "@/components/ui";

const isBlank = (value) => !value || value.trim() === "";

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("plan");
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableModalOpen, setAvailableModalOpen] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [weeksRes, currentWeekRes, subjectsRes, settingsRes] =
          await Promise.all([
            weeksService.getAll(),
            weeksService.getCurrent(),
            subjectsService.getAll({ isActive: true }),
            settingsService.get(),
          ]);

        const loadedWeeks = weeksRes.data || [];
        const activeWeek = currentWeekRes.data || loadedWeeks[0] || null;

        setWeeks(loadedWeeks);
        setCurrentWeek(activeWeek);
        setSubjects(subjectsRes.data || []);
        setSettings(settingsRes.data || null);

        if (activeWeek) {
          const schedulesRes = await schedulesService.getForTeacher(activeWeek._id);
          setSchedules(schedulesRes.data?.schedules || []);
        }
      } catch (error) {
        console.error("Error loading teacher schedule:", error);
        toast.error("حدث خطأ أثناء تحميل بيانات الجدول");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [toast]);

  const handleSelectWeek = async (week) => {
    if (!week?._id) return;

    setCurrentWeek(week);
    try {
      setLoading(true);
      const response = await schedulesService.getForTeacher(week._id);
      setSchedules(response.data?.schedules || []);
    } catch (error) {
      console.error("Error loading selected week:", error);
      toast.error("فشل جلب جدول الأسبوع المختار");
    } finally {
      setLoading(false);
    }
  };

  const handleInlineSave = async (formData) => {
    if (!formData.id) return;

    await schedulesService.update(formData.id, formData);
    setSchedules((previousSchedules) =>
      previousSchedules.map((item) =>
        item._id === formData.id ? { ...item, ...formData } : item,
      ),
    );
  };

  const handleBulkSave = async (updates) => {
    if (!currentWeek?._id) return;

    await schedulesService.bulkUpdateLessons(updates);
    const response = await schedulesService.getForTeacher(currentWeek._id);
    setSchedules(response.data?.schedules || []);
  };

  const totalAssignedClasses = schedules.length;
  const missingTitleCount = schedules.filter((item) =>
    isBlank(item.lessonTitle),
  ).length;
  const missingHomeworkCount = schedules.filter((item) =>
    isBlank(item.homework),
  ).length;
  const incompleteSlotsCount = schedules.filter(
    (item) => isBlank(item.lessonTitle) || isBlank(item.homework),
  ).length;
  const completedPlansCount = totalAssignedClasses - missingTitleCount;
  const homeworksCount = totalAssignedClasses - missingHomeworkCount;
  const hasIncompletePlan = !loading && incompleteSlotsCount > 0;

  const tabs = [
    { id: "plan", icon: "📝", label: "الخطة السريعة" },
    { id: "preparation", icon: "📚", label: "دفتر تحضير الدروس" },
    { id: "timetable", icon: "🗓️", label: "جدول الحصص" },
    { id: "settings", icon: "⚙️", label: "الإعدادات" },
  ];

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8" dir="rtl">
      {totalAssignedClasses === 0 && !loading && (
        <section
          aria-labelledby="empty-schedule-title"
          className="animate-fade-in rounded-3xl border-2 border-blue-200 bg-linear-to-l from-blue-50 via-indigo-50 to-emerald-50 p-6 text-center shadow-sm sm:p-8"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 text-3xl text-white shadow-lg shadow-blue-500/25">
            📋
          </div>
          <div className="mx-auto mt-4 max-w-xl space-y-1.5">
            <h2 id="empty-schedule-title" className="text-lg font-black text-gray-900 sm:text-xl">
              لم يتم تعيين جدول حصص لحسابك لهذا الأسبوع بعد
            </h2>
            <p className="text-xs font-medium leading-relaxed text-gray-600 sm:text-sm">
              إذا أعدت إدارة المدرسة الجدول مسبقاً، يمكنك اختياره وربطه بحسابك للبدء في كتابة عناوين الدروس والواجبات.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAvailableModalOpen(true)}
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-indigo-600 px-6 py-3 text-xs font-black text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-sm"
          >
            <span aria-hidden="true">📋</span>
            <span>استعراض الجداول المتاحة بالمدرسة</span>
          </button>
        </section>
      )}

      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-l from-slate-900 via-blue-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8 md:flex-row md:items-center">
        <div className="max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
            <span aria-hidden="true">👨‍🏫</span> بوابة المعلم الرسمية
          </span>
          <h1 className="text-2xl font-black sm:text-3xl">مرحباً، {user?.name || "معلمنا"}</h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-blue-200">المواد المسندة:</span>
            {user?.subjects?.length ? (
              user.subjects.map((subject) => (
                <span
                  key={subject._id || subject}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: subject.color || "#2563eb" }}
                >
                  <span aria-hidden="true">📖</span>
                  <span>{subject.name || subject}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-blue-200">لم تُحدد بعد</span>
            )}
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-center backdrop-blur-md sm:w-auto sm:px-6">
          <div>
            <span className="block text-2xl font-black text-white">{totalAssignedClasses}</span>
            <span className="text-[11px] font-semibold text-blue-200">حصصك بالجدول</span>
          </div>
          <div className="h-8 w-px bg-white/20" aria-hidden="true" />
          <div>
            <span className="block text-2xl font-black text-emerald-300">{completedPlansCount}</span>
            <span className="text-[11px] font-semibold text-blue-200">دروس لها عنوان</span>
          </div>
          <div className="h-8 w-px bg-white/20" aria-hidden="true" />
          <div>
            <span className="block text-2xl font-black text-amber-300">{homeworksCount}</span>
            <span className="text-[11px] font-semibold text-blue-200">واجبات مسجلة</span>
          </div>
        </div>
      </section>

      {hasIncompletePlan && (
        <section
          role="alert"
          aria-labelledby="incomplete-plan-title"
          className="rounded-2xl border-2 border-red-300 border-r-8 bg-red-50 p-4 text-red-950 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden="true">⚠️</span>
              <div>
                <h2 id="incomplete-plan-title" className="text-sm font-black sm:text-base">
                  تنبيه: توجد بيانات ناقصة في الخطة الأسبوعية
                </h2>
                <p className="mt-1 text-xs font-semibold leading-6 text-red-800 sm:text-sm">
                  يوجد <strong>{incompleteSlotsCount} حصة</strong> تحتاج إلى مراجعة في {currentWeek?.label || "هذا الأسبوع"}.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  {missingTitleCount > 0 && (
                    <span className="rounded-lg bg-red-100 px-2.5 py-1 text-red-800">{missingTitleCount} بدون عنوان درس</span>
                  )}
                  {missingHomeworkCount > 0 && (
                    <span className="rounded-lg bg-red-100 px-2.5 py-1 text-red-800">{missingHomeworkCount} بدون واجب</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("plan")}
              className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              ✏️ استكمال الخطة الآن
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-col items-stretch justify-between gap-4 border-b border-gray-200 pb-2 sm:flex-row sm:items-center">
        <nav aria-label="أقسام لوحة المعلم" className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl bg-gray-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`relative flex min-w-max flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                activeTab === tab.id
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
              }`}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === "plan" && hasIncompletePlan && (
                <span className="h-2 w-2 rounded-full bg-red-600" title="توجد بيانات ناقصة" aria-label="توجد بيانات ناقصة" />
              )}
            </button>
          ))}
        </nav>

        {activeTab === "plan" || activeTab === "timetable" ? (
          <ExportButtons
            targetElementId={
              activeTab === "plan"
                ? "teacher-weekly-plan-container"
                : "teacher-official-timetable-container"
            }
            weekLabel={
              activeTab === "plan"
                ? `خطة_${user?.name || "المعلم"}_${currentWeek?.label || ""}`
                : `جدول_حصص_${user?.name || "المعلم"}`
            }
          />
        ) : null}
      </div>

      {activeTab !== "settings" && (
        <WeekNavigator
          weeks={weeks}
          currentWeek={currentWeek}
          onSelectWeek={handleSelectWeek}
          canCopy={false}
          canAdd={false}
        />
      )}

      <ErrorBoundary title="تعذر عرض بيانات خطة المعلم">
        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : activeTab === "settings" ? (
          <TeacherSettingsView />
        ) : activeTab === "preparation" ? (
          <div className="space-y-4">
            <LessonPreparationWorkspace
              week={currentWeek}
              weeks={weeks}
              onSelectWeek={handleSelectWeek}
              schedules={schedules}
              settings={settings}
              subjects={subjects}
              onRefresh={() => currentWeek && handleSelectWeek(currentWeek)}
            />
          </div>
        ) : activeTab === "timetable" ? (
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
          <div className="space-y-4">
            <WeeklyScheduleTable
              week={currentWeek}
              schedules={schedules}
              settings={settings}
              subjects={subjects}
              onSaveCell={handleInlineSave}
              onBulkSave={handleBulkSave}
              enableInlineEdit
            />
          </div>
        )}
      </ErrorBoundary>

      <AvailableTimetablesModal
        isOpen={availableModalOpen}
        onClose={() => setAvailableModalOpen(false)}
        onClaimed={() => window.location.reload()}
      />

      <TeacherOnboardingModal
        isOpen={Boolean(user && !user.isProfileComplete && !user.role?.isSystem)}
        onComplete={() => window.location.reload()}
      />
    </main>
  );
}
