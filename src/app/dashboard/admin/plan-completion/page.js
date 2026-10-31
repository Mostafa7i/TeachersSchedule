"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { subjectsService } from "@/services/subjects.service";
import { settingsService } from "@/services/settings.service";
import { notificationsService } from "@/services/notifications.service";
import Modal from "@/components/ui/Modal";
import TeacherWeeklyPlanModal from "@/components/schedule/TeacherWeeklyPlanModal";

export default function AdminPlanCompletionPage() {
  const toast = useToast();

  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [completionData, setCompletionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeacherId, setExpandedTeacherId] = useState(null);

  // Teacher Plan Preview Modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedTeacherForPlan, setSelectedTeacherForPlan] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState(null);

  // Single Reminder Modal
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [selectedTeacherForReminder, setSelectedTeacherForReminder] =
    useState(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);

  // Bulk Reminder Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [sendingBulk, setSendingBulk] = useState(false);

  const isInitialMount = useRef(true);

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
        const weeksList = weeksRes.data || [];
        setWeeks(weeksList);
        setSubjects(subjectsRes.data || []);
        setSettings(settingsRes.data || null);

        const activeWk = currWeekRes.data || weeksList[0];
        if (activeWk) {
          setSelectedWeekId(activeWk._id);
          try {
            const statsRes = await schedulesService.getCompletionStats(activeWk._id);
            setCompletionData(statsRes.data || null);
          } catch (e) {
            console.error("Failed to load initial completion stats:", e);
          }
        }
      } catch (err) {
        toast.error("فشل تحميل البيانات الأساسية");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const fetchStats = async (weekId = selectedWeekId) => {
    if (!weekId) return;
    try {
      setRefreshing(true);
      const res = await schedulesService.getCompletionStats(weekId);
      setCompletionData(res.data || null);
    } catch (err) {
      toast.error("فشل جلب إحصائيات إنجاز الخطط");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (selectedWeekId) {
      fetchStats(selectedWeekId);
    }
  }, [selectedWeekId]);

  const handleOpenPlanModal = (teacher) => {
    setSelectedTeacherForPlan(teacher);
    setPlanModalOpen(true);
  };

  const handleOpenSingleReminder = (teacherItem) => {
    setSelectedTeacherForReminder(teacherItem);
    const weekLabel = completionData?.week?.label || "الأسبوع الحالي";
    setReminderTitle("تنبيه: إكمال الخطة الأسبوعية للدروس (" + weekLabel + ")");
    setReminderMessage(
      "الأستاذ الفاضل / " +
        teacherItem.teacher?.name +
        "، نود تذكيرك بضرورة استكمال بيانات الدروس المطلوبة للحصص المسندة إليك (" +
        teacherItem.missingSlotsCount +
        " حصة بحاجة لإكمال) في خطة " +
        weekLabel +
        ".",
    );
    setSingleModalOpen(true);
  };

  const handleSendSingleReminder = async (e) => {
    e.preventDefault();
    if (!selectedTeacherForReminder) return;

    setSendingReminder(true);
    try {
      await notificationsService.sendReminder({
        teacherId: selectedTeacherForReminder.teacher._id,
        weekId: selectedWeekId,
        title: reminderTitle,
        message: reminderMessage,
        type: "WARNING",
      });
      toast.success(
        "تم إرسال التنبيه إلى المعلم (" +
          selectedTeacherForReminder.teacher.name +
          ") بنجاح 🔔",
      );
      setSingleModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل إرسال التنبيه");
    } finally {
      setSendingReminder(false);
    }
  };

  const handleOpenBulkReminder = () => {
    const weekLabel = completionData?.week?.label || "الأسبوع الحالي";
    setBulkTitle(
      "تنبيه عاجل: إكمال الخطة الأسبوعية للدروس (" + weekLabel + ")",
    );
    setBulkMessage(
      "السادة المعلمين الأفاضل، يُرجى سرعة استكمال بيانات الدروس المطلوبة للحصص المتبقية في خطة " +
        weekLabel +
        " قبل نهاية دوام اليوم ليتسنى اعتمادها.",
    );
    setBulkModalOpen(true);
  };

  const handleSendBulkReminder = async (e) => {
    e.preventDefault();
    setSendingBulk(true);
    try {
      const res = await notificationsService.sendReminder({
        weekId: selectedWeekId,
        sendToAllIncomplete: true,
        title: bulkTitle,
        message: bulkMessage,
        type: "WARNING",
      });
      toast.success(
        res.message || "تم إرسال التنبيهات لجميع المعلمين المتأخرين بنجاح 🎉",
      );
      setBulkModalOpen(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "فشل إرسال التنبيهات الجماعية",
      );
    } finally {
      setSendingBulk(false);
    }
  };

  // ── تطبيع إحصائيات الإنجاز ────────────────────────────────
  // بعض المواد، مثل التربية البدنية، لا تتطلب واجبًا منزليًا.
  // الأفضل أن يرسل الـ API requiresHomework صراحة، وهذه القواعد تعمل كـ fallback.
  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه");

  const NO_HOMEWORK_SUBJECTS = [
    "تربيه بدنيه",
    "التربيه البدنيه",
    "تربية بدنية",
    "التربية البدنية",
    "بدنية",
    "رياضة",
    "مهارات حياتية",
    "مهارات حياتيه",
  ].map(normalizeText);

  const hasExplicitFalse = (value) =>
    value === false || value === 0 || value === "false";

  const subjectRequiresHomework = (subject) => {
    if (!subject) return true;
    if (
      hasExplicitFalse(subject.requiresHomework) ||
      hasExplicitFalse(subject.homeworkRequired) ||
      hasExplicitFalse(subject.hasHomework)
    ) {
      return false;
    }
    const name = normalizeText(subject.name || subject.title || subject.subjectName);
    return !NO_HOMEWORK_SUBJECTS.some((excluded) => name.includes(excluded));
  };

  const teacherRequiresHomework = (item) => {
    if (
      hasExplicitFalse(item.requiresHomework) ||
      hasExplicitFalse(item.homeworkRequired) ||
      hasExplicitFalse(item.teacher?.requiresHomework) ||
      hasExplicitFalse(item.teacher?.homeworkRequired)
    ) {
      return false;
    }

    const subjectsForTeacher = item.subjects || item.teacher?.subjects || [];
    if (subjectsForTeacher.length > 0) {
      // إذا كانت كل المواد المسندة لا تتطلب واجبًا، لا نحاسب المعلم على الواجب.
      return subjectsForTeacher.some(subjectRequiresHomework);
    }

    const subjectName = item.subject?.name || item.subjectName;
    return subjectName ? subjectRequiresHomework({ name: subjectName }) : true;
  };

  const toCount = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  };

  const normalizeTeacherItem = (item) => {
    const totalAssigned = toCount(item.totalAssigned ?? item.assignedSlotsCount);
    const hasClasses = totalAssigned > 0;
    const homeworkRequired = teacherRequiresHomework(item);
    
    // Missing lessons count
    const missingLessonCount = Math.min(
      toCount(item.missingLessonCount ?? item.missingLessons),
      totalAssigned,
    );

    // Number of lessons with title filled
    const preparedLessonCount = Math.max(totalAssigned - missingLessonCount, 0);

    // Raw missing homework count
    const rawMissingHomeworkCount = toCount(
      item.missingHomeworkCount ?? item.missingHomework,
    );
    const missingHomeworkCount = homeworkRequired
      ? Math.min(rawMissingHomeworkCount, totalAssigned)
      : 0;

    // Completed slots count (lessons prepared)
    const completedCount = item.completedCount !== undefined
      ? toCount(item.completedCount)
      : preparedLessonCount;

    // Completion percentage: based on prepared lessons and started progress
    const completionRate = hasClasses
      ? (item.completionRate !== undefined
          ? toCount(item.completionRate)
          : Math.round((completedCount / totalAssigned) * 100))
      : null;

    let status = item.status || "NO_CLASSES";
    if (hasClasses && !item.status) {
      if (completedCount === totalAssigned) {
        status = "COMPLETED";
      } else if (completedCount === 0 && (rawMissingHomeworkCount === totalAssigned || !homeworkRequired)) {
        status = "NOT_STARTED";
      } else {
        status = "PARTIAL";
      }
    }

    return {
      ...item,
      totalAssigned,
      hasClasses,
      homeworkRequired,
      missingLessonCount,
      missingHomeworkCount,
      effectiveMissingCount: missingLessonCount,
      completedCount,
      completionRate,
      status,
    };
  };

  const allTeachers = (completionData?.teachers || []).map(normalizeTeacherItem);
  const recalculatedSummary = allTeachers.reduce(
    (acc, item) => {
      if (!item.hasClasses) return acc;
      acc.totalTeachersWithClasses += 1;
      acc.totalMissingLessons += item.missingLessonCount;
      acc.totalMissingHomework += item.missingHomeworkCount;
      if (item.status === "COMPLETED") acc.fullyCompletedTeachers += 1;
      else acc.incompleteTeachers += 1;
      acc.totalAssigned += item.totalAssigned;
      acc.completedCount += item.completedCount;
      return acc;
    },
    {
      totalTeachersWithClasses: 0,
      fullyCompletedTeachers: 0,
      incompleteTeachers: 0,
      totalMissingLessons: 0,
      totalMissingHomework: 0,
      totalAssigned: 0,
      completedCount: 0,
    },
  );
  const summary = {
    ...recalculatedSummary,
    overallCompletionPercentage: recalculatedSummary.totalAssigned
      ? Math.round(
          (recalculatedSummary.completedCount / recalculatedSummary.totalAssigned) * 100,
        )
      : 0,
  };

  const filteredTeachers = allTeachers.filter((item) => {
    if (statusFilter === "incomplete") {
      if (item.status !== "PARTIAL" && item.status !== "NOT_STARTED")
        return false;
    } else if (statusFilter === "completed") {
      if (item.status !== "COMPLETED") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.teacher?.name?.toLowerCase().includes(q);
      const matchEmail = item.teacher?.email?.toLowerCase().includes(q);
      const matchPhone = item.teacher?.phone?.includes(q);
      const matchSubject = item.teacher?.subjects?.some((s) =>
        s.name?.toLowerCase().includes(q),
      );
      if (!matchName && !matchEmail && !matchPhone && !matchSubject)
        return false;
    }

    return true;
  });

  if (loading || (!completionData && weeks.length > 0)) {
    return <PlanCompletionSkeleton />;
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold mb-1.5">
            <span>📊 نظام الرقابة والمتابعة الأسبوعية</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">
            متابعة إنجاز الخطط الأسبوعية والتنبيهات
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            رصد الحصص غير المكتملة، مع مراعاة المواد التي لا تتطلب واجبات، وإرسال تنبيهات
            فورية لحسابات المعلمين.
          </p>
        </div>

        {summary.incompleteTeachers > 0 && (
          <button
            onClick={handleOpenBulkReminder}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all text-xs sm:text-sm cursor-pointer shrink-0"
          >
            <span>📢</span>
            <span>تنبيه جماعي للمتأخرين ({summary.incompleteTeachers})</span>
          </button>
        )}
      </div>

      {/* Week Selector & Overall Percentage */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-end gap-2 flex-1">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
              الأسبوع الدراسي للمتابعة:
            </label>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none truncate"
            >
              {weeks.map((w) => (
                <option key={w._id} value={w._id}>
                  📅 {w.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchStats(selectedWeekId)}
            disabled={refreshing}
            className="p-2 sm:p-2.5 text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
            title="تحديث البيانات"
          >
            <svg
              className={
                "w-5 h-5 " + (refreshing ? "animate-spin text-blue-600" : "")
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl shrink-0">
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 block">
              نسبة إنجاز المدرسة بالكامل
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              {summary.overallCompletionPercentage}%
            </span>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-4 border-blue-600 flex items-center justify-center font-black text-xs text-blue-700 bg-white shrink-0">
            {summary.overallCompletionPercentage}%
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">
              معلمون لديهم حصص
            </span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
              👨‍🏫
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {summary.totalTeachersWithClasses}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">
            إجمالي المعلمين المسند لهم جدول
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">
              مكتملو الخطة 100%
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
              ✅
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {summary.fullyCompletedTeachers}
          </p>
          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
            أكملوا جميع الدروس والواجبات
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">
              متأخرون / غير مكتمل
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
              ⚠️
            </span>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {summary.incompleteTeachers}
          </p>
          <p className="text-[11px] text-amber-700 mt-1 font-semibold">
            معلمون بحاجة لتنبيه ومتابعة
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">
              الحصص الناقصة
            </span>
            <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-base">
              📋
            </span>
          </div>
          <div className="flex justify-center items-center gap-3 mt-2">
            <div>
              <span className="text-xl font-black text-red-600">
                {summary.totalMissingLessons}
              </span>
              <span className="text-[10px] text-gray-500 block font-semibold">
                درس فارغ
              </span>
            </div>         
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter("all")}
            className={
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-nowrap shrink-0 " +
              (statusFilter === "all"
                ? "bg-white text-blue-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900")
            }
          >
            الكل ({allTeachers.length})
          </button>
          <button
            onClick={() => setStatusFilter("incomplete")}
            className={
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-nowrap shrink-0 " +
              (statusFilter === "incomplete"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900")
            }
          >
            ⚠️ المتأخرون ({summary.incompleteTeachers})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-nowrap shrink-0 " +
              (statusFilter === "completed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900")
            }
          >
            ✅ المكتملون ({summary.fullyCompletedTeachers})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-[280px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المعلم، المادة، الهاتف..."
            className="w-full pr-8 pl-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

      {/* Teachers Table */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <span className="text-4xl block mb-2">🎉</span>
          <h3 className="text-base font-bold text-gray-800">
            لا توجد سجلات تطابق الفلتر المختار
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            جميع المعلمين قاموا بتعبئة خططهم أو لا توجد نتائج مطابقة للبحث.
          </p>
        </div>
      ) : (
        <>
          {/* 1) MOBILE RESPONSIVE CARDS (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {filteredTeachers.map((item) => {
              const isIncomplete =
                item.hasClasses &&
                (item.status === "PARTIAL" || item.status === "NOT_STARTED");

              return (
                <div
                  key={item.teacher._id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs transition-all space-y-3 ${
                    item.status === "COMPLETED"
                      ? "border-emerald-200"
                      : item.status === "PARTIAL"
                        ? "border-amber-200"
                        : item.status === "NOT_STARTED"
                          ? "border-red-200"
                          : "border-gray-200"
                  }`}
                >
                  {/* Card Header: Teacher + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                        {item.teacher.name?.charAt(0) || "م"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                          {item.teacher.name}
                        </h4>
                        {item.teacher.phone ? (
                          <a
                            href={`tel:${item.teacher.phone}`}
                            className="text-[11px] text-blue-600 font-mono hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <span>📞</span>
                            <span>{item.teacher.phone}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-400 block mt-0.5">
                            بدون هاتف
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {item.status === "NO_CLASSES" ? (
                        <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          بدون حصص
                        </span>
                      ) : item.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          <span>✅</span>
                          <span>مكتمل</span>
                        </span>
                      ) : item.status === "PARTIAL" ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          <span>⚠️</span>
                          <span>غير مكتمل</span>
                        </span>
                      ) : item.status === "NOT_STARTED" ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          <span>❌</span>
                          <span>لم يبدأ</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">بدون حصص</span>
                      )}
                    </div>
                  </div>

                  {/* Subjects */}
                  {item.teacher.subjects &&
                    item.teacher.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.teacher.subjects.map((s) => (
                          <span
                            key={s._id || s}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                            style={{
                              backgroundColor: s.color || "#2563eb",
                            }}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Progress & Class Count */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">
                        {item.hasClasses
                          ? `الإنجاز: ${item.completionRate}%`
                          : "لا توجد حصص مسندة"}
                      </span>
                      <span className="text-slate-500 font-semibold text-[11px]">
                        {item.hasClasses
                          ? `${item.completedCount} من ${item.totalAssigned} حصة`
                          : "—"}
                      </span>
                    </div>
                    {item.hasClasses && (
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.completionRate === 100
                              ? "bg-emerald-500"
                              : item.completionRate > 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${item.completionRate || 0}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Missing slots indicators */}
                  {isIncomplete && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {item.missingLessonCount > 0 && (
                        <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1">
                          <span>📖</span>
                          <span>{item.missingLessonCount} درس فارغ</span>
                        </span>
                      )}
                      {item.missingHomeworkCount > 0 && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1">
                          <span>📝</span>
                          <span>{item.missingHomeworkCount} واجب فارغ</span>
                        </span>
                      )}
                      {!item.homeworkRequired &&
                        item.missingLessonCount > 0 && (
                          <span className="text-[10px] text-slate-500 font-semibold">
                            الواجب غير مطلوب للمادة
                          </span>
                        )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleOpenPlanModal(item.teacher)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
                    >
                      <span>👁️</span>
                      <span>استعراض الخطة</span>
                    </button>

                    {isIncomplete && (
                      <button
                        type="button"
                        onClick={() => handleOpenSingleReminder(item)}
                        className="inline-flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3.5 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
                      >
                        <span>🔔</span>
                        <span>تنبيه</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2) DESKTOP TABLE VIEW (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="px-4 py-3.5 font-bold">المعلم</th>
                  <th className="px-3 py-3.5 font-bold">المادة الدراسية</th>
                  <th className="px-3 py-3.5 text-center font-bold">
                    الحصص المسندة
                  </th>
                  <th className="px-4 py-3.5 font-bold">نسبة الإنجاز</th>
                  <th className="px-3 py-3.5 text-center font-bold">الحالة</th>
                  <th className="px-3 py-3.5 font-bold">النواقص</th>
                  <th className="px-4 py-3.5 text-center font-bold">
                    الإجراء والتنبيه
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-slate-800">
                {filteredTeachers.map((item , index) => {
                  const isIncomplete =
                    item.hasClasses &&
                    (item.status === "PARTIAL" || item.status === "NOT_STARTED");
                  return (
                    <tr
                      key={item.teacher._id}
                      className={
                        
                        ` transition-colors ${index % 2  === 0 ? "bg-slate-100" : "bg-slate-50"}`
                      }
                    >
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                            {item.teacher.name?.charAt(0) || "م"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {item.teacher.name}
                            </p>
                            {item.teacher.phone && (
                              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                                📞 {item.teacher.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {item.teacher.subjects?.map((s) => (
                            <span
                              key={s._id || s}
                              className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-xs"
                              style={{ backgroundColor: s.color || "#2563eb" }}
                            >
                              {s.name}
                            </span>
                          ))}
                          {(!item.teacher.subjects ||
                            item.teacher.subjects.length === 0) && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center align-middle font-bold text-slate-700">
                        <span className="bg-slate-100 text-nowrap text-slate-800  p-1 rounded-lg text-xs">
                          {item.totalAssigned} حصة
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-middle min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span
                              className={
                                !item.hasClasses
                                  ? "text-slate-400"
                                  : item.completionRate === 100
                                    ? "text-emerald-700"
                                  : item.completionRate > 50
                                    ? "text-amber-700"
                                    : "text-red-700"
                              }
                            >
                              {item.hasClasses ? `${item.completionRate}%` : "—"}
                            </span>
                            <span className="text-gray-400 text-[10px]">
                              {item.hasClasses ? `${item.completedCount} من ${item.totalAssigned}` : "لا توجد حصص"}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={
                                "h-full rounded-full transition-all duration-500 " +
                                (!item.hasClasses
                                  ? "bg-slate-300"
                                  : item.completionRate === 100
                                    ? "bg-emerald-500"
                                  : item.completionRate > 50
                                    ? "bg-amber-500"
                                    : "bg-red-500")
                              }
                              style={{ width: `${item.completionRate || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center align-middle">
                      {item.status === "NO_CLASSES" ? (
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 p-1 rounded-full text-xs font-bold">
                            <span className="text-[9px]">بدون حصص -</span>
                          </span>
                        ) : item.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                            <span>✅</span>
                            <span>مكتمل</span>
                          </span>
                        ) : item.status === "PARTIAL" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text text-nowrap p-1 rounded-full text-xs font-bold">
                            <span>⚠️</span>
                            <span>غير مكتمل</span>
                          </span>
                        ) : item.status === "NOT_STARTED" ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold">
                            <span>❌</span>
                            <span className="text-nowrap text-xs">لم يبدأ</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            بدون حصص
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 align-middle">
                        {!item.hasClasses ? (
                          <span className="text-slate-400 text-xs font-semibold">
                            لا توجد حصص فعلية
                          </span>
                        ) : isIncomplete ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1 text-[11px]">
                              {item.missingLessonCount > 0 && (
                                <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                                  {item.missingLessonCount} درس فارغ
                                </span>
                              )}
                              {item.missingHomeworkCount > 0 && (
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                                  {item.missingHomeworkCount} واجب فارغ
                                </span>
                              )}
                              {!item.homeworkRequired && item.missingLessonCount > 0 && (
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  الواجب غير مطلوب لهذه المادة
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-xs font-bold">
                            لا توجد نواقص 👍
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenPlanModal(item.teacher)}
                            className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1.5 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
                            title="استعراض ورؤية خطة المعلم كاملة لهذا الأسبوع"
                          >
                            <span>👁️</span>
                            <span>استعراض الخطة</span>
                          </button>

                          {isIncomplete && (
                            <button
                              type="button"
                              onClick={() => handleOpenSingleReminder(item)}
                              className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1.5 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
                              title="إرسال تنبيه مباشر للمعلم"
                            >
                              <span>🔔</span>
                              <span>تنبيه</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Single Teacher Notification Modal */}
      <Modal
        isOpen={singleModalOpen}
        onClose={() => setSingleModalOpen(false)}
        title={
          "إرسال تنبيه للمعلم: " +
          (selectedTeacherForReminder?.teacher?.name || "")
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setSingleModalOpen(false)}
              disabled={sendingReminder}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSendSingleReminder}
              disabled={sendingReminder}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {sendingReminder ? "جاري الإرسال..." : "إرسال التنبيه الآن 🔔"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSendSingleReminder} className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold">
            <span>
              💡 سيصل هذا الإشعار والتنبيه فوراً إلى حساب المعلم وبوابته
              الرسمية.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              عنوان التنبيه <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              نص ورسالة التنبيه <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium leading-relaxed"
            />
          </div>
        </form>
      </Modal>

      {/* Bulk Notification Modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="📢 إرسال تنبيه جماعي لجميع المعلمين المتأخرين"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setBulkModalOpen(false)}
              disabled={sendingBulk}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSendBulkReminder}
              disabled={sendingBulk}
              className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {sendingBulk ? "جاري الإرسال الجماعي..." : "إرسال للجميع الآن 📢"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSendBulkReminder} className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold">
            <span>
              ⚠️ سيتم إرسال هذا التنبيه آلياً إلى جميع المعلمين الذين لديهم حصص
              ناقصة ({summary.incompleteTeachers} معلم) في خطة هذا الأسبوع.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              عنوان التنبيه الجماعي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bulkTitle}
              onChange={(e) => setBulkTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              نص التنبيه <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium leading-relaxed"
            />
          </div>
        </form>
      </Modal>

      {/* Teacher Weekly Plan Preview & Edit Modal for Admin */}
      <TeacherWeeklyPlanModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        teacher={selectedTeacherForPlan}
        initialWeekId={selectedWeekId}
        weeks={weeks}
        settings={settings}
        subjects={subjects}
        onSaveSuccess={() => fetchStats(selectedWeekId)}
      />
    </div>
  );
}

function PlanCompletionSkeleton() {
  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-slate-200 rounded-full skeleton" />
          <div className="h-7 sm:h-9 w-64 sm:w-80 bg-slate-200 rounded-xl skeleton" />
          <div className="h-4 w-72 sm:w-96 max-w-full bg-slate-100 rounded-lg skeleton" />
        </div>
        <div className="h-10 w-44 bg-slate-200 rounded-xl skeleton" />
      </div>

      {/* Week Selector Skeleton */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="h-11 w-full sm:w-72 bg-slate-100 rounded-xl skeleton" />
        <div className="h-12 w-full sm:w-48 bg-slate-100 rounded-2xl skeleton" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 sm:w-24 bg-slate-200 rounded skeleton" />
              <div className="w-8 h-8 rounded-xl bg-slate-100 skeleton" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded-lg skeleton" />
            <div className="h-3 w-28 bg-slate-100 rounded skeleton" />
          </div>
        ))}
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="h-9 w-full sm:w-64 bg-slate-100 rounded-xl skeleton" />
        <div className="h-9 w-full sm:w-48 bg-slate-100 rounded-xl skeleton" />
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="block md:hidden space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-200 skeleton" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-slate-200 rounded skeleton" />
                  <div className="h-3 w-20 bg-slate-100 rounded skeleton" />
                </div>
              </div>
              <div className="h-6 w-16 bg-slate-200 rounded-full skeleton" />
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full skeleton" />
            <div className="h-9 w-full bg-slate-100 rounded-xl skeleton" />
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 py-2 border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 skeleton" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-slate-200 rounded skeleton" />
                <div className="h-3 w-20 bg-slate-100 rounded skeleton" />
              </div>
            </div>
            <div className="h-4 w-24 bg-slate-100 rounded skeleton" />
            <div className="h-4 w-16 bg-slate-100 rounded skeleton" />
            <div className="h-2 w-32 bg-slate-100 rounded-full skeleton" />
            <div className="h-6 w-20 bg-slate-200 rounded-full skeleton" />
            <div className="h-8 w-28 bg-slate-200 rounded-xl skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
