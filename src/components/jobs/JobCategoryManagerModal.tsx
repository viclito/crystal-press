"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, CheckCircle2, Layers, AlertCircle, Edit2 } from "lucide-react";
import { modal } from "@/stores/useDialogStore";

export interface JobPreset {
  id?: string;
  name: string;
  unit: string;
  defaultQty: number;
  defaultPrice: number;
  specs: {
    size: string;
    paperType: string;
    colors: string;
    finishing: string;
  };
}

interface JobCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: JobPreset[];
  onSavePresets: (newPresets: JobPreset[]) => void;
}

export function JobCategoryManagerModal({
  isOpen,
  onClose,
  presets,
  onSavePresets,
}: JobCategoryManagerModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [defaultQty, setDefaultQty] = useState<number>(100);
  const [defaultPrice, setDefaultPrice] = useState<number>(1000);
  const [size, setSize] = useState("");
  const [paperType, setPaperType] = useState("");
  const [colors, setColors] = useState("4+4 Full Color");
  const [finishing, setFinishing] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a category / preset name");
      return;
    }

    if (presets.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
      setError("A category with this name already exists");
      return;
    }

    const newPreset: JobPreset = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      unit: unit.trim() || "pcs",
      defaultQty: Number(defaultQty) || 1,
      defaultPrice: Number(defaultPrice) || 0,
      specs: {
        size: size.trim() || "Standard",
        paperType: paperType.trim() || "Standard Stock",
        colors: colors.trim() || "Full Color",
        finishing: finishing.trim() || "None",
      },
    };

    const updated = [...presets, newPreset];
    onSavePresets(updated);
    setIsAdding(false);
    setName("");
    setSize("");
    setPaperType("");
    setFinishing("");
    setError("");
  };

  const handleDeletePreset = async (presetName: string) => {
    if (presets.length <= 1) {
      modal.alert("At least one job category must remain.", "Action Restricted");
      return;
    }
    const confirmed = await modal.confirm({
      title: "Delete Job Category?",
      message: `Are you sure you want to delete job preset category "${presetName}"?`,
      confirmText: "Delete Category",
      type: "danger",
    });
    if (!confirmed) return;

    const updated = presets.filter((p) => p.name !== presetName);
    onSavePresets(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Job Categories & Presets</h3>
              <p className="text-xs text-slate-400">Add or delete custom printing work order categories</p>
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
          {/* List of Existing Categories */}
          {!isAdding ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Active Categories ({presets.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(true);
                    setError("");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-lime-400" />
                  <span>+ Add New Category</span>
                </button>
              </div>

              <div className="space-y-2">
                {presets.map((p) => (
                  <div
                    key={p.name}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-slate-100/60 transition-colors text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Default: {p.defaultQty} {p.unit} • ₹{p.defaultPrice} • {p.specs.paperType || p.specs.size}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePreset(p.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Add New Category Form */
            <form onSubmit={handleAddPreset} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-xs font-bold text-slate-900">+ Add New Job Category</span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Back to List
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category / Preset Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Brochures & Pamphlets / ID Cards"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-lime-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={defaultQty}
                    onChange={(e) => setDefaultQty(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pcs / cards / sets"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Size</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. A4 Tri-Fold / 3.5x2 in"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Paper / GSM</label>
                  <input
                    type="text"
                    value={paperType}
                    onChange={(e) => setPaperType(e.target.value)}
                    placeholder="e.g. 170 GSM Art Gloss"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Colors</label>
                  <input
                    type="text"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder="e.g. 4+4 Both Sides"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Finishing</label>
                  <input
                    type="text"
                    value={finishing}
                    onChange={(e) => setFinishing(e.target.value)}
                    placeholder="e.g. Creased & Folded"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          )}
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
