"use client";

import { useState, useEffect, useRef } from "react";
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

import { getClassBadgeStyle } from "@/lib/utils";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";

export default function TeacherWeeklyPlanPreviewPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAtRight, setIsAtRight] = useState(true);
  const [isAtLeft, setIsAtLeft] = useState(false);
  const classesScrollRef = useRef(null);
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

  useEffect(() => {
    const container = classesScrollRef.current;
    if (!container) return;

    const updateScrollEdges = () => {
      const first = container.firstElementChild;
      const last = container.lastElementChild;

      if (!first || !last) return;

      const containerRect = container.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();

      // بداية المحتوى من ناحية اليمين (RTL)
      setIsAtRight(firstRect.right <= containerRect.right + 2);

      // نهاية المحتوى من ناحية اليسار (RTL)
      setIsAtLeft(lastRect.left >= containerRect.left - 2);
    };

    updateScrollEdges();

    container.addEventListener("scroll", updateScrollEdges, {
      passive: true,
    });

    const resizeObserver = new ResizeObserver(updateScrollEdges);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollEdges);
      resizeObserver.disconnect();
    };
  }, [allClassesList]);
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
    <div className="space-y-4 max-w-full overflow-hidden">
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
      {/* Class Filter Bar with Distinct Colors */}
      <div className="bg-white sticky  top-10 rounded-3xl p-2 w-full  border border-gray-200 shadow-xs  items-center justify-between gap-3">
        <div className="text-xs mb-1 font-bold text-gray-700 flex items-center gap-1">
          <span>🏫</span>
          <p>تصفية حسب الفصل:</p>

          <div className="flex gap-1 md:hidden">
            {/* السهم اليمين */}
            <button
              type="button"
              onClick={() =>
                classesScrollRef.current?.scrollBy({
                  left: 200,
                  behavior: "smooth",
                })
              }
              className={`w-5 h-5 cursor-pointer rounded-full flex items-center justify-center transition-colors ${
                isAtRight ? "bg-gray-400 text-white" : "bg-slate-900 text-white"
              }`}
              aria-label="التمرير لليمين"
            >
              <ArrowBigRight size={14} />
            </button>

            {/* السهم اليسار */}
            <button
              type="button"
              onClick={() =>
                classesScrollRef.current?.scrollBy({
                  left: -200,
                  behavior: "smooth",
                })
              }
              className={`w-5 h-5 cursor-pointer rounded-full flex items-center justify-center transition-colors ${
                isAtLeft ? "bg-gray-400 text-white" : "bg-slate-900 text-white"
              }`}
              aria-label="التمرير لليسار"
            >
              <ArrowBigLeft size={14} />
            </button>
          </div>
        </div>
        <div
          className="flex flex-1 gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar"
          ref={classesScrollRef}
        >
          <button
            type="button"
            onClick={() => setSelectedClass("")}
            className={`px-3.5 py-1.5 text-nowrap rounded-2xl text-xs font-black transition-all cursor-pointer ${
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
                className={`px-2 py-1.5 text-nowrap  rounded-2xl text-xs font-black transition-all cursor-pointer border ${
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
              <div className="flex items-center  gap-1.5 bg-blue-50/80 border border-blue-200 px-2 py-1.5 rounded-2xl text-xs">
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
