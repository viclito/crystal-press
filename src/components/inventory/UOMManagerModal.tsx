"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, CheckCircle2, Ruler, AlertCircle } from "lucide-react";
import { createUnit, deleteUnit } from "@/actions/units";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";

interface UOMManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: any[];
  onUnitCreated?: (newUnit: any) => void;
  onUnitDeleted?: (unitId: string) => void;
}

export function UOMManagerModal({
  isOpen,
  onClose,
  units = [],
  onUnitCreated,
  onUnitDeleted,
}: UOMManagerModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [allowsFraction, setAllowsFraction] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    setIsSubmitting(true);
    setError("");

    const res = await createUnit({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      allowsFraction,
    });

    setIsSubmitting(false);
    if (res.success) {
      toast.success(`Unit "${name.trim()} (${code.trim().toLowerCase()})" created`, "Unit Created");
      if (onUnitCreated && res.unit) {
        onUnitCreated(res.unit);
      }
      setCode("");
      setName("");
      setAllowsFraction(false);
    } else {
      setError(res.error || "Failed to create unit");
      toast.error(res.error || "Failed to create unit");
    }
  };

  const handleDelete = async (unitId: string, unitName: string) => {
    const confirmed = await modal.confirm({
      title: "Delete Unit of Measure?",
      message: `Are you sure you want to delete unit "${unitName}"?`,
      confirmText: "Delete Unit",
      type: "danger",
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");

    const res = await deleteUnit(unitId);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Unit "${unitName}" deleted`, "Unit Deleted");
      if (onUnitDeleted) onUnitDeleted(unitId);
    } else {
      setError(res.error || "Failed to delete unit");
      toast.error(res.error || "Failed to delete unit");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Units of Measure (UOM)</h3>
              <p className="text-xs text-slate-400">Configure packaging and measurement units</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="my-2 p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
          {/* Add New Unit Form */}
          <form onSubmit={handleCreate} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <span className="text-xs font-bold text-slate-900 block">+ Add New Unit (UOM)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Unit Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. bndl / gross"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bundle (100 pcs)"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={allowsFraction}
                  onChange={(e) => setAllowsFraction(e.target.checked)}
                  className="w-4 h-4 rounded text-lime-600 focus:ring-lime-400 border-slate-300"
                />
                <span>Allows Decimal / Fractional Qty (e.g. 1.5 sq_ft)</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting || !code.trim() || !name.trim()}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 flex items-center gap-1 disabled:opacity-40 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-lime-400" />
                <span>Add UOM</span>
              </button>
            </div>
          </form>

          {/* List of Units */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Available Units ({units.length})</span>
            <div className="space-y-1.5">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-slate-100/60 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-900 text-[11px]">
                      {u.code}
                    </span>
                    <span className="font-bold text-slate-800">{u.name}</span>
                    {u.allowsFraction && (
                      <span className="text-[10px] text-slate-400 font-normal">(Fractional)</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(u.id, u.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Unit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
