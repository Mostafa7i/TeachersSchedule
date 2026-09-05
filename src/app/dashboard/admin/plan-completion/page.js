"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { schedulesService, weeksService } from "@/services/schedules.service";
import { notificationsService } from "@/services/notifications.service";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui";

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

  // Single Reminder Modal
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [selectedTeacherForReminder, setSelectedTeacherForReminder] = useState(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);

  // Bulk Reminder Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [sendingBulk, setSendingBulk] = useState(false);

  useEffect(() => {
    const initWeeks = async () => {
      try {
        setLoading(true);
        const [weeksRes, currWeekRes] = await Promise.all([
          weeksService.getAll(),
          weeksService.getCurrent(),
        ]);
        const weeksList = weeksRes.data || [];
        setWeeks(weeksList);

        const activeWk = currWeekRes.data || weeksList[0];
        if (activeWk) {
          setSelectedWeekId(activeWk._id);
        }
      } catch (err) {
        toast.error("فشل تحميل الأسابيع الدراسية");
      } finally {
        setLoading(false);
      }
    };
    initWeeks();
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
    if (selectedWeekId) {
      fetchStats(selectedWeekId);
    }
  }, [selectedWeekId]);

  const handleOpenSingleReminder = (teacherItem) => {
    setSelectedTeacherForReminder(teacherItem);
    const weekLabel = completionData?.week?.label || "الأسبوع الحالي";
    setReminderTitle("تنبيه: إكمال الخطة والتحضير الأسبوعي (" + weekLabel + ")");
    setReminderMessage(
      "الأستاذ الفاضل / " +
        teacherItem.teacher?.name +
        "، نود تذكيرك بضرورة استكمال تعبئة خانات عنوان وموضوع الدرس والواجبات المنزلية للحصص المسندة إليك (" +
        teacherItem.missingSlotsCount +
        " حصة بحاجة لإكمال) في خطة " +
        weekLabel +
        "."
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
          ") بنجاح 🔔"
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
    setBulkTitle("تنبيه عاجل: إكمال خطة التحضير الأسبوعية (" + weekLabel + ")");
    setBulkMessage(
      "السادة المعلمين الأفاضل، يُرجى سرعة استكمال تعبئة موضوعات الدروس والواجبات المنزلية للحصص المتبقية في خطة " +
        weekLabel +
        " قبل نهاية دوام اليوم ليتسنى اعتمادها."
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
      toast.success(res.message || "تم إرسال التنبيهات لجميع المعلمين المتأخرين بنجاح 🎉");
      setBulkModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل إرسال التنبيهات الجماعية");
    } finally {
      setSendingBulk(false);
    }
  };

  const allTeachers = completionData?.teachers || [];
  const filteredTeachers = allTeachers.filter((item) => {
    if (statusFilter === "incomplete") {
      if (item.status !== "PARTIAL" && item.status !== "NOT_STARTED") return false;
    } else if (statusFilter === "completed") {
      if (item.status !== "COMPLETED") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.teacher?.name?.toLowerCase().includes(q);
      const matchEmail = item.teacher?.email?.toLowerCase().includes(q);
      const matchPhone = item.teacher?.phone?.includes(q);
      const matchSubject = item.teacher?.subjects?.some((s) =>
        s.name?.toLowerCase().includes(q)
      );
      if (!matchName && !matchEmail && !matchPhone && !matchSubject) return false;
    }

    return true;
  });

  const summary = completionData?.summary || {
    totalTeachersWithClasses: 0,
    fullyCompletedTeachers: 0,
    incompleteTeachers: 0,
    totalMissingLessons: 0,
    totalMissingHomework: 0,
    overallCompletionPercentage: 0,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold mb-1.5">
            <span>📊 نظام الرقابة والمتابعة الأسبوعية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            متابعة إنجاز الخطط الأسبوعية والتنبيهات
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            رصد الحصص غير المكتملة (نقص موضوع الدرس أو الواجب) وإرسال تنبيهات فورية ومباشرة لحسابات المعلمين.
          </p>
        </div>

        {summary.incompleteTeachers > 0 && (
          <button
            onClick={handleOpenBulkReminder}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all text-sm cursor-pointer"
          >
            <span>📢</span>
            <span>تنبيه جماعي للمتأخرين ({summary.incompleteTeachers})</span>
          </button>
        )}
      </div>

      {/* Week Selector & Overall Percentage */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="min-w-[260px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              اختر الأسبوع الدراسي للمتابعة:
            </label>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-bold bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="mt-5 sm:mt-4 p-2.5 text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <svg
              className={"w-5 h-5 " + (refreshing ? "animate-spin text-blue-600" : "")}
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

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 block">
              نسبة إنجاز المدرسة بالكامل
            </span>
            <span className="text-lg font-black text-slate-900">
              {summary.overallCompletionPercentage}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-blue-600 flex items-center justify-center font-black text-xs text-blue-700 bg-white">
            {summary.overallCompletionPercentage}%
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">معلمون لديهم حصص</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">👨‍🏫</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{summary.totalTeachersWithClasses}</p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">إجمالي المعلمين المسند لهم جدول</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">مكتملو الخطة 100%</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">✅</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{summary.fullyCompletedTeachers}</p>
          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">أكملوا جميع الدروس والواجبات</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">متأخرون / غير مكتمل</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">⚠️</span>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{summary.incompleteTeachers}</p>
          <p className="text-[11px] text-amber-700 mt-1 font-semibold">معلمون بحاجة لتنبيه ومتابعة</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">الحصص الناقصة</span>
            <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-base">📋</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div>
              <span className="text-xl font-black text-red-600">{summary.totalMissingLessons}</span>
              <span className="text-[10px] text-gray-500 block font-semibold">درس فارغ</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div>
              <span className="text-xl font-black text-purple-600">{summary.totalMissingHomework}</span>
              <span className="text-[10px] text-gray-500 block font-semibold">واجب فارغ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter("all")}
            className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer " + (statusFilter === "all" ? "bg-white text-blue-900 shadow-xs" : "text-gray-600 hover:text-gray-900")}
          >
            الكل ({allTeachers.length})
          </button>
          <button
            onClick={() => setStatusFilter("incomplete")}
            className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer " + (statusFilter === "incomplete" ? "bg-amber-500 text-white shadow-xs" : "text-gray-600 hover:text-gray-900")}
          >
            ⚠️ المتأخرون ({summary.incompleteTeachers})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer " + (statusFilter === "completed" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900")}
          >
            ✅ المكتملون ({summary.fullyCompletedTeachers})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المعلم، المادة، الهاتف..."
            className="w-full pr-8 pl-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <svg className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Teachers Table */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <span className="text-4xl block mb-2">🎉</span>
          <h3 className="text-base font-bold text-gray-800">لا توجد سجلات تطابق الفلتر المختار</h3>
          <p className="text-xs text-gray-500 mt-1">جميع المعلمين قاموا بتعبئة خططهم أو لا توجد نتائج مطابقة للبحث.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="px-4 py-3.5 font-bold">المعلم</th>
                  <th className="px-3 py-3.5 font-bold">المادة الدراسية</th>
                  <th className="px-3 py-3.5 text-center font-bold">الحصص المسندة</th>
                  <th className="px-4 py-3.5 font-bold">نسبة الإنجاز</th>
                  <th className="px-3 py-3.5 text-center font-bold">الحالة</th>
                  <th className="px-3 py-3.5 font-bold">النواقص</th>
                  <th className="px-4 py-3.5 text-center font-bold">الإجراء والتنبيه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-slate-800">
                {filteredTeachers.map((item) => {
                  const isIncomplete = item.status === "PARTIAL" || item.status === "NOT_STARTED";
                  return (
                    <tr key={item.teacher._id} className={"hover:bg-slate-50/80 transition-colors " + (isIncomplete ? "bg-amber-50/20" : "")}>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs">
                            {item.teacher.name?.charAt(0) || "م"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{item.teacher.name}</p>
                            {item.teacher.phone && (
                              <p className="text-[11px] text-gray-500 font-mono mt-0.5">📞 {item.teacher.phone}</p>
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
                          {(!item.teacher.subjects || item.teacher.subjects.length === 0) && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center align-middle font-bold text-slate-700">
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-xs">
                          {item.totalAssigned} حصة
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-middle min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={item.completionRate === 100 ? "text-emerald-700" : item.completionRate > 50 ? "text-amber-700" : "text-red-700"}>
                              {item.completionRate}%
                            </span>
                            <span className="text-gray-400 text-[10px]">
                              {item.completedCount} من {item.totalAssigned}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={"h-full rounded-full transition-all duration-500 " + (item.completionRate === 100 ? "bg-emerald-500" : item.completionRate > 50 ? "bg-amber-500" : "bg-red-500")}
                              style={{ width: item.completionRate + "%" }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center align-middle">
                        {item.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                            <span>✅</span>
                            <span>مكتمل</span>
                          </span>
                        ) : item.status === "PARTIAL" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
                            <span>⚠️</span>
                            <span>غير مكتمل</span>
                          </span>
                        ) : item.status === "NOT_STARTED" ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold">
                            <span>❌</span>
                            <span>لم يبدأ</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">بدون حصص</span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 align-middle">
                        {isIncomplete ? (
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
                            </div>
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-xs font-bold">لا توجد نواقص 👍</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center align-middle">
                        {isIncomplete ? (
                          <button
                            onClick={() => handleOpenSingleReminder(item)}
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
                            title="إرسال تنبيه مباشر للمعلم"
                          >
                            <span>🔔</span>
                            <span>تنبيه</span>
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Teacher Notification Modal */}
      <Modal
        isOpen={singleModalOpen}
        onClose={() => setSingleModalOpen(false)}
        title={"إرسال تنبيه للمعلم: " + (selectedTeacherForReminder?.teacher?.name || "")}
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
            <span>💡 سيصل هذا الإشعار والتنبيه فوراً إلى حساب المعلم وبوابته الرسمية.</span>
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
            <span>⚠️ سيتم إرسال هذا التنبيه آلياً إلى جميع المعلمين الذين لديهم حصص ناقصة ({summary.incompleteTeachers} معلم) في خطة هذا الأسبوع.</span>
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
    </div>
  );
}
