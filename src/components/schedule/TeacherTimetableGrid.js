"use client";

import React, { useState } from "react";

const PERIOD_TIMES = {
  1: "6:30 - 7:25",
  2: "7:25 - 8:20",
  3: "8:20 - 9:15",
  4: "9:35 - 10:30",
  5: "10:30 - 11:25",
  6: "11:25 - 12:20",
  7: "12:20 - 1:15",
  8: "1:15 - 2:10",
};

export default function TeacherTimetableGrid({
  teacher,
  week,
  schedules = [],
  settings,
  onCellClick,
  editable = false,
  containerId = "teacher-paper-timetable-container",
}) {
  const daysList = settings?.workDays || [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
  ];
  const periodsCount = settings?.periodsCount || 6;
  const periodsList = Array.from({ length: periodsCount }, (_, i) => i + 1);

  // Mobile View States
  const [mobileView, setMobileView] = useState("table"); // "table" | "cards"
  const [tableScale, setTableScale] = useState(85); // 70 | 85 | 100 // 'cards' | 'table'
  const [selectedMobileDay, setSelectedMobileDay] = useState(daysList[0] || "الأحد");

  // Dynamic Period Timings Formatter
  const getPeriodTime = (pNum) => {
    if (settings?.periodTimings && settings.periodTimings.length > 0) {
      const found = settings.periodTimings.find((t) => t.period === pNum);
      if (found && (found.startTime || found.endTime)) {
        return found.startTime + " - " + found.endTime;
      }
    }
    return PERIOD_TIMES[pNum] || "";
  };

  const breakAfterPeriod = settings?.breakTime?.afterPeriod || 3;
  const breakTimeString = settings?.breakTime
    ? (settings.breakTime.startTime || "9:15") +
      " - " +
      (settings.breakTime.endTime || "9:35")
    : "9:15 - 9:35";

  // Group schedules by day & period
  const matrix = {};
  daysList.forEach((day) => {
    matrix[day] = {};
    periodsList.forEach((p) => {
      matrix[day][p] = null;
    });
  });

  schedules.forEach((s) => {
    if (matrix[s.day] && matrix[s.day][s.period] !== undefined) {
      matrix[s.day][s.period] = s;
    }
  });

  const teacherSubjectName =
    teacher?.subjects && teacher?.subjects.length > 0
      ? teacher.subjects.map((s) => s.name || s).join(" / ")
      : "المادة";

  // Calculate stats for current mobile day
  const currentDayClassesCount = periodsList.filter(
    (p) => !!matrix[selectedMobileDay]?.[p]
  ).length;

  return (
    <div
      id={containerId}
      className="bg-white p-3.5 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-300 font-sans text-slate-900 w-full max-w-full overflow-hidden"
    >
      {/* 1) Top Header — Authentic aSc Timetables Style */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-gray-300 gap-3 text-xs text-gray-500 font-medium">
        <div className="text-right">
          <span className="font-bold text-gray-800 text-sm block sm:inline">
            {settings?.schoolName || "مدارس التعليم النموذجي"}
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {week?.academicYear || "1447-1448هـ / 2026-2027م"}
          </p>
        </div>

        {/* Teacher Name & Subject (Handwritten / Prominent Header in center) */}
        <div className="text-right sm:text-center w-full sm:w-auto">
          <div className="flex flex-wrap items-center justify-start sm:justify-center gap-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
              {teacher?.name || "اسم المعلم"}
            </h2>
            <span className="text-xs sm:text-sm font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
              {teacherSubjectName}
            </span>
          </div>
          <p className="text-xs text-gray-600 font-semibold mt-0.5">
            جدول الحصص الأسبوعي — {week?.label || "الأسبوع الدراسي"}
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
          {/* Mobile View Toggle Buttons (Hidden on desktop) */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            {/* Table Scale Zoom Controller */}
            {mobileView === "table" && (
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs border border-gray-200">
                <span className="text-[10px] font-black text-gray-500 px-1">🔍 المقياس:</span>
                {[70, 85, 100].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setTableScale(sc)}
                    className={
                      "px-2 py-0.5 rounded-lg font-bold transition-all text-xs cursor-pointer " +
                      (tableScale === sc
                        ? "bg-blue-600 text-white shadow-xs font-black"
                        : "text-gray-600 hover:text-gray-900")
                    }
                  >
                    {sc}%
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs border border-gray-200">
              <button
                type="button"
                onClick={() => setMobileView("table")}
                className={
                  "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer " +
                  (mobileView === "table"
                    ? "bg-white text-blue-900 shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900")
                }
              >
                <span>📊</span>
                <span>عرض كجدول</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileView("cards")}
                className={
                  "px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer " +
                  (mobileView === "cards"
                    ? "bg-white text-blue-900 shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900")
                }
              >
                <span>📱</span>
                <span>عرض كبطاقات</span>
              </button>
            </div>
          </div>

          <div
            className="text-left text-[11px] text-gray-400 font-mono hidden sm:block"
            dir="ltr"
          >
            aSc Timetables
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2) MOBILE CARDS VIEW: (Shows on mobile when mobileView === 'cards')       */}
      {/* ========================================================================= */}
      <div className={mobileView === "cards" ? "block space-y-4" : "hidden"}>
        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {daysList.map((day) => {
            const isSel = day === selectedMobileDay;
            const countForDay = periodsList.filter((p) => !!matrix[day]?.[p]).length;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedMobileDay(day)}
                className={
                  "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 " +
                  (isSel
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                }
              >
                <span>{day}</span>
                <span
                  className={
                    "text-[10px] px-1.5 py-0.2 rounded-full " +
                    (isSel ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600")
                  }
                >
                  {countForDay}
                </span>
              </button>
            );
          })}
        </div>

        {/* Day Status Header */}
        <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 px-3.5 py-2 rounded-xl text-xs">
          <span className="font-bold text-blue-900">
            📅 حصص يوم {selectedMobileDay}
          </span>
          <span className="font-semibold text-blue-700 text-[11px]">
            {currentDayClassesCount > 0
              ? currentDayClassesCount + " حصص مسندة"
              : "لا توجد حصص مسندة اليوم"}
          </span>
        </div>

        {/* Vertical Period Cards */}
        <div className="space-y-2.5">
          {periodsList.map((p) => {
            const cell = matrix[selectedMobileDay]?.[p];
            const hasClass = !!cell?.className || !!cell?.subject;

            return (
              <React.Fragment key={p}>
                {/* Break Card (if configured) */}
                {p === breakAfterPeriod + 1 && (
                  <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">☕</span>
                      <div>
                        <span className="font-bold">استراحة الفسحة المدرسية</span>
                        <span className="text-[10px] text-amber-700 block font-mono">
                          {breakTimeString}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      استراحة
                    </span>
                  </div>
                )}

                {/* Period Slot Card */}
                <div
                  onClick={() =>
                    editable && onCellClick && onCellClick(selectedMobileDay, p, cell)
                    editable && onCellClick && onCellClick(cell, selectedMobileDay, p)
                  }
                  className={
                    "border rounded-xl p-3 transition-all relative " +
                    (editable ? "cursor-pointer active:scale-[0.99] " : "") +
                    (hasClass
                      ? "bg-white border-blue-300 shadow-xs hover:border-blue-500"
                      : "bg-gray-50/60 border-dashed border-gray-300 hover:bg-gray-100/70")
                  }
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-xs">
                        {p}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">
                        {getPeriodTime(p)}
                      </span>
                    </div>

                    {hasClass ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {cell.subject?.name || teacherSubjectName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-semibold">
                        حصة فراغ
                        غير مسندة
                      </span>
                    )}
                  </div>

                  {hasClass ? (
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-gray-900">
                          🏫 {cell.className || "حصة"}
                        </span>
                        {cell.room && (
                          <span className="text-xs text-gray-500 font-medium">
                            (قاعة: {cell.room})
                          </span>
                        )}
                      </div>

                      {editable && (
                        <span className="text-[11px] text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg">
                          ✏️ تعديل
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-gray-400 py-1">
                      <span>لا يوجد فصل مسند في هذه الحصة</span>
                      {editable && (
                        <span className="text-blue-600 font-bold text-[11px] flex items-center gap-0.5">
                          + تعيين حصة
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3) DESKTOP & FULL TABLE VIEW (Classic aSc Timetables Matrix)               */}
      {/* ========================================================================= */}
      <div
        className={mobileView === "table" ? "block" : "hidden"}
      >
        {/* Mobile Swipe Hint Banner */}
        <div className="md:hidden flex items-center justify-between text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg mb-2.5 no-print">
          <span>👈 يمكنك سحب الجدول لليمين واليسار للتنقل بين الحصص</span>
          <span className="font-bold">👉</span>
        </div>

        <div className="overflow-x-auto w-full schedule-table-wrap">
          <table className="w-full border-collapse border-2 border-gray-700 text-center min-w-[780px] sm:min-w-[880px]">
            <thead>
              {/* Period Numbers & Time Headers */}
              <tr className="bg-gray-100 text-gray-800">
                {/* Day Column Header */}
                <th className="border-2 border-gray-700 p-2.5 w-28 text-center text-sm font-black">
                  اليوم
                </th>

                {/* First Part Periods (1, 2, 3) */}
                {periodsList.slice(0, breakAfterPeriod).map((p) => (
                  <th
                    key={p}
                    className="border-2 border-gray-700 p-2 text-center"
                  >
                    <div className="text-base font-black">{p}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {getPeriodTime(p)}
                    </div>
                  </th>
                ))}

                {/* Break Column */}
                <th className="border-2 border-gray-700 p-2 w-20 bg-amber-50/70 text-amber-950 text-center">
                  <div className="text-xs font-black">الفسحة</div>
                  <div className="text-[10px] text-amber-800/80 font-mono mt-0.5">
                    {breakTimeString}
                  </div>
                </th>

                {/* Second Part Periods (4, 5, 6, ...) */}
                {periodsList.slice(breakAfterPeriod).map((p) => (
                  <th
                    key={p}
                    className="border-2 border-gray-700 p-2 text-center"
                  >
                    <div className="text-base font-black">{p}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {getPeriodTime(p)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {daysList.map((day) => (
                <tr
                  key={day}
                  className="h-14 sm:h-16 hover:bg-slate-50/50 transition-colors text-xs"
                >
                  {/* Day Label */}
                  <td className="border-2 border-gray-700 p-2 bg-gray-50 font-black text-xs sm:text-sm text-gray-900 text-center">
                    {day}
                  </td>

                  {/* Periods 1..breakAfterPeriod */}
                  {periodsList.slice(0, breakAfterPeriod).map((period) => {
                    const cell = matrix[day]?.[period];
                    const hasClass = !!cell?.className || !!cell?.subject;

                    return (
                      <td
                        key={period}
                        onClick={() =>
                          editable &&
                          onCellClick &&
                          onCellClick(day, period, cell)
                          onCellClick(cell, day, period)
                        }
                        className={
                          "border-2 border-gray-700 p-2 align-middle relative transition-all " +
                          (editable ? "cursor-pointer hover:bg-blue-50/80 " : "") +
                          (hasClass ? "bg-white font-bold" : "bg-gray-50/30")
                        }
                      >
                        {hasClass ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className="absolute top-1 right-1.5 text-[10px] font-bold text-gray-500">
                              {cell.subject?.name || teacherSubjectName}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-gray-900 mt-0.5">
                              {cell.className || "حصة"}
                            </span>
                            {cell.room && (
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({cell.room})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs select-none">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Break Cell (Vertical separator) */}
                  <td className="border-2 border-gray-700 bg-amber-50/40 text-center text-amber-800/40 text-xs font-bold select-none">
                    استراحة
                  </td>

                  {/* Periods breakAfterPeriod+1..end */}
                  {periodsList.slice(breakAfterPeriod).map((period) => {
                    const cell = matrix[day]?.[period];
                    const hasClass = !!cell?.className || !!cell?.subject;

                    return (
                      <td
                        key={period}
                        onClick={() =>
                          editable &&
                          onCellClick &&
                          onCellClick(day, period, cell)
                          onCellClick(cell, day, period)
                        }
                        className={
                          "border-2 border-gray-700 p-2 align-middle relative transition-all " +
                          (editable ? "cursor-pointer hover:bg-blue-50/80 " : "") +
                          (hasClass ? "bg-white font-bold" : "bg-gray-50/30")
                        }
                      >
                        {hasClass ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className="absolute top-1 right-1.5 text-[10px] font-bold text-gray-500">
                              {cell.subject?.name || teacherSubjectName}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-gray-900 mt-0.5">
                              {cell.className || "حصة"}
                            </span>
                            {cell.room && (
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({cell.room})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs select-none">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4) Bottom Footer (Generated Date & Signatures) */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-4 border-t border-gray-300 text-xs text-gray-600 font-semibold gap-3 text-center sm:text-right">
        <div>
          <span className="text-gray-400 font-mono">aSc Timetables</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <p>
            توقيع المعلم:{" "}
            <span className="font-bold text-gray-900">{teacher?.name}</span>
          </p>
          <p>
            اعتماد مدير المدرسة:{" "}
            <span className="font-bold text-gray-900">
              {settings?.principalName || "مدير المدرسة"}
            </span>
          </p>
        </div>
        <div>
          <span>
            تم الإنشاء:{" "}
            {new Date().toLocaleDateString("ar-SA", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
