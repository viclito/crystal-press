"use client";

import React from "react";
import { Plus, Minus, RotateCcw, Coins, Banknote } from "lucide-react";

export interface DenominationItem {
  value: number;
  label: string;
  type: "note" | "coin";
  colorBadge: string;
}

export const INDIAN_DENOMINATIONS: DenominationItem[] = [
  { value: 500, label: "₹500", type: "note", colorBadge: "bg-stone-100 text-stone-800 border-stone-300" },
  { value: 200, label: "₹200", type: "note", colorBadge: "bg-amber-100 text-amber-900 border-amber-300" },
  { value: 100, label: "₹100", type: "note", colorBadge: "bg-sky-100 text-sky-900 border-sky-300" },
  { value: 50, label: "₹50", type: "note", colorBadge: "bg-cyan-100 text-cyan-900 border-cyan-300" },
  { value: 20, label: "₹20", type: "note", colorBadge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { value: 10, label: "₹10", type: "note", colorBadge: "bg-amber-50 text-amber-950 border-amber-200" },
  { value: 5, label: "₹5 (Coins)", type: "coin", colorBadge: "bg-slate-100 text-slate-800 border-slate-300" },
  { value: 2, label: "₹2 (Coins)", type: "coin", colorBadge: "bg-slate-100 text-slate-800 border-slate-300" },
  { value: 1, label: "₹1 (Coins)", type: "coin", colorBadge: "bg-slate-100 text-slate-800 border-slate-300" },
];

interface DenominationCounterProps {
  counts: Record<string, number>;
  onChange: (counts: Record<string, number>, total: number) => void;
  disabled?: boolean;
}

export function DenominationCounter({
  counts,
  onChange,
  disabled = false,
}: DenominationCounterProps) {
  const calculateTotal = (updatedCounts: Record<string, number>) => {
    return INDIAN_DENOMINATIONS.reduce((acc, item) => {
      const count = updatedCounts[String(item.value)] || 0;
      return acc + count * item.value;
    }, 0);
  };

  const handleCountChange = (value: number, rawCount: number) => {
    const validCount = Math.max(0, Math.floor(rawCount || 0));
    const updated = {
      ...counts,
      [String(value)]: validCount,
    };
    const total = calculateTotal(updated);
    onChange(updated, total);
  };

  const handleClearAll = () => {
    const cleared: Record<string, number> = {};
    INDIAN_DENOMINATIONS.forEach((d) => {
      cleared[String(d.value)] = 0;
    });
    onChange(cleared, 0);
  };

  const currentTotal = calculateTotal(counts);

  return (
    <div className="space-y-3">
      {/* Header & Quick Clear */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">
            Physical Cash Denominations
          </span>
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          disabled={disabled || currentTotal === 0}
          className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 disabled:opacity-40 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear All</span>
        </button>
      </div>

      {/* Denominations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {INDIAN_DENOMINATIONS.map((d) => {
          const key = String(d.value);
          const count = counts[key] || 0;
          const subtotal = count * d.value;

          return (
            <div
              key={d.value}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                count > 0
                  ? "bg-white border-emerald-300 shadow-2xs"
                  : "bg-slate-50/70 border-slate-200/70 hover:bg-slate-50"
              }`}
            >
              {/* Badge & Value */}
              <div className="flex items-center gap-2 min-w-[75px]">
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-md border shadow-2xs ${d.colorBadge}`}
                >
                  {d.label}
                </span>
              </div>

              {/* Stepper Input */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCountChange(d.value, count - 1)}
                  disabled={disabled || count <= 0}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 flex items-center justify-center text-xs font-bold transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <input
                  type="number"
                  min="0"
                  value={count === 0 ? "" : count}
                  placeholder="0"
                  onChange={(e) =>
                    handleCountChange(d.value, parseInt(e.target.value) || 0)
                  }
                  disabled={disabled}
                  className="w-12 text-center py-0.5 px-1 rounded-md border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />

                <button
                  type="button"
                  onClick={() => handleCountChange(d.value, count + 1)}
                  disabled={disabled}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 flex items-center justify-center text-xs font-bold transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Line Subtotal */}
              <div className="text-right min-w-[70px]">
                <span className="text-xs font-mono font-bold text-slate-800">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Banner */}
      <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
          <Coins className="w-4 h-4 text-emerald-600" />
          <span>Total Physical Cash Counted:</span>
        </div>
        <div className="text-base font-black font-mono text-emerald-900">
          ₹{currentTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}
