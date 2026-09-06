"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import WeekNavigator from "@/components/schedule/WeekNavigator";
import WeeklyScheduleTable from "@/components/schedule/WeeklyScheduleTable";
import ScheduleCellEditModal from "@/components/schedule/ScheduleCellEditModal";
import ExportButtons from "@/components/schedule/ExportButtons";
import TeacherOnboardingModal from "@/components/auth/TeacherOnboardingModal";
import { TableSkeleton } from "@/components/ui";

const DEFAULT_CLASSES = [
  "أول أول",
  "أول ثاني",
  "أول ثالث",
  "ثاني أول",
  "ثاني ثاني",
  "ثالث أول",
  "ثالث ثاني",
];

export default function TeacherWeeklyPlanPreviewPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Class Selection Filter
  const [selectedClass, setSelectedClass] = useState("");

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [activeDay, setActiveDay] = useState("الأحد");
  const [activePeriod, setActivePeriod] = useState(1);
  const [activeDefaultClass, setActiveDefaultClass] = useState("");
  const [saving, setSaving] = useState(false);

  // Compute available classes dynamically from schedules + defaults
  const allClassesList = [
    ...new Set([
      ...DEFAULT_CLASSES,
      ...schedules.map((s) => (s.className || "").trim()).filter(Boolean),
    ]),
  ];

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
          const schedRes = await schedulesService.getByWeek(activeWk._id);
          setSchedules(schedRes.data?.schedules || []);
        }
      } catch (err) {
        console.error("Error loading weekly plan preview:", err);
        toast.error("حدث خطأ أثناء تحميل بيانات الخطة الأسبوعية");
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
      const res = await schedulesService.getByWeek(week._id);
      setSchedules(res.data?.schedules || []);
    } catch (err) {
      toast.error("فشل جلب جدول الأسبوع المختار");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCell = (cell, day, period, classForCell) => {
    setActiveCell(cell);
    setActiveDay(day);
    setActivePeriod(period);
    setActiveDefaultClass(classForCell || selectedClass || "");
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
        toast.success("تم تحديث تحضير الحصة بنجاح ✅");
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ التعديلات";
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
            <span className="text-2xl">📋</span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              استعراض الخطة الأسبوعية المدرسية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            استعراض شكل وتنسيق الخطة والجدول الأسبوعي لجميع فصول المدرسة مع إمكانية التصدير والطباعة
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

      {/* Class Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
            <span>🏫</span>
            <span>تصفية حسب الفصل:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedClass("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedClass === ""
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            جميع الفصول
          </button>

          {allClassesList.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedClass === cls
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        {selectedClass && (
          <button
            type="button"
            onClick={() => setSelectedClass("")}
            className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
          >
            ✕ إلغاء التصفية
          </button>
        )}
      </div>

      {/* Controls: Week Navigator + Export Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1">
          <WeekNavigator
            weeks={weeks}
            currentWeek={currentWeek}
            onSelectWeek={handleSelectWeek}
            canCopy={false}
            canAdd={false}
          />
        </div>
        <ExportButtons
          targetElementId="weekly-schedule-print-container"
          weekLabel={`خطة_الأسبوع_${currentWeek?.label || ""}${selectedClass ? `_فصل_${selectedClass}` : ""}`}
        />
      </div>

      {/* Weekly Schedule Table View */}
      {loading ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs">
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : (
        <WeeklyScheduleTable
          week={currentWeek}
          schedules={schedules}
          settings={settings}
          subjects={subjects}
          selectedClass={selectedClass}
          onSelectClass={(cls) => setSelectedClass(cls)}
          onEditCell={handleEditCell}
        />
      )}

      {/* Edit Cell Modal */}
      <ScheduleCellEditModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        schedule={activeCell}
        week={currentWeek}
        day={activeDay}
        period={activePeriod}
        defaultClassName={activeDefaultClass}
        subjects={subjects}
        teachers={[user]}
        onSave={handleSaveCell}
        onBulkFill={(updatedSchedules) => {
          if (!Array.isArray(updatedSchedules)) return;
          setSchedules((prev) => {
            const map = {};
            updatedSchedules.forEach((s) => {
              map[s._id] = s;
            });
            return prev.map((item) => map[item._id] || item);
          });
        }}
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
