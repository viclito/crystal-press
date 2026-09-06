import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  changeText?: string;
  changeType?: "positive" | "negative" | "neutral";
  comparisonText?: string;
  badge?: string;
  badgeColor?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = "bg-lime-50 text-lime-800 border border-lime-200/60",
  changeText,
  changeType = "positive",
  comparisonText,
  badge,
  badgeColor = "bg-slate-100 text-slate-700 border border-slate-200/60",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between group",
        className
      )}
    >
      <div>
        {/* Top Header: Title and Icon Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase line-clamp-1">
            {title}
          </span>
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              iconBg
            )}
          >
            {icon}
          </div>
        </div>

        {/* Value */}
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans mt-1">
          {value}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Footer Pill / Trend Tag */}
      {(changeText || badge) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          {changeText ? (
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-lg border truncate",
                  changeType === "positive" && "bg-emerald-50 text-emerald-800 border-emerald-200/80",
                  changeType === "negative" && "bg-rose-50 text-rose-800 border-rose-200/80",
                  changeType === "neutral" && "bg-slate-50 text-slate-700 border-slate-200/80"
                )}
              >
                {changeType === "positive" && <ArrowUpRight className="w-3 h-3 shrink-0" />}
                {changeType === "negative" && <ArrowDownRight className="w-3 h-3 shrink-0" />}
                {changeType === "neutral" && <Minus className="w-3 h-3 shrink-0" />}
                <span className="truncate">{changeText}</span>
              </span>
              {comparisonText && (
                <span className="text-[10px] text-slate-400 font-medium shrink-0">{comparisonText}</span>
              )}
            </div>
          ) : <div />}

          {badge && (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0",
                badgeColor
              )}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
