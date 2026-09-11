"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import WeekNavigator from "@/components/schedule/WeekNavigator";
import WeeklyScheduleTable from "@/components/schedule/WeeklyScheduleTable";
import ExportButtons from "@/components/schedule/ExportButtons";
import TeacherOnboardingModal from "@/components/auth/TeacherOnboardingModal";
import { TableSkeleton } from "@/components/ui";

import { getLogoUrl, getClassBadgeStyle } from "@/lib/utils";

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

  // Only show classes that are actually assigned to the logged-in teacher in active schedules
  const allClassesList = [
    ...new Set([
      ...schedules.map((s) => (s.className || "").trim()).filter(Boolean),
    ]),
  ].sort();

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
      const res = await schedulesService.getForTeacher(week._id);
      setSchedules(res.data?.schedules || []);
    } catch (err) {
      toast.error("فشل جلب جدول الأسبوع المختار");
    } finally {
      setLoading(false);
    }
  };

  // List of subjects taught by this teacher
  const teacherSubjectsList = subjects.filter((s) =>
    (user?.subjects || []).some(
      (us) => (us._id ? us._id.toString() : us.toString()) === s._id.toString(),
    ),
  );

  // Direct Inline Cell Save
  const handleSaveInlineCell = async (formData) => {
    if (!formData.id) return;
    const res = await schedulesService.update(formData.id, formData);
    setSchedules((prev) =>
      prev.map((item) =>
        item._id === formData.id ? { ...item, ...formData } : item,
      ),
    );
    return res;
  };

  // Direct Bulk Save
  const handleBulkSaveInline = async (updates) => {
    const res = await schedulesService.bulkUpdateLessons(updates);
    setSchedules((prev) => {
      const updateMap = {};
      updates.forEach((u) => {
        updateMap[u.id] = u;
      });
      return prev.map((item) =>
        updateMap[item._id] ? { ...item, ...updateMap[item._id] } : item,
      );
    });
    return res;
  };

  // Quick subject change for an entire class
  const handleSetClassSubject = async (clsName, newSubjectId) => {
    if (!currentWeek?._id || !clsName || !newSubjectId) return;
    try {
      setLoading(true);
      const res = await schedulesService.setClassSubject({
        weekId: currentWeek._id,
        className: clsName,
        subjectId: newSubjectId,
      });
      toast.success(res.message || "تم تحديث مادة الفصل بنجاح ✅");
      const schedRes = await schedulesService.getForTeacher(currentWeek._id);
      setSchedules(schedRes.data?.schedules || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل تغيير مادة الفصل");
    } finally {
      setLoading(false);
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
              خطتي الأسبوعية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            اكتب موضوع الدرس والواجبات مباشرة في الجدول، مع إمكانية النسخ والحفظ
            الفوري.
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

      {/* Class Filter Bar with Distinct Colors */}
      <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
            <span>🏫</span>
            <span>تصفية حسب الفصل:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedClass("")}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              selectedClass === ""
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            جميع الفصول
          </button>

          {allClassesList.map((cls) => {
            const isSelected = selectedClass === cls;
            const style = getClassBadgeStyle(cls);
            return (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                  isSelected
                    ? `${style.solid} shadow-xs scale-105`
                    : `${style.badge} hover:scale-105`
                }`}
              >
                {cls}
              </button>
            );
          })}
        </div>

        {selectedClass && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Class Subject Switcher for Multi-subject Teacher */}
            {teacherSubjectsList.length > 1 && (
              <div className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 px-3 py-1.5 rounded-2xl text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  <span>📚</span>
                  <span>مادة فصل {selectedClass}:</span>
                </span>
                <select
                  value={
                    schedules.find((s) => s.className === selectedClass)
                      ?.subject?._id ||
                    schedules.find((s) => s.className === selectedClass)
                      ?.subject ||
                    ""
                  }
                  onChange={(e) =>
                    handleSetClassSubject(selectedClass, e.target.value)
                  }
                  className="px-2.5 py-1 text-xs font-black bg-white border border-blue-300 text-blue-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                >
                  {teacherSubjectsList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedClass("")}
              className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
            >
              ✕ إلغاء التصفية
            </button>
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
            canCopy={false}
            canAdd={false}
          />
        </div>
        <ExportButtons
          targetElementId="weekly-schedule-print-container"
          weekLabel={`خطة_الأسبوع_${currentWeek?.label || ""}${selectedClass ? `_فصل_${selectedClass}` : ""}`}
        />
      </div>

      {/* Weekly Schedule Table View with Direct Inline Editing */}
      {loading ? (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs">
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
          onSaveCell={handleSaveInlineCell}
          onBulkSave={handleBulkSaveInline}
          enableInlineEdit={true}
        />
      )}

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
