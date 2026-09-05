"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/constants";
import { getLogoUrl } from "@/lib/utils";

export default function WeeklyScheduleTable({
  week,
  schedules = [],
  settings,
  subjects = [],
  selectedClass = "",
  onSelectClass,
  onEditCell,
  readOnly = false,
  teacherHighlight = null,
}) {
  const { user, hasPermission, isAdmin } = useAuth();
  const [mobileLayout, setMobileLayout] = useState("cards"); // "cards" | "table"
  const [selectedMobileDay, setSelectedMobileDay] = useState("الأحد");

  const isSuperAdmin = isAdmin();
  const canEditAny = isSuperAdmin || hasPermission(PERMISSIONS.SCHEDULES_EDIT);
  const canEditGranular =
    hasPermission(PERMISSIONS.SCHEDULES_EDIT_TITLE) ||
    hasPermission(PERMISSIONS.SCHEDULES_EDIT_HOMEWORK) ||
    hasPermission(PERMISSIONS.SCHEDULES_EDIT_ACTIVITIES) ||
    hasPermission(PERMISSIONS.SCHEDULES_EDIT_NOTES);

  const daysList = settings?.workDays || [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
  ];
  const periodsCount = settings?.periodsCount || 6;
  const periodsList = Array.from({ length: periodsCount }, (_, i) => i + 1);

  // Filter schedules if a specific class is selected
  const activeSchedules = useMemo(() => {
    if (!selectedClass) return schedules;
    return schedules.filter(
      (s) => (s.className || "").trim() === selectedClass.trim(),
    );
  }, [schedules, selectedClass]);

  // Group schedules by day and period
  const scheduleMatrix = useMemo(() => {
    const matrix = {};
    daysList.forEach((day) => {
      matrix[day] = {};
      periodsList.forEach((p) => {
        matrix[day][p] = [];
      });
    });

    activeSchedules.forEach((item) => {
      if (matrix[item.day] && matrix[item.day][item.period] !== undefined) {
        matrix[item.day][item.period].push(item);
      }
    });

    return matrix;
  }, [activeSchedules, daysList, periodsList]);

  // Distinct classes summary for "All Classes" view
  const classesSummary = useMemo(() => {
    const classMap = {};
    schedules.forEach((s) => {
      const cName = (s.className || "").trim();
      if (!cName) return;
      if (!classMap[cName]) {
        classMap[cName] = {
          name: cName,
          count: 0,
          withLesson: 0,
          withHomework: 0,
        };
      }
      classMap[cName].count += 1;
      if (s.lessonTitle && s.lessonTitle.trim())
        classMap[cName].withLesson += 1;
      if (s.homework && s.homework.trim()) classMap[cName].withHomework += 1;
    });
    return Object.values(classMap);
  }, [schedules]);

  // Calculate day dates relative to week start date
  const getDayDateFormatted = (dayName) => {
    if (!week?.startDate) return "";
    const dayNames = [
      "الأحد",
      "الإثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    const start = new Date(week.startDate);
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
      year: "numeric",
    });
  };

  // Check if current user can edit this specific cell
  const checkCanEditCell = (cellData) => {
    if (readOnly) return false;
    if (canEditAny) return true;

    // If teacher: check if subject belongs to teacher
    if (canEditGranular && cellData && cellData.subject) {
      const cellSubjectId = cellData.subject._id
        ? cellData.subject._id.toString()
        : cellData.subject.toString();
      const userSubjectIds = (user?.subjects || []).map((s) =>
        s._id ? s._id.toString() : s.toString(),
      );
      return userSubjectIds.includes(cellSubjectId);
    }

    return false;
  };

  const isTeacherSubject = (cellData) => {
    if (!cellData || !cellData.subject || !user) return false;
    const cellSubjectId = cellData.subject._id
      ? cellData.subject._id.toString()
      : cellData.subject.toString();
    const userSubjectIds = (user.subjects || []).map((s) =>
      s._id ? s._id.toString() : s.toString(),
    );
    return userSubjectIds.includes(cellSubjectId);
  };

  return (
    <div
      id="weekly-schedule-print-container"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-3.5 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full"
    >
      {/* 1) School Header & Visual Branding */}
      <div className="border-b-2 border-slate-800 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center md:text-right">
          {/* Ministry / Department info */}
          <div className="text-xs text-slate-600 space-y-1 font-medium leading-relaxed">
            <p className="font-bold text-slate-800 text-sm">
              المملكة العربية السعودية
            </p>
            <p>وزارة التعليم</p>
            <p>{settings?.ministryHeader || "الإدارة العامة للتعليم"}</p>
          </div>

          {/* School Name & Title */}
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {settings?.schoolName || "مدرسة المستقبل النموذجية"}
            </h2>
            <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-slate-900 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">
              <span>الخطة والجدول الدراسي الأسبوعي</span>
              {selectedClass ? (
                <>
                  <span className="text-blue-300">•</span>
                  <span className="bg-amber-400 text-slate-950 px-3 py-0.5 rounded-full text-xs font-black shadow-xs">
                    فصل: {selectedClass}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-blue-300">•</span>
                  <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    جميع الفصول
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {settings?.academicYear || "1447-1448هـ"} —{" "}
              {settings?.term || "الفصل الدراسي الأول"}
            </p>
          </div>

          {/* Logo & Week Info */}
          <div className="flex flex-col items-center md:items-end justify-center gap-2">
            {settings?.logo ? (
              <img
                src={getLogoUrl(settings.logo)}
                alt="School Logo"
                className="h-14 w-auto object-contain"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-lg shadow-sm">
                🏫
              </div>
            )}
            <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              {week?.label || "الأسبوع الدراسي"}
            </div>
          </div>
        </div>
      </div>

      {/* 2) Summary Banner when "All Classes" is selected */}
      {!selectedClass && classesSummary.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 no-print">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>📊</span>
              <span>
                فصول المدرسة المسجلة لهذا الأسبوع (انقر على الفصل لعرض خطته
                المستقلة):
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">
              إجمالي الفصول: {classesSummary.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {classesSummary.map((cls) => (
              <button
                key={cls.name}
                type="button"
                onClick={() => onSelectClass && onSelectClass(cls.name)}
                className="p-2.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl text-right hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600">
                    {cls.name}
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                    {cls.count} حصة
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  تحضير:{" "}
                  <span className="text-emerald-700 font-bold">
                    {cls.withLesson}
                  </span>{" "}
                  / {cls.count}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE CARDS VIEW: Weekly Plan (No Horizontal Overflow)                   */}
      {/* ========================================================================= */}
      <div
        className={
          mobileLayout === "cards" ? "block md:hidden space-y-3.5" : "hidden"
        }
      >
        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {daysList.map((day) => {
            const isSel = (selectedMobileDay || daysList[0]) === day;
            const entriesCount = periodsList.reduce(
              (acc, p) => acc + (scheduleMatrix[day]?.[p]?.length || 0),
              0,
            );
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
                    (isSel
                      ? "bg-white/25 text-white"
                      : "bg-gray-200 text-gray-600")
                  }
                >
                  {entriesCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Day Banner */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700">
          <span>
            📅 خطة حصص يوم {selectedMobileDay || daysList[0]} (
            {getDayDateFormatted(selectedMobileDay || daysList[0])})
          </span>
        </div>

        {/* Period Cards */}
        <div className="space-y-3">
          {periodsList.map((period) => {
            const currentDay = selectedMobileDay || daysList[0];
            const cellEntries = scheduleMatrix[currentDay]?.[period] || [];
            const cell = cellEntries[0] || null;
            const canEdit = checkCanEditCell(cell);
            const isMySubject = isTeacherSubject(cell);
            const hasLesson =
              cell && cell.lessonTitle && cell.lessonTitle.trim();
            const hasHomework = cell && cell.homework && cell.homework.trim();

            if (!cell) {
              return (
                <div
                  key={period}
                  className="p-3 bg-gray-50/70 border border-dashed border-gray-200 rounded-xl flex items-center justify-between text-xs text-gray-400"
                >
                  <span className="font-bold">الحصة {period}</span>
                  <span>لا يوجد حصة مجدولة لهذا الفصل</span>
                </div>
              );
            }

            return (
              <div
                key={period}
                className={
                  "p-3.5 rounded-2xl border shadow-xs transition-all space-y-2.5 " +
                  (isMySubject
                    ? "bg-blue-50/50 border-blue-200"
                    : "bg-white border-gray-200")
                }
              >
                {/* Card Top */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-xs">
                      {period}
                    </span>
                    <span className="font-black text-sm text-slate-900">
                      {cell.className
                        ? "🏫 " + cell.className
                        : "حصة " + period}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasLesson && hasHomework ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        مكتمل ✅
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        تحضير ناقص ⚠️
                      </span>
                    )}
                  </div>
                </div>

                {/* Teacher & Subject */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    📚 {cell.subject?.name || "المادة"}
                  </span>
                  <span className="text-gray-500 font-medium">
                    👨‍🏫 {cell.teacher?.name || "غير محدد"}
                  </span>
                </div>

                {/* Lesson Title */}
                <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                    📖 عنوان وموضوع الدرس:
                  </span>
                  <p className="font-semibold text-slate-900">
                    {cell.lessonTitle || (
                      <span className="text-red-500 italic">
                        لم يتم إدخال عنوان الدرس
                      </span>
                    )}
                  </p>
                </div>

                {/* Homework & Activities */}
                <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                    📝 الواجبات والأنشطة:
                  </span>
                  <p className="text-slate-800">
                    {cell.homework || (
                      <span className="text-amber-600 italic">
                        لا يوجد واجب مسجل
                      </span>
                    )}
                  </p>
                  {cell.activities && (
                    <p className="text-[11px] text-gray-500 mt-1 border-t border-gray-100 pt-1">
                      🎯 أنشطة: {cell.activities}
                    </p>
                  )}
                </div>

                {/* Notes & Edit Action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-400 truncate max-w-[180px]">
                    {cell.notes ? "💬 " + cell.notes : ""}
                  </span>

                  {!readOnly && canEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        onEditCell && onEditCell(cell, currentDay, period)
                      }
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>✏️</span>
                      <span>تعديل التحضير</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP / FULL TABLE VIEW                                                 */}
      {/* ========================================================================= */}
      <div className={mobileLayout === "table" ? "block" : "hidden md:block"}>
        {/* Mobile Swipe Hint Banner */}
        <div className="md:hidden flex items-center justify-between text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg mb-2.5 no-print">
          <span>👈 اسحب الجدول يميناً ويساراً لاستعراض جميع تفاصيل الحصص</span>
          <span className="font-bold">👉</span>
        </div>
        \n {/* 3) Main Schedule Table */}
        <div className="overflow-x-auto schedule-table-wrap">
          <table className="w-full text-right border-collapse border border-slate-300 min-w-[950px]">
            <thead>
              <tr className="bg-slate-800 text-white text-xs sm:text-sm">
                <th className="border border-slate-700 px-3 py-3 w-32 text-center font-bold">
                  اليوم والتاريخ
                </th>
                <th className="border border-slate-700 px-2 py-3 w-14 text-center font-bold">
                  الحصة
                </th>
                {!selectedClass && (
                  <th className="border border-slate-700 px-2.5 py-3 w-28 font-bold text-center">
                    الفصل / الصف
                  </th>
                )}
                <th className="border border-slate-700 px-3 py-3 w-40 font-bold">
                  المادة والمعلم
                </th>
                <th className="border border-slate-700 px-3 py-3 w-64 font-bold">
                  عنوان الدرس والموضوع
                </th>
                <th className="border border-slate-700 px-3 py-3 font-bold">
                  الواجبات والأنشطة الصفية
                </th>
                <th className="border border-slate-700 px-3 py-3 w-44 font-bold">
                  الملاحظات
                </th>
                {!readOnly && (
                  <th className="border border-slate-700 px-2 py-3 w-16 text-center font-bold no-export no-print">
                    تعديل
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm divide-y divide-slate-200 text-slate-800 font-normal">
              {daysList.map((day, dayIndex) => {
                const dayDateFormatted = getDayDateFormatted(day);
                const dayBg =
                  dayIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                return periodsList.map((period, periodIndex) => {
                  const cellEntries = scheduleMatrix[day]?.[period] || [];
                  const cell = cellEntries[0] || null;
                  const canEdit = checkCanEditCell(cell);
                  const isMySubject = isTeacherSubject(cell);

                  return (
                    <tr
                      key={`${day}-${period}`}
                      className={`${dayBg} hover:bg-blue-50/40 transition-colors ${
                        isMySubject ? "bg-blue-50/80 font-medium" : ""
                      }`}
                    >
                      {/* Day Column with RowSpan (only on first period of each day) */}
                      {periodIndex === 0 && (
                        <td
                          rowSpan={periodsCount}
                          className="border border-slate-300 p-3 text-center align-middle font-bold bg-slate-100 text-slate-900 border-r-4 border-r-blue-700"
                        >
                          <div className="text-base font-extrabold text-blue-900">
                            {day}
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-1">
                            {dayDateFormatted}
                          </div>
                        </td>
                      )}

                      {/* Period Number */}
                      <td className="border border-slate-300 px-2 py-2.5 text-center font-bold text-slate-700 bg-slate-100/50">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-200 text-slate-800 text-xs font-black">
                          {period}
                        </span>
                      </td>

                      {/* Class Column if in "All Classes" View */}
                      {!selectedClass && (
                        <td className="border border-slate-300 p-2 text-center align-middle">
                          {cellEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {cellEntries.map((c, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() =>
                                    c.className &&
                                    onSelectClass &&
                                    onSelectClass(c.className)
                                  }
                                  className="inline-block bg-blue-100 text-blue-900 hover:bg-blue-600 hover:text-white transition-colors font-bold px-2 py-0.5 rounded text-xs cursor-pointer"
                                  title="عرض خطة هذا الفصل"
                                >
                                  {c.className || "عام"}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs italic">
                              —
                            </span>
                          )}
                        </td>
                      )}

                      {/* Subject & Teacher */}
                      <td className="border border-slate-300 p-2.5 align-top">
                        {cell?.subject ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    cell.subject.color || "#3b82f6",
                                }}
                              />
                              <span className="font-bold text-slate-900">
                                {cell.subject.name}
                              </span>
                            </div>
                            {cell.teacher?.name && (
                              <p className="text-xs text-slate-500 font-medium">
                                👨‍🏫 {cell.teacher.name}
                              </p>
                            )}
                            {cell.room && (
                              <span className="inline-block text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                📍 {cell.room}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            — (حصة غير محددة)
                          </span>
                        )}
                      </td>

                      {/* Lesson Title */}
                      <td className="border border-slate-300 p-2.5 align-top">
                        {cell?.lessonTitle ? (
                          <p className="text-slate-900 leading-relaxed font-bold">
                            {cell.lessonTitle}
                          </p>
                        ) : (
                          <span className="text-slate-300 text-xs italic">
                            لم يتم التحضير بعد
                          </span>
                        )}
                      </td>

                      {/* Homework & Activities */}
                      <td className="border border-slate-300 p-2.5 align-top">
                        <div className="space-y-1.5">
                          {cell?.homework && (
                            <div className="flex items-start gap-1.5 text-xs text-slate-800">
                              <span className="font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                                واجب:
                              </span>
                              <span className="leading-snug font-medium">
                                {cell.homework}
                              </span>
                            </div>
                          )}
                          {cell?.activities && (
                            <div className="flex items-start gap-1.5 text-xs text-slate-800">
                              <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                                نشاط:
                              </span>
                              <span className="leading-snug font-medium">
                                {cell.activities}
                              </span>
                            </div>
                          )}
                          {!cell?.homework && !cell?.activities && (
                            <span className="text-slate-300 text-xs italic">
                              لا يوجد
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="border border-slate-300 p-2.5 align-top">
                        {cell?.notes ? (
                          <p className="text-xs text-amber-900 bg-amber-50/80 p-1.5 rounded border border-amber-200/60 leading-relaxed font-medium">
                            {cell.notes}
                          </p>
                        ) : (
                          <span className="text-slate-300 text-xs italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* Actions / Edit Button */}
                      {!readOnly && (
                        <td className="border border-slate-300 p-2 text-center align-middle no-export no-print">
                          {canEdit ? (
                            <button
                              onClick={() =>
                                onEditCell(cell, day, period, selectedClass)
                              }
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm cursor-pointer"
                              title="تعديل الحصة"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                          ) : isSuperAdmin ? (
                            <button
                              onClick={() =>
                                onEditCell(null, day, period, selectedClass)
                              }
                              className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-all cursor-pointer"
                              title="إضافة حصة"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </button>
                          ) : (
                            <span
                              className="text-gray-300 text-xs"
                              title="غير مصرح بتعديل هذا السجل"
                            >
                              🔒
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3) Table Footer Signatures (For Official Print) */}
      <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-xs text-slate-700 font-semibold">
        <div>
          <p className="text-slate-500 font-normal mb-6">وكيل المدرسة</p>
          <p className="font-bold text-slate-900">
            {settings?.academicAdvisorName || "أ. فهد الشمري"}
          </p>
        </div>
        <div className="hidden md:block">
          <p className="text-slate-500 font-normal mb-6">ختم المدرسة الرسمي</p>
          <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full mx-auto" />
        </div>
        <div>
          <p className="text-slate-500 font-normal mb-6">مدير المدرسة</p>
          <p className="font-bold text-slate-900">
            {settings?.principalName || "أ. عبدالعزيز الراجحي"}
          </p>
        </div>
      </div>
    </div>
  );
}
