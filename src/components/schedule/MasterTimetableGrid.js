"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService } from "@/services/schedules.service";

const COMMON_CLASSES = [
  "أول أول",
  "أول ثاني",
  "أول ثالث",
  "ثاني أول",
  "ثاني ثاني",
  "ثاني ثالث",
  "ثالث أول",
  "ثالث ثاني",
  "ثالث ثالث",
];

export default function MasterTimetableGrid({
  week,
  schedules = [],
  teachers = [],
  subjects = [],
  settings,
  onScheduleUpdated,
  onOpenTimingsModal,
}) {
  const toast = useToast();
  const [selectedDay, setSelectedDay] = useState("الأحد");
  const [viewMode, setViewMode] = useState("teachers"); // 'teachers' | 'classes'
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileLayout, setMobileLayout] = useState("cards"); // 'cards' | 'table'

  // Edit/Assign Cell Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDay, setActiveDay] = useState("");
  const [activePeriod, setActivePeriod] = useState(1);
  const [activeTeacher, setActiveTeacher] = useState(null);
  const [activeClass, setActiveClass] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [customClassName, setCustomClassName] = useState("");
  const [roomName, setRoomName] = useState("");
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

  // Dynamic Period Timings Formatter
  const getPeriodTime = (pNum) => {
    if (settings?.periodTimings && settings.periodTimings.length > 0) {
      const found = settings.periodTimings.find((t) => t.period === pNum);
      if (found && (found.startTime || found.endTime)) {
        return found.startTime + " - " + found.endTime;
      }
    }
    const defaultMap = {
      1: "6:30 - 7:25",
      2: "7:25 - 8:20",
      3: "8:20 - 9:15",
      4: "9:35 - 10:30",
      5: "10:30 - 11:25",
      6: "11:25 - 12:20",
      7: "12:20 - 1:15",
      8: "1:15 - 2:10",
    };
    return defaultMap[pNum] || "";
  };

  const breakAfterPeriod = settings?.breakTime?.afterPeriod || 3;
  const breakTimeString = settings?.breakTime
    ? (settings.breakTime.startTime || "9:15") +
      " - " +
      (settings.breakTime.endTime || "9:35")
    : "9:15 - 9:35";

  // Build 3D Schedule Matrix: [day][teacherId][period] -> schedule
  const teacherMatrix = {};
  daysList.forEach((d) => {
    teacherMatrix[d] = {};
    teachers.forEach((t) => {
      teacherMatrix[d][t._id] = {};
      periodsList.forEach((p) => {
        teacherMatrix[d][t._id][p] = null;
      });
    });
  });

  // Extract all existing class names from schedules + common classes
  const allClassesSet = new Set(COMMON_CLASSES);
  schedules.forEach((s) => {
    if (s.className && s.className.trim()) {
      allClassesSet.add(s.className.trim());
    }
    if (
      s.day &&
      s.period &&
      s.teacher?._id &&
      teacherMatrix[s.day] &&
      teacherMatrix[s.day][s.teacher._id]
    ) {
      teacherMatrix[s.day][s.teacher._id][s.period] = s;
    }
  });

  const allClassesList = Array.from(allClassesSet);

  // Build Class Matrix: [day][className][period] -> schedule
  const classMatrix = {};
  daysList.forEach((d) => {
    classMatrix[d] = {};
    allClassesList.forEach((c) => {
      classMatrix[d][c] = {};
      periodsList.forEach((p) => {
        classMatrix[d][c][p] = null;
      });
    });
  });

  schedules.forEach((s) => {
    if (
      s.day &&
      s.period &&
      s.className &&
      classMatrix[s.day] &&
      classMatrix[s.day][s.className.trim()]
    ) {
      classMatrix[s.day][s.className.trim()][s.period] = s;
    }
  });

  // Open Cell Edit Modal for Teacher View
  const handleTeacherCellClick = (t, period, cell) => {
    setActiveDay(selectedDay);
    setActivePeriod(period);
    setActiveTeacher(t);
    setSelectedTeacherId(t._id);

    if (cell) {
      setCustomClassName(cell.className || "");
      setSelectedSubjectId(cell.subject?._id || cell.subject || "");
      setRoomName(cell.room || "");
    } else {
      setCustomClassName("");
      const defaultSubj =
        t.subjects && t.subjects.length > 0
          ? t.subjects[0]._id || t.subjects[0]
          : subjects[0]?._id || "";
      setSelectedSubjectId(defaultSubj);
      setRoomName("");
    }

    setModalOpen(true);
  };

  // Open Cell Edit Modal for Class View
  const handleClassCellClick = (className, period, cell) => {
    setActiveDay(selectedDay);
    setActivePeriod(period);
    setActiveClass(className);
    setCustomClassName(className);

    if (cell) {
      setSelectedTeacherId(cell.teacher?._id || cell.teacher || "");
      setSelectedSubjectId(cell.subject?._id || cell.subject || "");
      setRoomName(cell.room || "");
      const foundTeacher = teachers.find(
        (t) => t._id === (cell.teacher?._id || cell.teacher),
      );
      setActiveTeacher(foundTeacher || null);
    } else {
      setSelectedTeacherId(teachers[0]?._id || "");
      setSelectedSubjectId(subjects[0]?._id || "");
      setRoomName("");
      setActiveTeacher(teachers[0] || null);
    }

    setModalOpen(true);
  };

  // Save Master Cell
  const handleSaveCell = async () => {
    if (!selectedTeacherId) {
      toast.error("يرجى اختيار المعلم");
      return;
    }
    if (!selectedSubjectId) {
      toast.error("يرجى اختيار المادة الدراسية");
      return;
    }

    setSaving(true);
    try {
      const res = await schedulesService.saveMasterCell({
        weekId: week._id,
        day: activeDay,
        period: activePeriod,
        teacherId: selectedTeacherId,
        subjectId: selectedSubjectId,
        className: customClassName.trim(),
        room: roomName.trim(),
      });

      toast.success("تم تثبيت الحصة بنجاح وحفظها تلقائياً ✅");
      if (onScheduleUpdated) {
        onScheduleUpdated(res.data);
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل حفظ الحصة");
    } finally {
      setSaving(false);
    }
  };

  // Clear Cell
  const handleClearCell = async () => {
    if (!selectedTeacherId) return;

    setSaving(true);
    try {
      await schedulesService.saveMasterCell({
        weekId: week._id,
        day: activeDay,
        period: activePeriod,
        teacherId: selectedTeacherId,
        subjectId: null, // triggers delete/clear
      });

      toast.info("تم تفريغ الحصة بنجاح 🗑️");
      if (onScheduleUpdated) {
        onScheduleUpdated({
          day: activeDay,
          period: activePeriod,
          teacherId: selectedTeacherId,
          cleared: true,
        });
      }
      setModalOpen(false);
    } catch (err) {
      toast.error("فشل تفريغ الحصة");
    } finally {
      setSaving(false);
    }
  };

  // Filter teachers by search query
  const filteredTeachers = teachers.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = t.name?.toLowerCase().includes(q);
    const matchSubject = t.subjects?.some((s) =>
      s.name?.toLowerCase().includes(q),
    );
    return matchName || matchSubject;
  });

  // Filter classes by search query
  const filteredClasses = allClassesList.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Control Bar: Day Switcher, View Switcher & Settings */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        {/* Days Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          {daysList.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={
                "px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer " +
                (selectedDay === d
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-700 hover:text-gray-900 hover:bg-white/50")
              }
            >
              📅 {d}
            </button>
          ))}
        </div>

        {/* Right Tools: View Mode Toggle & Timing Settings Button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3">
          {/* Mobile Layout Switcher */}
          <div className="flex md:hidden items-center bg-gray-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMobileLayout("cards")}
              className={
                "px-2.5 py-1 rounded-lg font-bold transition-all " +
                (mobileLayout === "cards"
                  ? "bg-white text-blue-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900")
              }
            >
              📱 بطاقات
            </button>
            <button
              type="button"
              onClick={() => setMobileLayout("table")}
              className={
                "px-2.5 py-1 rounded-lg font-bold transition-all " +
                (mobileLayout === "table"
                  ? "bg-white text-blue-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900")
              }
            >
              📊 جدول
            </button>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("teachers")}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer " +
                (viewMode === "teachers"
                  ? "bg-white text-slate-900 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-900")
              }
            >
              👨‍🏫 عرض حسب المعلمين
            </button>
            <button
              onClick={() => setViewMode("classes")}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer " +
                (viewMode === "classes"
                  ? "bg-white text-slate-900 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-900")
              }
            >
              🏫 عرض حسب الفصول
            </button>
          </div>

          <button
            onClick={onOpenTimingsModal}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            title="تعديل وضبط أوقات الحصص والفسحة"
          >
            <span>⚙️</span>
            <span>تعديل وقت الحصص</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white px-3.5 sm:px-4 py-3 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
          <span>
            {viewMode === "teachers"
              ? "📋 جدول توزيع حصص المعلمين ليوم " + selectedDay
              : "📋 جدول توزيع الفصول والصفوف ليوم " + selectedDay}
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-blue-600">
            انقر على أي حصة لتعيين أو تغيير الفصل والمادة مباشرة
          </span>
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              viewMode === "teachers"
                ? "بحث باسم المعلم أو المادة..."
                : "بحث باسم الفصل..."
            }
            className="w-full pr-8 pl-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE CARDS MATRIX VIEW (Active on mobile when mobileLayout === 'cards') */}
      {/* ========================================================================= */}
      <div
        className={
          mobileLayout === "cards" ? "block md:hidden space-y-3" : "hidden"
        }
      >
        {viewMode === "teachers" ? (
          /* Teachers Cards List */
          filteredTeachers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-200">
              لا يوجد معلمون يطابقون البحث
            </div>
          ) : (
            filteredTeachers.map((t) => {
              const assignedCount = periodsList.filter(
                (p) => !!teacherMatrix[selectedDay]?.[t._id]?.[p],
              ).length;

              return (
                <div
                  key={t._id}
                  className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-2.5"
                >
                  {/* Teacher Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 leading-tight">
                        {t.name}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.subjects?.map((s) => (
                          <span
                            key={s._id || s}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: s.color || "#2563eb" }}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-100">
                      {assignedCount} / {periodsCount} حصص
                    </span>
                  </div>

                  {/* Periods Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {periodsList.map((p) => {
                      const cell = teacherMatrix[selectedDay]?.[t._id]?.[p];
                      const hasClass = !!cell?.className || !!cell?.subject;

                      return (
                        <div
                          key={p}
                          onClick={() => handleTeacherCellClick(t, p, cell)}
                          className={
                            "p-2 rounded-xl border text-right cursor-pointer transition-all active:scale-[0.98] " +
                            (hasClass
                              ? "bg-blue-50/60 border-blue-200 hover:border-blue-400"
                              : "bg-gray-50 border-dashed border-gray-300 hover:bg-gray-100")
                          }
                        >
                          <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold mb-1">
                            <span>الحصة {p}</span>
                            <span className="font-mono text-[9px] text-gray-400">
                              {getPeriodTime(p).split("-")[0]}
                            </span>
                          </div>

                          {hasClass ? (
                            <div>
                              <p className="font-black text-xs text-blue-900">
                                🏫 {cell.className}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                                <span>{cell.subject?.name}</span>
                                {cell.room && <span>({cell.room})</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-400 font-semibold py-1">
                              + فراغ (انقر للتعيين)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )
        ) : /* Classes Cards List */
        filteredClasses.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-200">
            لا توجد فصول تطابق البحث
          </div>
        ) : (
          filteredClasses.map((className) => {
            const assignedCount = periodsList.filter(
              (p) => !!classMatrix[selectedDay]?.[className]?.[p],
            ).length;

            return (
              <div
                key={className}
                className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-2.5"
              >
                {/* Class Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <span>🏫</span>
                    <span>{className}</span>
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                    {assignedCount} / {periodsCount} حصص
                  </span>
                </div>

                {/* Periods Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {periodsList.map((p) => {
                    const cell = classMatrix[selectedDay]?.[className]?.[p];
                    const hasTeacher = !!cell?.teacher;

                    return (
                      <div
                        key={p}
                        onClick={() => handleClassCellClick(className, p, cell)}
                        className={
                          "p-2 rounded-xl border text-right cursor-pointer transition-all active:scale-[0.98] " +
                          (hasTeacher
                            ? "bg-emerald-50/60 border-emerald-200 hover:border-emerald-400"
                            : "bg-gray-50 border-dashed border-gray-300 hover:bg-gray-100")
                        }
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold mb-1">
                          <span>الحصة {p}</span>
                          <span className="font-mono text-[9px] text-gray-400">
                            {getPeriodTime(p).split("-")[0]}
                          </span>
                        </div>

                        {hasTeacher ? (
                          <div>
                            <p className="font-black text-xs text-emerald-950">
                              👨‍🏫 {cell.teacher?.name}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                              <span>{cell.subject?.name}</span>
                              {cell.room && <span>({cell.room})</span>}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-400 font-semibold py-1">
                            + فراغ (انقر للتعيين)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP / FULL TABLE VIEW (Master Grid)                                   */}
      {/* ========================================================================= */}
      <div className={mobileLayout === "table" ? "block" : "hidden md:block"}>
        {/* Swipe indicator banner on mobile */}
        <div className="md:hidden flex items-center justify-between text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg mb-2.5 no-print">
          <span>👈 اسحب الجدول يميناً ويساراً لاستعراض جميع الحصص</span>
          <span className="font-bold">👉</span>
        </div>

        <div
          id="master-timetable-export-container"
          className="bg-white p-3.5 sm:p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-300 w-full max-w-full overflow-hidden"
        >
          <div className="overflow-x-auto w-full schedule-table-wrap">
            <table className="w-full border-collapse border-2 border-gray-700 text-center min-w-[1000px]">
              <thead>
                {/* Period Header */}
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="border-2 border-gray-700 p-3 w-48 text-right font-black">
                    {viewMode === "teachers"
                      ? "المعلم / المادة"
                      : "الصف / الفصل"}
                  </th>

                  {/* Periods before break */}
                  {periodsList.slice(0, breakAfterPeriod).map((p) => (
                    <th
                      key={p}
                      className="border-2 border-gray-700 p-2 text-center"
                    >
                      <div className="text-sm font-black text-white">
                        الحصة {p}
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                        {getPeriodTime(p)}
                      </div>
                    </th>
                  ))}

                  {/* Break Column */}
                  <th className="border-2 border-gray-700 p-2 w-20 bg-amber-600 text-white text-center">
                    <div className="text-xs font-black">الفسحة</div>
                    <div className="text-[10px] text-amber-100 font-mono mt-0.5">
                      {breakTimeString}
                    </div>
                  </th>

                  {/* Periods after break */}
                  {periodsList.slice(breakAfterPeriod).map((p) => (
                    <th
                      key={p}
                      className="border-2 border-gray-700 p-2 text-center"
                    >
                      <div className="text-sm font-black text-white">
                        الحصة {p}
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                        {getPeriodTime(p)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y-2 divide-gray-700 text-xs">
                {viewMode === "teachers"
                  ? /* ======================================================== */
                    /* VIEW 1: All Teachers Rows                                 */
                    /* ======================================================== */
                    filteredTeachers.map((t, idx) => {
                      const rowBg =
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                      return (
                        <tr
                          key={t._id}
                          className={
                            rowBg +
                            " hover:bg-blue-50/30 transition-colors h-16"
                          }
                        >
                          {/* Teacher Info */}
                          <td className="border-2 border-gray-700 p-2.5 text-right align-middle bg-slate-100/70 font-bold">
                            <p className="font-black text-slate-900 text-sm leading-tight">
                              {t.name}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {t.subjects?.map((s) => (
                                <span
                                  key={s._id || s}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                                  style={{
                                    backgroundColor: s.color || "#2563eb",
                                  }}
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Periods before break */}
                          {periodsList.slice(0, breakAfterPeriod).map((p) => {
                            const cell =
                              teacherMatrix[selectedDay]?.[t._id]?.[p];
                            const hasClass =
                              !!cell?.className || !!cell?.subject;

                            return (
                              <td
                                key={p}
                                onClick={() =>
                                  handleTeacherCellClick(t, p, cell)
                                }
                                className={
                                  "border-2 border-gray-700 p-1.5 align-middle relative cursor-pointer transition-all hover:bg-blue-100/60 " +
                                  (hasClass
                                    ? "bg-white font-bold"
                                    : "bg-gray-50/20")
                                }
                              >
                                {hasClass ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-block bg-blue-700 text-white font-black px-2 py-0.5 rounded text-xs shadow-2xs">
                                      {cell.className || "حصة"}
                                    </span>
                                    {cell.subject?.name && (
                                      <p className="text-[10px] text-blue-900 font-semibold truncate">
                                        {cell.subject.name}
                                      </p>
                                    )}
                                    {cell.room && (
                                      <span className="text-[9px] text-gray-400 block font-normal">
                                        ({cell.room})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-xs hover:text-blue-600 font-black">
                                    +
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Break Cell */}
                          <td className="border-2 border-gray-700 bg-amber-50/40 text-center text-amber-800/40 text-[10px] font-bold select-none">
                            استراحة
                          </td>

                          {/* Periods after break */}
                          {periodsList.slice(breakAfterPeriod).map((p) => {
                            const cell =
                              teacherMatrix[selectedDay]?.[t._id]?.[p];
                            const hasClass =
                              !!cell?.className || !!cell?.subject;

                            return (
                              <td
                                key={p}
                                onClick={() =>
                                  handleTeacherCellClick(t, p, cell)
                                }
                                className={
                                  "border-2 border-gray-700 p-1.5 align-middle relative cursor-pointer transition-all hover:bg-blue-100/60 " +
                                  (hasClass
                                    ? "bg-white font-bold"
                                    : "bg-gray-50/20")
                                }
                              >
                                {hasClass ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-block bg-blue-700 text-white font-black px-2 py-0.5 rounded text-xs shadow-2xs">
                                      {cell.className || "حصة"}
                                    </span>
                                    {cell.subject?.name && (
                                      <p className="text-[10px] text-blue-900 font-semibold truncate">
                                        {cell.subject.name}
                                      </p>
                                    )}
                                    {cell.room && (
                                      <span className="text-[9px] text-gray-400 block font-normal">
                                        ({cell.room})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-xs hover:text-blue-600 font-black">
                                    +
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  : /* ======================================================== */
                    /* VIEW 2: All Classes Rows                                  */
                    /* ======================================================== */
                    filteredClasses.map((className, idx) => {
                      const rowBg =
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                      return (
                        <tr
                          key={className}
                          className={
                            rowBg +
                            " hover:bg-blue-50/30 transition-colors h-16"
                          }
                        >
                          {/* Class Info */}
                          <td className="border-2 border-gray-700 p-2.5 text-center align-middle bg-slate-100/70 font-black text-sm text-slate-900">
                            {className}
                          </td>

                          {/* Periods before break */}
                          {periodsList.slice(0, breakAfterPeriod).map((p) => {
                            const cell =
                              classMatrix[selectedDay]?.[className]?.[p];
                            const hasSchedule =
                              !!cell?.teacher || !!cell?.subject;

                            return (
                              <td
                                key={p}
                                onClick={() =>
                                  handleClassCellClick(className, p, cell)
                                }
                                className={
                                  "border-2 border-gray-700 p-1.5 align-middle relative cursor-pointer transition-all hover:bg-blue-100/60 " +
                                  (hasSchedule
                                    ? "bg-white font-bold"
                                    : "bg-gray-50/20")
                                }
                              >
                                {hasSchedule ? (
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-black text-slate-900 leading-tight">
                                      {cell.teacher?.name || "معلم"}
                                    </p>
                                    {cell.subject?.name && (
                                      <span
                                        className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold text-white shadow-2xs"
                                        style={{
                                          backgroundColor:
                                            cell.subject?.color || "#2563eb",
                                        }}
                                      >
                                        {cell.subject.name}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-xs hover:text-blue-600 font-black">
                                    +
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Break Cell */}
                          <td className="border-2 border-gray-700 bg-amber-50/40 text-center text-amber-800/40 text-[10px] font-bold select-none">
                            استراحة
                          </td>

                          {/* Periods after break */}
                          {periodsList.slice(breakAfterPeriod).map((p) => {
                            const cell =
                              classMatrix[selectedDay]?.[className]?.[p];
                            const hasSchedule =
                              !!cell?.teacher || !!cell?.subject;

                            return (
                              <td
                                key={p}
                                onClick={() =>
                                  handleClassCellClick(className, p, cell)
                                }
                                className={
                                  "border-2 border-gray-700 p-1.5 align-middle relative cursor-pointer transition-all hover:bg-blue-100/60 " +
                                  (hasSchedule
                                    ? "bg-white font-bold"
                                    : "bg-gray-50/20")
                                }
                              >
                                {hasSchedule ? (
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-black text-slate-900 leading-tight">
                                      {cell.teacher?.name || "معلم"}
                                    </p>
                                    {cell.subject?.name && (
                                      <span
                                        className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold text-white shadow-2xs"
                                        style={{
                                          backgroundColor:
                                            cell.subject?.color || "#2563eb",
                                        }}
                                      >
                                        {cell.subject.name}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-xs hover:text-blue-600 font-black">
                                    +
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Cell Assignment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          "تعيين الحصة (" +
          activePeriod +
          ") - يوم " +
          activeDay +
          (activeTeacher ? " (المعلم: " + activeTeacher.name + ")" : "")
        }
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleClearCell}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              🗑️ تفريغ الحصة
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCell}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                {saving ? "جاري التثبيت..." : "تأكيد وتثبيت الحصة ✅"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Teacher Picker (if in classes view or changing teacher) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              المعلم المسند <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                const tId = e.target.value;
                setSelectedTeacherId(tId);
                const found = teachers.find((t) => t._id === tId);
                setActiveTeacher(found || null);
                if (found && found.subjects && found.subjects.length > 0) {
                  setSelectedSubjectId(
                    found.subjects[0]._id || found.subjects[0],
                  );
                }
              }}
              className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- اختر المعلم --</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  👨‍🏫 {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              المادة الدراسية <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- اختر المادة --</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  📖 {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Class Name Quick Selector or Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              اسم الفصل / الصف <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customClassName}
              onChange={(e) => setCustomClassName(e.target.value)}
              placeholder="مثال: ثاني ثاني / أول أول"
              className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1">
              {COMMON_CLASSES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCustomClassName(c)}
                  className={
                    "px-2 py-0.5 text-[11px] rounded-lg border font-bold transition-all " +
                    (customClassName === c
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Room Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              القاعة / المعمل (اختياري)
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="مثال: معمل الحاسب 1"
              className="w-full px-3.5 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
