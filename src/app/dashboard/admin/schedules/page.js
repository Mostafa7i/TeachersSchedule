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
import ClassScheduleShareModal from "@/components/schedule/ClassScheduleShareModal";
import ExportButtons from "@/components/schedule/ExportButtons";
import TeacherWeeklyPlanModal from "@/components/schedule/TeacherWeeklyPlanModal";
import PdfTimetableImportModal from "@/components/schedule/PdfTimetableImportModal";
import { TableSkeleton } from "@/components/ui";

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
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [shareClass, setShareClass] = useState("");
  const [activeCell, setActiveCell] = useState(null);
  const [activeDay, setActiveDay] = useState("الأحد");
  const [activePeriod, setActivePeriod] = useState(1);
  const [activeDefaultClass, setActiveDefaultClass] = useState("");
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  // Compute available classes dynamically purely from active schedules
  const allClassesList = [
    ...new Set(
      schedules.map((s) => (s.className || "").trim()).filter(Boolean),
    ),
  ].sort();

  const handleOpenShare = (clsName) => {
    setShareClass(clsName || selectedClass || allClassesList[0] || "");
    setShareModalOpen(true);
  };

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
    setActiveDay(settings?.workDays?.[0] || "الأحد");
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
    <div dir="rtl" className="min-h-screen bg-slate-50/80 p-3 sm:p-5 lg:p-8 space-y-5 sm:space-y-6">
      {/* Page Header */}
      <header className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5 shadow-sm no-print">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-lg shadow-sm">▦</span>
              <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">إدارة الجداول</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">الخطة والجدول الأسبوعي</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">تنظيم الحصص، متابعة الخطة، وتجهيز نسخة واضحة للطباعة والمشاركة.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
          {/* Share for WhatsApp button */}
          <button
            type="button"
            onClick={() => handleOpenShare(selectedClass)}
            aria-label="مشاركة الخطة الأسبوعية عبر واتساب"
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-emerald-500"
            title="إنشاء بطاقة مصممة للفصل ومشاركتها عبر واتساب"
          >
            <span className="text-base">📲</span>
            <span>مشاركة الجدول (واتساب)</span>
          </button>

          <ExportButtons
            targetElementId="weekly-schedule-print-container"
            weekLabel={exportFilename}
          />
        </div>
        </div>
      </header>

      {/* Week Navigator Bar */}
      <section className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden no-print">
      <WeekNavigator
        weeks={weeks}
        currentWeek={currentWeek}
        onSelectWeek={handleSelectWeek}
        onCopyWeek={() => setCopyModalOpen(true)}
        onAddSchedule={handleAddSchedule}
        canCopy={true}
        canAdd={true}
      />
      </section>

      {/* Class Selector Tabs Bar */}
      <section className="bg-white rounded-[1.5rem] p-3.5 sm:p-4 border border-slate-200 shadow-sm space-y-3 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <span className="text-base">🏫</span>
            <span>اختر الفصل لعرض خطته وتجهيز بطاقة مشاركة مستقلة</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedClass && (
              <button
                onClick={() => handleOpenShare(selectedClass)}
                className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>📲</span>
                <span>بطاقة مشاركة فصل {selectedClass}</span>
              </button>
            )}
            {selectedClass && (
              <button
                onClick={() => setSelectedClass("")}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                عرض جميع الفصول ⟲
              </button>
            )}
          </div>
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
      </section>

      {/* Filtering Bar */}
      <section className="bg-slate-100/80 rounded-[1.5rem] p-3 sm:p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <span className="text-xs font-bold text-gray-600">تصفية إضافية:</span>

          {/* Teacher Filter */}
          <select
            value={filterTeacher}
            onChange={(e) => handleFilterTeacherChange(e.target.value)}
            className="min-w-[190px] px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
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
            className="min-w-[190px] px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
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

          {filterTeacher && (
            <button
              type="button"
              onClick={() => setPlanModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="استعراض الخطة الأسبوعية لهذا المعلم"
            >
              <span>📋</span>
              <span>استعراض الخطة الأسبوعية للمعلم</span>
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
      </section>

      {/* Empty Week Quick Setup Wizard */}
      {!loading && schedules.length === 0 && currentWeek && (
        <div className="bg-slate-900 text-white rounded-[1.75rem] p-5 sm:p-6 shadow-lg border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💡</span>
            <div>
              <h3 className="text-lg font-black">
                {currentWeek.label} لا يحتوي على أي حصص بعد!
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                يمكنك تجهيز خطة هذا الأسبوع وتوزيع الحصص على جميع المعلمين
                تلقائياً بضغطة زر واحدة:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPdfModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>📄</span>
              <span>استيراد جدول المدرسة (PDF) وتوزيع الحصص تلقائياً</span>
            </button>

            {weeks.length > 1 && (
              <button
                type="button"
                onClick={() => setCopyModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>📋</span>
                <span>نسخ وتكرار حصص الأسبوع السابق</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Schedule Table / Export Artifact */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
      {loading ? (
        <div className="bg-white rounded-[1.5rem] p-5 sm:p-7 border border-slate-200 shadow-sm">
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
            if (currentWeek) fetchSchedules(currentWeek._id);
          }}
          onShareClass={handleOpenShare}
          enableInlineEdit={true}
        />
      )}
      </section>

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
            updatedSchedules.forEach((s) => {
              map[s._id] = s;
            });
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

      {/* PDF Timetable Import Modal */}
      <PdfTimetableImportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        weekId={currentWeek?._id}
        onSuccess={() => {
          if (currentWeek) fetchSchedules(currentWeek._id);
        }}
      />

      {/* WhatsApp Share Card Modal */}
      <ClassScheduleShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        className={
          shareClass || selectedClass || allClassesList[0] || "أول أول"
        }
        week={currentWeek}
        schedules={schedules}
        settings={settings}
        allClasses={allClassesList}
        onSwitchClass={(cls) => setShareClass(cls)}
      />

      {/* Teacher Weekly Plan Modal for Admin */}
      <TeacherWeeklyPlanModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        teacher={teachers.find((t) => t._id === filterTeacher)}
        initialWeekId={currentWeek?._id}
        weeks={weeks}
        settings={settings}
        subjects={subjects}
        onSaveSuccess={() => {
          if (currentWeek) fetchSchedules(currentWeek._id);
        }}
      />
    </div>
  );
}
