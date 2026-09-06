"use client";

import React, { useState } from "react";
import { Calendar, Filter, ChevronRight } from "lucide-react";

export type DatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "financial_year"
  | "custom";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string, presetName: string) => void;
  loading?: boolean;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onRangeChange,
  loading = false,
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>("this_month");
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const applyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    const formatDateStr = (d: Date) => d.toISOString().split("T")[0];

    switch (preset) {
      case "today": {
        start = new Date();
        end = new Date();
        setShowCustomPicker(false);
        onRangeChange(formatDateStr(start), formatDateStr(end), "Today");
        break;
      }
      case "yesterday": {
        start = new Date(now.setDate(now.getDate() - 1));
        end = new Date(start);
        setShowCustomPicker(false);
        onRangeChange(formatDateStr(start), formatDateStr(end), "Yesterday");
        break;
      }
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        start = new Date(now.setDate(diff));
        end = new Date();
        setShowCustomPicker(false);
        onRangeChange(formatDateStr(start), formatDateStr(end), "This Week");
        break;
      }
      case "this_month": {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        setShowCustomPicker(false);
        onRangeChange(formatDateStr(start), formatDateStr(end), "This Month");
        break;
      }
      case "last_month": {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        setShowCustomPicker(false);
        onRangeChange(formatDateStr(start), formatDateStr(end), "Last Month");
        break;
      }
      case "financial_year": {
        const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        start = new Date(currentYear, 3, 1); // April 1st
        end = new Date();
        setShowCustomPicker(false);
        onRangeChange(formatDateStr(start), formatDateStr(end), `FY ${currentYear}-${(currentYear + 1).toString().slice(2)}`);
        break;
      }
      case "custom": {
        setShowCustomPicker(true);
        break;
      }
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onRangeChange(customStart, customEnd, "Custom Range");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs space-y-3">
      {/* Preset Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset("today")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "today"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => applyPreset("yesterday")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "yesterday"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            Yesterday
          </button>

          <button
            type="button"
            onClick={() => applyPreset("this_week")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "this_week"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            This Week
          </button>

          <button
            type="button"
            onClick={() => applyPreset("this_month")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "this_month"
                ? "bg-lime-400 text-slate-950 font-extrabold shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            This Month
          </button>

          <button
            type="button"
            onClick={() => applyPreset("last_month")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "last_month"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            Last Month
          </button>

          <button
            type="button"
            onClick={() => applyPreset("financial_year")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "financial_year"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            FY 2026-27
          </button>

          <button
            type="button"
            onClick={() => applyPreset("custom")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "custom"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            Custom Range...
          </button>
        </div>

        {/* Current Active Range Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {startDate} <span className="text-slate-400 font-bold">➔</span> {endDate}
          </span>
        </div>
      </div>

      {/* Custom Date Picker Sub-Bar */}
      {showCustomPicker && (
        <form
          onSubmit={handleApplyCustom}
          className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">From:</span>
            <input
              type="date"
              required
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">To:</span>
            <input
              type="date"
              required
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Filter Results"}
          </button>
        </form>
      )}
    </div>
  );
}
