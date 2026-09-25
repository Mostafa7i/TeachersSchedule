"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import WeekNavigator from "@/components/schedule/WeekNavigator";
import TeacherTimetableGrid from "@/components/schedule/TeacherTimetableGrid";
import WeeklyScheduleTable from "@/components/schedule/WeeklyScheduleTable";
import ExportButtons from "@/components/schedule/ExportButtons";
import TeacherOnboardingModal from "@/components/auth/TeacherOnboardingModal";
import AvailableTimetablesModal from "@/components/schedule/AvailableTimetablesModal";
import { TableSkeleton, ErrorBoundary } from "@/components/ui";

export default function TeacherDashboardPage() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("plan"); // 'plan' | 'timetable' | 'settings'
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [availableModalOpen, setAvailableModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [activeDay, setActiveDay] = useState("");
  const [activePeriod, setActivePeriod] = useState(1);
  const [planViewMode, setPlanViewMode] = useState("table"); // 'table' | 'cards'
  const [planScale, setPlanScale] = useState(85); // 70 | 85 | 100
  const [selectedPlanDay, setSelectedPlanDay] = useState("الأحد");
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const daysList = settings?.workDays || [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
  ];
  const periodsCount = settings?.periodsCount || 6;
  const periodsList = Array.from({ length: periodsCount }, (_, i) => i + 1);

  useEffect(() => {
    setProfileName(user?.name || "");
  }, [user?.name]);
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

  const handleProfileNameSave = async (event) => {
    event.preventDefault();
    const name = profileName.trim();
    if (name.length < 2) {
      toast.error("يرجى إدخال الاسم الكامل بشكل صحيح");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({ name });
      toast.success("تم تحديث اسمك بنجاح ✅");
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل تحديث الاسم");
    } finally {
      setSavingProfile(false);
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
      {/* Empty State Banner if no classes assigned */}
      {totalAssignedClasses === 0 && !loading && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border-2 border-blue-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg shadow-blue-500/25">
            📋
          </div>
          <div className="space-y-1.5 max-w-xl mx-auto">
            <h2 className="text-lg sm:text-xl font-black text-gray-900">
              لم يتم تعيين جدول حصص لحسابك لهذا الأسبوع بعد!
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              إذا كانت إدارة المدرسة قد قامت بإعداد جدول الحصص مسبقاً، يمكنك
              اختياره وربطه بحسابك فوراً للبدء في كتابة عناوين الدروس والواجبات.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setAvailableModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>📋</span>
              <span>استعراض واختيار جدولي من الجداول المتاحة بالمدرسة 🚀</span>
            </button>
          </div>
        </div>
      )}

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
              دروس مسجلة بالخطة
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
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-3xl flex-shrink-0">⚠️</span>
            <div>
              <h3 className="text-sm font-black text-amber-950">
                تنبيه من النظام: الخطة الأسبوعية غير مكتملة لهذا الأسبوع!
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
            ✏️ استكمال الخطة الآن
          </button>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2 bg-gray-200/70 p-1 rounded-2xl max-w-2xl">
          <button
            onClick={() => setActiveTab("plan")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "plan"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>📝</span>
            <span>الخطة الأسبوعية والدروس</span>
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

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>⚙️</span>
            <span>إعدادات الحساب</span>
          </button>
        </div>

        {/* Export Buttons */}
        {activeTab !== "settings" && (
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
        )}
      </div>

      {/* Week Navigator Bar */}
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
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : activeTab === "settings" ? (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 bg-gradient-to-l from-slate-900 via-blue-900 to-indigo-950 text-white">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">
                  ⚙️
                </span>
                <div>
                  <h2 className="text-xl font-black">إعدادات الحساب</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    حدّث الاسم الظاهر في لوحة المعلم والجداول.
                  </p>
                </div>
              </div>
            </div>
            <form
              onSubmit={handleProfileNameSave}
              className="p-6 sm:p-8 space-y-6"
            >
              <div>
                <label
                  htmlFor="teacher-profile-name"
                  className="block text-sm font-black text-gray-800 mb-2"
                >
                  الاسم الكامل
                </label>
                <input
                  id="teacher-profile-name"
                  type="text"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  maxLength={100}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="اكتب اسمك الكامل"
                />
                <p className="mt-2 text-xs text-gray-500">
                  سيظهر الاسم الجديد فورًا في حسابك والقائمة الجانبية.
                </p>
              </div>
              <div>
                <label className="block text-sm font-black text-gray-800 mb-2">
                  البريد الإلكتروني
                </label>
                <div
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-sm"
                  dir="ltr"
                >
                  {user?.email}
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile || profileName.trim().length < 2}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProfile ? "جاري الحفظ..." : "حفظ الاسم"}
                </button>
              </div>
            </form>
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
          /* TAB 2: Weekly Plan (Inline Direct Editable)                               */
          /* ========================================================================= */
          <div className="space-y-4">
            <WeeklyScheduleTable
              week={currentWeek}
              schedules={schedules}
              settings={settings}
              subjects={subjects}
              onSaveCell={async (formData) => {
                if (!formData.id) return;
                await schedulesService.update(formData.id, formData);
                setSchedules((prev) =>
                  prev.map((item) =>
                    item._id === formData.id ? { ...item, ...formData } : item,
                  ),
                );
              }}
              onBulkSave={async (updates) => {
                await schedulesService.bulkUpdateLessons(updates);
                const schedRes = await schedulesService.getForTeacher(
                  currentWeek._id,
                );
                setSchedules(schedRes.data?.schedules || []);
              }}
              enableInlineEdit={true}
            />
          </div>
        )}
      </ErrorBoundary>

      {/* Obligatory Teacher Onboarding Modal if not completed */}
      <AvailableTimetablesModal
        isOpen={availableModalOpen}
        onClose={() => setAvailableModalOpen(false)}
        onClaimed={() => {
          window.location.reload();
        }}
      />

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
