"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import WeekNavigator from "@/components/schedule/WeekNavigator";
import LessonPreparationWorkspace from "@/components/schedule/LessonPreparationWorkspace";
import { TableSkeleton, ErrorBoundary } from "@/components/ui";

export default function TeacherLessonPreparationPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load Initial Metadata
  const fetchData = async () => {
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
      console.error("Error loading teacher preparation data:", err);
      toast.error("حدث خطأ أثناء تحميل بيانات التحضير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  return (
    <ErrorBoundary>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        {/* Week Navigator */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-white shadow-xs overflow-hidden no-print">
          <WeekNavigator
            weeks={weeks}
            currentWeek={currentWeek}
            onSelectWeek={handleSelectWeek}
            canCopy={false}
            canAdd={false}
          />
        </section>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <LessonPreparationWorkspace
            week={currentWeek}
            weeks={weeks}
            onSelectWeek={handleSelectWeek}
            schedules={schedules}
            settings={settings}
            subjects={subjects}
            onRefresh={() => handleSelectWeek(currentWeek)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
