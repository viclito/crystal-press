import React from "react";
import { cn } from "@/lib/utils";

interface Segment {
  label: string;
  count: number;
  color: string; // Tailwind bg color class e.g. "bg-emerald-400"
  textColor?: string;
}

interface SegmentedMetricBarProps {
  title: string;
  subtitle?: string;
  segments: Segment[];
  className?: string;
}

export function SegmentedMetricBar({ title, subtitle, segments, className }: SegmentedMetricBarProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div
      className={cn(
        "bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_2px_14px_rgba(0,0,0,0.02)] flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
        {subtitle && <span className="text-xs text-slate-400 font-medium">{subtitle}</span>}
      </div>

      {/* Progress Track */}
      <div className="h-4 w-full bg-slate-100 rounded-full flex overflow-hidden gap-1 p-0.5 shadow-inner">
        {segments.map((seg, idx) => {
          const pct = Math.max(0, (seg.count / total) * 100);
          if (pct === 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%` }}
              className={cn("h-full transition-all duration-500 rounded-sm", seg.color, idx === 0 && "rounded-l-full", idx === segments.length - 1 && "rounded-r-full")}
              title={`${seg.label}: ${seg.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Stats Breakdown Grid */}
      <div className={`grid grid-cols-${Math.min(segments.length, 4)} gap-3 mt-6 pt-4 border-t border-slate-50`}>
        {segments.map((seg, idx) => (
          <div key={idx}>
            <div className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", seg.color)} />
              <span className="text-[11px] font-medium text-slate-400 truncate">{seg.label}</span>
            </div>
            <div className={cn("text-xl font-bold mt-1 text-slate-800", seg.textColor)}>
              {seg.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
