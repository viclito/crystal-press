"use client";

import React from "react";
import { useSnackbarStore } from "@/stores/useSnackbarStore";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalSnackbarProvider() {
  const { snackbars, removeSnackbar } = useSnackbarStore();

  if (snackbars.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[120] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {snackbars.map((snack) => {
        const isSuccess = snack.type === "success";
        const isError = snack.type === "error";
        const isWarning = snack.type === "warning";

        return (
          <div
            key={snack.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 duration-300",
              isSuccess && "bg-slate-900/95 text-white border-lime-500/30 shadow-lime-950/20",
              isError && "bg-rose-950/95 text-white border-rose-500/30 shadow-rose-950/20",
              isWarning && "bg-amber-950/95 text-white border-amber-500/30 shadow-amber-950/20",
              !isSuccess && !isError && !isWarning && "bg-slate-900/95 text-white border-slate-700 shadow-slate-950/20"
            )}
          >
            {/* Icon Badge */}
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                isSuccess && "bg-lime-400/20 text-lime-400",
                isError && "bg-rose-400/20 text-rose-400",
                isWarning && "bg-amber-400/20 text-amber-400",
                !isSuccess && !isError && !isWarning && "bg-sky-400/20 text-sky-400"
              )}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isError ? (
                <AlertTriangle className="w-4 h-4" />
              ) : isWarning ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              {snack.title && (
                <h5 className="text-xs font-bold leading-none tracking-tight mb-1 text-white">
                  {snack.title}
                </h5>
              )}
              <p className="text-[11px] text-slate-300 leading-relaxed break-words font-medium">
                {snack.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => removeSnackbar(snack.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
