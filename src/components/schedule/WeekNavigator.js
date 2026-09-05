"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/constants";

export default function WeekNavigator({
  weeks = [],
  currentWeek,
  onSelectWeek,
  onCopyWeek,
  onAddSchedule,
  canCopy = false,
  canAdd = false,
}) {
  const { hasPermission, isAdmin } = useAuth();
  const currentIndex = weeks.findIndex((w) => w._id === currentWeek?._id);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < weeks.length - 1;

  const handlePrev = () => {
    if (hasPrev) onSelectWeek(weeks[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectWeek(weeks[currentIndex + 1]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
      {/* Week Selector and Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={!hasPrev}
          className="p-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="الأسبوع السابق"
        >
          <svg
            className="w-5 h-5 rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <div className="relative min-w-[240px]">
          <select
            value={currentWeek?._id || ""}
            onChange={(e) => {
              const selected = weeks.find((w) => w._id === e.target.value);
              if (selected) onSelectWeek(selected);
            }}
            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm font-semibold rounded-xl px-4 py-2.5 pe-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            {weeks.map((w) => (
              <option key={w._id} value={w._id}>
                {w.label} ({formatDate(w.startDate)} - {formatDate(w.endDate)})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-gray-500">
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!hasNext}
          className="p-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="الأسبوع التالي"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Week Date Display Badge */}
      {currentWeek && (
        <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-100">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>من: {formatDate(currentWeek.startDate)}</span>
          <span className="text-blue-300">|</span>
          <span>إلى: {formatDate(currentWeek.endDate)}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {canCopy &&
          (hasPermission(PERMISSIONS.SCHEDULES_COPY_WEEK) || isAdmin()) && (
            <button
              onClick={onCopyWeek}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
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
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
              <span>نسخ هذا الأسبوع</span>
            </button>
          )}

        {canAdd &&
          (hasPermission(PERMISSIONS.SCHEDULES_CREATE) || isAdmin()) && (
            <button
              onClick={onAddSchedule}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
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
              <span>إضافة حصة</span>
            </button>
          )}
      </div>
    </div>
  );
}
