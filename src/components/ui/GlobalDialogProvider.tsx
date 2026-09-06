"use client";

import React, { useEffect } from "react";
import { useDialogStore } from "@/stores/useDialogStore";
import { AlertTriangle, CheckCircle2, Info, AlertCircle, X } from "lucide-react";

export function GlobalDialogProvider() {
  const { isOpen, options, closeDialog } = useDialogStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog(false);
      } else if (e.key === "Enter" && !options.isConfirm) {
        e.preventDefault();
        closeDialog(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, options.isConfirm, closeDialog]);

  if (!isOpen) return null;

  const isDanger = options.type === "danger";
  const isSuccess = options.type === "success";
  const isWarning = options.type === "warning";

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3.5">
          {/* Icon Badge */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-rose-100 text-rose-700"
                : isSuccess
                ? "bg-lime-100 text-lime-800"
                : isWarning
                ? "bg-amber-100 text-amber-800"
                : "bg-sky-100 text-sky-800"
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isWarning ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-slate-900">{options.title}</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-wrap">
              {options.message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-6 pt-3 border-t border-slate-100 justify-end">
          {options.isConfirm && (
            <button
              type="button"
              onClick={() => closeDialog(false)}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {options.cancelText}
            </button>
          )}

          <button
            type="button"
            autoFocus
            onClick={() => closeDialog(true)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white shadow-md transition-all active:scale-98 ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {options.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
