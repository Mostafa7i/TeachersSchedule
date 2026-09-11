"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { schedulesService } from "@/services/schedules.service";
import WeeklyScheduleTable from "@/components/schedule/WeeklyScheduleTable";
import ScheduleCellEditModal from "@/components/schedule/ScheduleCellEditModal";
import ExportButtons from "@/components/schedule/ExportButtons";
import { TableSkeleton } from "@/components/ui";

export default function TeacherWeeklyPlanModal({
  isOpen,
  onClose,
  teacher,
  initialWeekId,
  weeks = [],
  settings,
  subjects = [],
  onSaveSuccess,
}) {
  const [selectedWeekId, setSelectedWeekId] = useState(initialWeekId || "");
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");

  // Edit cell modal state (Admin can edit any cell directly from here)
  const [editCellModalOpen, setEditCellModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [activeDay, setActiveDay] = useState("الأحد");
  const [activePeriod, setActivePeriod] = useState(1);
  const [activeDefaultClass, setActiveDefaultClass] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialWeekId) {
      setSelectedWeekId(initialWeekId);
    } else if (weeks.length > 0 && !selectedWeekId) {
      setSelectedWeekId(weeks[0]._id);
    }
  }, [initialWeekId, weeks]);

  useEffect(() => {
    if (isOpen && teacher?._id && selectedWeekId) {
      fetchTeacherSchedules(teacher._id, selectedWeekId);
    }
  }, [isOpen, teacher?._id, selectedWeekId]);

  const fetchTeacherSchedules = async (tId, wId) => {
    setLoading(true);
    try {
      const res = await schedulesService.getTeacherTimetable(tId, wId);
      setSchedules(res.data?.schedules || []);
    } catch (err) {
      console.error("Error fetching teacher plan:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentWeek = weeks.find((w) => w._id === selectedWeekId) || null;

  // Distinct classes for this teacher
  const teacherClasses = [
    ...new Set(
      schedules.map((s) => (s.className || "").trim()).filter(Boolean),
    ),
  ];

  // Stats
  const totalAssigned = schedules.length;
  const completedCount = schedules.filter(
    (s) => s.lessonTitle?.trim() && s.homework?.trim(),
  ).length;
  const missingLessons = schedules.filter((s) => !s.lessonTitle?.trim()).length;
  const missingHomework = schedules.filter((s) => !s.homework?.trim()).length;
  const completionRate =
    totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  // Edit cell handlers
  const handleEditCell = (cell, day, period, classForCell) => {
    setActiveCell(cell);
    setActiveDay(day);
    setActivePeriod(period);
    setActiveDefaultClass(classForCell || selectedClass || "");
    setEditCellModalOpen(true);
  };

  const handleSaveCell = async (formData) => {
    setSaving(true);
    try {
      if (formData.id) {
        await schedulesService.update(formData.id, formData);
      } else {
        await schedulesService.create({
          ...formData,
          teacher: teacher._id,
        });
      }
      // Re-fetch schedules
      if (teacher?._id && selectedWeekId) {
        await fetchTeacherSchedules(teacher._id, selectedWeekId);
      }
      setEditCellModalOpen(false);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      alert(err.response?.data?.message || "فشل حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !teacher) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📘 خطة الدروس والواجبات - المعلم: ${teacher.name}`}
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-gray-500 font-semibold hidden sm:inline">
            نسبة الإنجاز:{" "}
            <strong
              className={
                completionRate === 100
                  ? "text-emerald-600"
                  : completionRate >= 50
                    ? "text-amber-600"
                    : "text-red-600"
              }
            >
              {completionRate}% ({completedCount} من {totalAssigned} حصة)
            </strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top Teacher & Week Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Teacher Profile Summary */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-lg text-white shadow-md">
              {teacher.name ? teacher.name[0] : "م"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">
                  {teacher.name}
                </h3>
                <span className="text-[11px] bg-blue-500/30 border border-blue-400/40 text-blue-200 px-2 py-0.5 rounded-md font-bold">
                  معلم
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300">
                {teacher.subjects && teacher.subjects.length > 0 && (
                  <span>
                    📚 المواد:{" "}
                    {teacher.subjects
                      .map((s) => (typeof s === "object" ? s.name : s))
                      .join(" • ")}
                  </span>
                )}
                {teacher.phone && <span>📞 {teacher.phone}</span>}
              </div>
            </div>
          </div>

          {/* Week Selector & Export Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="px-3 py-1.5 text-xs font-black bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white focus:outline-none cursor-pointer"
            >
              {weeks.map((w) => (
                <option key={w._id} value={w._id} className="text-slate-900">
                  📅 {w.label}
                </option>
              ))}
            </select>

            <ExportButtons
              targetElementId="admin-teacher-weekly-plan-container"
              weekLabel={`خطة_${teacher.name}_${currentWeek?.label || ""}`}
            />
          </div>
        </div>

        {/* KPI Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl text-center">
            <span className="text-[11px] text-blue-700 font-bold block">
              إجمالي الحصص
            </span>
            <span className="text-lg font-black text-blue-950">
              {totalAssigned}
            </span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl text-center">
            <span className="text-[11px] text-emerald-700 font-bold block">
              مكتملة الخطة
            </span>
            <span className="text-lg font-black text-emerald-700">
              {completedCount} ({completionRate}%)
            </span>
          </div>

          <div className="bg-red-50/60 border border-red-200 p-3 rounded-xl text-center">
            <span className="text-[11px] text-red-700 font-bold block">
              دروس فارغة
            </span>
            <span className="text-lg font-black text-red-600">
              {missingLessons}
            </span>
          </div>

          <div className="bg-purple-50/60 border border-purple-200 p-3 rounded-xl text-center">
            <span className="text-[11px] text-purple-700 font-bold block">
              واجبات فارغة
            </span>
            <span className="text-lg font-black text-purple-600">
              {missingHomework}
            </span>
          </div>
        </div>

        {/* Class Filter Bar */}
        {teacherClasses.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700">
                🏫 تصفية الفصول:
              </span>
              <button
                type="button"
                onClick={() => setSelectedClass("")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedClass === ""
                    ? "bg-slate-900 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                الكل ({teacherClasses.length})
              </button>

              {teacherClasses.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedClass === cls
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  فصل {cls}
                </button>
              ))}
            </div>

            {selectedClass && (
              <button
                type="button"
                onClick={() => setSelectedClass("")}
                className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
              >
                ✕ إلغاء التصفية
              </button>
            )}
          </div>
        )}

        {/* Plan Table View */}
        {loading ? (
          <div className="p-6 bg-white rounded-2xl border border-gray-100">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : (
          <div
            id="admin-teacher-weekly-plan-container"
            className="overflow-x-auto"
          >
            <WeeklyScheduleTable
              week={currentWeek}
              schedules={schedules}
              settings={settings}
              subjects={subjects}
              selectedClass={selectedClass}
              onSelectClass={(cls) => setSelectedClass(cls)}
              onEditCell={handleEditCell}
              onSaveCell={async (formData) => {
                if (!formData.id) return;
                await schedulesService.update(formData.id, formData);
                setSchedules((prev) =>
                  prev.map((item) =>
                    item._id === formData.id ? { ...item, ...formData } : item,
                  ),
                );
                if (onSaveSuccess) onSaveSuccess();
              }}
              onBulkSave={async (updates) => {
                await schedulesService.bulkUpdateLessons(updates);
                if (teacher?._id && selectedWeekId) {
                  fetchTeacherSchedules(teacher._id, selectedWeekId);
                }
                if (onSaveSuccess) onSaveSuccess();
              }}
              enableInlineEdit={true}
              readOnly={false}
            />
          </div>
        )}
      </div>

      {/* Edit Cell Modal for Admin */}
      <ScheduleCellEditModal
        isOpen={editCellModalOpen}
        onClose={() => setEditCellModalOpen(false)}
        schedule={activeCell}
        week={currentWeek}
        day={activeDay}
        period={activePeriod}
        defaultClassName={activeDefaultClass}
        subjects={subjects}
        teachers={[teacher]}
        onSave={handleSaveCell}
        onBulkFill={(updatedSchedules) => {
          if (teacher?._id && selectedWeekId) {
            fetchTeacherSchedules(teacher._id, selectedWeekId);
          }
        }}
        loading={saving}
      />
    </Modal>
  );
}
