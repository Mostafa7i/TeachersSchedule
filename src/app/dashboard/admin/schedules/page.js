"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { usersService } from "@/services/users.service";
import { settingsService } from "@/services/settings.service";
import WeekNavigator from "@/components/schedule/WeekNavigator";
import WeeklyScheduleTable from "@/components/schedule/WeeklyScheduleTable";
import ScheduleCellEditModal from "@/components/schedule/ScheduleCellEditModal";
import CopyWeekModal from "@/components/schedule/CopyWeekModal";
import ExportButtons from "@/components/schedule/ExportButtons";
import { TableSkeleton } from "@/components/ui";

const COMMON_CLASSES = [
  "ثاني ثاني",
  "أول أول",
  "أول ثاني",
  "أول ثالث",
  "ثاني أول",
  "ثاني ثالث",
  "ثالث أول",
  "ثالث ثاني",
  "ثالث ثالث",
];

export default function AdminSchedulesPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Class Selection
  const [selectedClass, setSelectedClass] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [activeDay, setActiveDay] = useState("الأحد");
  const [activePeriod, setActivePeriod] = useState(1);
  const [activeDefaultClass, setActiveDefaultClass] = useState("");
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  // Compute available classes dynamically from schedules + defaults
  const availableClasses = useState(() => {
    return COMMON_CLASSES;
  })[0];

  const allClassesList = [
    ...new Set([
      ...COMMON_CLASSES,
      ...schedules.map((s) => s.className).filter(Boolean),
    ]),
  ];

  // Load all initial metadata
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [weeksRes, currWeekRes, subjectsRes, teachersRes, settingsRes] =
          await Promise.all([
            weeksService.getAll(),
            weeksService.getCurrent(),
            subjectsService.getAll({ isActive: true }),
            usersService.getTeachers(),
            settingsService.get(),
          ]);

        setWeeks(weeksRes.data || []);
        const activeWk = currWeekRes.data || weeksRes.data?.[0] || null;
        setCurrentWeek(activeWk);
        setSubjects(subjectsRes.data || []);
        setTeachers(teachersRes.data || []);
        setSettings(settingsRes.data || null);

        if (activeWk) {
          const schedRes = await schedulesService.getByWeek(activeWk._id);
          setSchedules(schedRes.data?.schedules || []);
        }
      } catch (err) {
        console.error("Error fetching schedules:", err);
        toast.error("حدث خطأ أثناء تحميل بيانات الجدول");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Fetch schedules for selected week and filters
  const fetchSchedules = async (
    weekId,
    teacherId = filterTeacher,
    subjectId = filterSubject,
  ) => {
    if (!weekId) return;
    try {
      setLoading(true);
      const params = {};
      if (teacherId) params.teacherId = teacherId;
      if (subjectId) params.subjectId = subjectId;

      const res = await schedulesService.getByWeek(weekId, params);
      setSchedules(res.data?.schedules || []);
    } catch (err) {
      toast.error("فشل جلب جدول الأسبوع");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWeek = (week) => {
    setCurrentWeek(week);
    fetchSchedules(week._id, filterTeacher, filterSubject);
  };

  const handleFilterTeacherChange = (teacherId) => {
    setFilterTeacher(teacherId);
    if (currentWeek) fetchSchedules(currentWeek._id, teacherId, filterSubject);
  };

  const handleFilterSubjectChange = (subjectId) => {
    setFilterSubject(subjectId);
    if (currentWeek) fetchSchedules(currentWeek._id, filterTeacher, subjectId);
  };

  const handleEditCell = (cell, day, period, classForCell) => {
    setActiveCell(cell);
    setActiveDay(day);
    setActivePeriod(period);
    setActiveDefaultClass(classForCell || selectedClass || "");
    setEditModalOpen(true);
  };

  const handleAddSchedule = () => {
    setActiveCell(null);
    setActiveDay("الأحد");
    setActivePeriod(1);
    setActiveDefaultClass(selectedClass || "");
    setEditModalOpen(true);
  };

  const handleSaveCell = async (formData) => {
    setSaving(true);
    try {
      if (formData.id) {
        const res = await schedulesService.update(formData.id, formData);
        setSchedules((prev) =>
          prev.map((item) => (item._id === formData.id ? res.data : item)),
        );
        toast.success("تم تحديث بيانات الحصة بنجاح ✅");
      } else {
        const res = await schedulesService.create(formData);
        setSchedules((prev) => {
          const filtered = prev.filter(
            (item) =>
              !(
                item.day === res.data.day &&
                item.period === res.data.period &&
                item.className === res.data.className
              ),
          );
          return [...filtered, res.data];
        });
        toast.success("تمت إضافة الحصة بنجاح ✅");
      }
      setEditModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || "فشل حفظ بيانات الحصة";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWeek = async (sourceWeekId, targetWeekId, overwrite) => {
    setCopying(true);
    try {
      const res = await schedulesService.copyWeek(
        sourceWeekId,
        targetWeekId,
        overwrite,
      );
      toast.success(res.message || "تم نسخ جدول الأسبوع بنجاح 🎉");
      setCopyModalOpen(false);

      // If we copied to current week, reload
      if (targetWeekId === currentWeek?._id) {
        fetchSchedules(currentWeek._id);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "فشل نسخ جدول الأسبوع";
      toast.error(msg);
    } finally {
      setCopying(false);
    }
  };

  const exportFilename = selectedClass
    ? `الخطة_الأسبوعية_فصل_${selectedClass.replace(/\s+/g, "_")}_${currentWeek?.label || ""}`
    : currentWeek?.label || "الجدول_الأسبوعي";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            إدارة الخطة والجداول الأسبوعية
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            عرض وتعديل وتصدير الخطة الأسبوعية والتحضير المدرسي لكل فصل دراسي على
            حدة.
          </p>
        </div>

        <ExportButtons
          targetElementId="weekly-schedule-print-container"
          weekLabel={exportFilename}
        />
      </div>

      {/* Week Navigator Bar */}
      <WeekNavigator
        weeks={weeks}
        currentWeek={currentWeek}
        onSelectWeek={handleSelectWeek}
        onCopyWeek={() => setCopyModalOpen(true)}
        onAddSchedule={handleAddSchedule}
        canCopy={true}
        canAdd={true}
      />

      {/* Class Selector Tabs Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <span className="text-base">🏫</span>
            <span>عرض الخطة الأسبوعية حسب الفصل الدراسي:</span>
          </div>
          {selectedClass && (
            <button
              onClick={() => setSelectedClass("")}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              عرض جميع الفصول ⟲
            </button>
          )}
        </div>

        {/* Horizontal scrollable pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedClass("")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedClass === ""
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span>📋</span>
            <span>جميع الفصول (الكل)</span>
          </button>

          {allClassesList.map((cls) => {
            const isSelected = selectedClass === cls;
            const classSchedulesCount = schedules.filter(
              (s) => s.className === cls,
            ).length;

            return (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-1"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>🏫</span>
                <span>فصل {cls}</span>
                {classSchedulesCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? "bg-blue-800 text-white"
                        : "bg-white text-gray-700 border border-gray-200"
                    }`}
                  >
                    {classSchedulesCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtering Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <span className="text-xs font-bold text-gray-600">تصفية إضافية:</span>

          {/* Teacher Filter */}
          <select
            value={filterTeacher}
            onChange={(e) => handleFilterTeacherChange(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">جميع المعلمين (الكل)</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                👨‍🏫 {t.name}
              </option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={filterSubject}
            onChange={(e) => handleFilterSubjectChange(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">جميع المواد الدراسية (الكل)</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                📖 {s.name} ({s.code})
              </option>
            ))}
          </select>

          {(filterTeacher || filterSubject || selectedClass) && (
            <button
              onClick={() => {
                setFilterTeacher("");
                setFilterSubject("");
                setSelectedClass("");
                if (currentWeek) fetchSchedules(currentWeek._id, "", "");
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              إلغاء كل التصفية ✕
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 font-semibold">
          عدد الحصص المسجلة:{" "}
          <span className="text-blue-600 font-bold">
            {selectedClass
              ? schedules.filter((s) => s.className === selectedClass).length
              : schedules.length}
          </span>
        </div>
      </div>

      {/* Main Schedule Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
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
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        schedule={activeCell}
        week={currentWeek}
        day={activeDay}
        period={activePeriod}
        defaultClassName={activeDefaultClass}
        subjects={subjects}
        teachers={teachers}
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

      {/* Copy Week Modal */}
      <CopyWeekModal
        isOpen={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        sourceWeek={currentWeek}
        weeks={weeks}
        onCopy={handleCopyWeek}
        loading={copying}
      />
    </div>
  );
}
