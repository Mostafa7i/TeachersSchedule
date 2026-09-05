"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { settingsService } from "@/services/settings.service";
import { useToast } from "@/contexts/ToastContext";

const DEFAULT_TIMINGS = [
  { period: 1, startTime: "06:30", endTime: "07:25" },
  { period: 2, startTime: "07:25", endTime: "08:20" },
  { period: 3, startTime: "08:20", endTime: "09:15" },
  { period: 4, startTime: "09:35", endTime: "10:30" },
  { period: 5, startTime: "10:30", endTime: "11:25" },
  { period: 6, startTime: "11:25", endTime: "12:20" },
  { period: 7, startTime: "12:20", endTime: "01:15" },
  { period: 8, startTime: "01:15", endTime: "02:10" },
];

export default function PeriodTimingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
}) {
  const toast = useToast();
  const [periodsCount, setPeriodsCount] = useState(6);
  const [timings, setTimings] = useState(DEFAULT_TIMINGS);
  const [breakTime, setBreakTime] = useState({
    startTime: "09:15",
    endTime: "09:35",
    afterPeriod: 3,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setPeriodsCount(settings.periodsCount || 6);

      if (settings.periodTimings && settings.periodTimings.length > 0) {
        // Merge with default 8 slots
        const merged = Array.from({ length: 8 }, (_, i) => {
          const pNum = i + 1;
          const found = settings.periodTimings.find((t) => t.period === pNum);
          return (
            found ||
            DEFAULT_TIMINGS[i] || {
              period: pNum,
              startTime: "00:00",
              endTime: "00:00",
            }
          );
        });
        setTimings(merged);
      } else {
        setTimings(DEFAULT_TIMINGS);
      }

      if (settings.breakTime) {
        setBreakTime({
          startTime: settings.breakTime.startTime || "09:15",
          endTime: settings.breakTime.endTime || "09:35",
          afterPeriod: settings.breakTime.afterPeriod || 3,
        });
      }
    }
  }, [settings, isOpen]);

  const handleTimingChange = (periodNum, field, value) => {
    setTimings((prev) =>
      prev.map((t) => (t.period === periodNum ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        periodsCount: Number(periodsCount),
        periodTimings: timings.slice(0, Number(periodsCount)),
        breakTime,
      };

      const res = await settingsService.update(payload);
      toast.success("تم تحديث وحفظ أوقات الحصص والفسحة بنجاح ✅");
      if (onSettingsUpdated) {
        onSettingsUpdated(res.data);
      }
      onClose();
    } catch (err) {
      toast.error("فشل حفظ أوقات الحصص");
    } finally {
      setSaving(false);
    }
  };

  const periodsList = Array.from(
    { length: Number(periodsCount) },
    (_, i) => i + 1
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚙️ ضبط وتعديل أوقات الحصص والفسحة المدرسية"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
          >
            {saving ? "جاري الحفظ..." : "حفظ التوقيتات الآن ✅"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-xs text-blue-900 leading-relaxed font-semibold">
          💡 يمكنك هنا تحديد وقت بداية ونهاية كل حصة ووقت الفسحة، وسيتم تطبيقها
          تلقائياً في جميع الجداول المطبوعة والمصدرة.
        </div>

        {/* Periods Count Selector */}
        <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
          <div>
            <label className="block text-xs font-black text-gray-800">
              عدد الحصص اليومية:
            </label>
            <p className="text-[11px] text-gray-500 font-medium">
              العدد الإجمالي للحصص في اليوم الدراسي
            </p>
          </div>
          <select
            value={periodsCount}
            onChange={(e) => setPeriodsCount(Number(e.target.value))}
            className="px-4 py-2 text-sm font-black bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value={5}>5 حصص</option>
            <option value={6}>6 حصص</option>
            <option value={7}>7 حصص</option>
            <option value={8}>8 حصص</option>
          </select>
        </div>

        {/* Break Time Box */}
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
            <span>🥪</span>
            <span>توقيت الفسحة / الاستراحة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-amber-950 mb-1">
                وقت البداية:
              </label>
              <input
                type="text"
                value={breakTime.startTime}
                onChange={(e) =>
                  setBreakTime({ ...breakTime, startTime: e.target.value })
                }
                placeholder="09:15"
                className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-amber-300 rounded-lg text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-950 mb-1">
                وقت النهاية:
              </label>
              <input
                type="text"
                value={breakTime.endTime}
                onChange={(e) =>
                  setBreakTime({ ...breakTime, endTime: e.target.value })
                }
                placeholder="09:35"
                className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-amber-300 rounded-lg text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-950 mb-1">
                مكان الفسحة بعد الحصة:
              </label>
              <select
                value={breakTime.afterPeriod}
                onChange={(e) =>
                  setBreakTime({
                    ...breakTime,
                    afterPeriod: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-amber-300 rounded-lg text-center"
              >
                <option value={2}>بعد الحصة الثانية</option>
                <option value={3}>بعد الحصة الثالثة</option>
                <option value={4}>بعد الحصة الرابعة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Periods Timing Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-gray-800">
            أوقات الحصص بالتفصيل:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {periodsList.map((p) => {
              const currentT = timings.find((t) => t.period === p) || {
                period: p,
                startTime: "",
                endTime: "",
              };

              return (
                <div
                  key={p}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      {p}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      الحصة {p}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={currentT.startTime}
                      onChange={(e) =>
                        handleTimingChange(p, "startTime", e.target.value)
                      }
                      placeholder="06:30"
                      className="w-20 px-2 py-1 text-xs font-bold text-center border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-gray-400 text-xs">-</span>
                    <input
                      type="text"
                      value={currentT.endTime}
                      onChange={(e) =>
                        handleTimingChange(p, "endTime", e.target.value)
                      }
                      placeholder="07:25"
                      className="w-20 px-2 py-1 text-xs font-bold text-center border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
