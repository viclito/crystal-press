"use client";

import React, { useState } from "react";
import { X, Plus, Edit2, Trash2, Check, Tag, Loader2, Palette } from "lucide-react";
import { upsertExpenseCategory, deleteExpenseCategory } from "@/actions/expenses";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

const COLOR_PALETTE = [
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#64748B", // Slate
  "#E11D48", // Rose
  "#84CC16", // Lime
];

interface ExpenseCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{
    id: string;
    name: string;
    color: string | null;
    isActive: boolean;
    _count?: { expenses: number };
  }>;
  onCategoriesUpdated: () => void;
}

export function ExpenseCategoryModal({
  isOpen,
  onClose,
  categories,
  onCategoriesUpdated,
}: ExpenseCategoryModalProps) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setSaving(true);
    try {
      const res = await upsertExpenseCategory({
        name: newCatName.trim(),
        color: newCatColor,
        isActive: true,
      });

      if (res.success) {
        toast.success(`Category "${newCatName.trim()}" created`);
        setNewCatName("");
        onCategoriesUpdated();
      } else {
        toast.error(res.error || "Failed to create category");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (cat: { id: string; name: string; color: string | null }) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || COLOR_PALETTE[0]);
  };

  const handleSaveEdit = async (catId: string) => {
    if (!editName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const res = await upsertExpenseCategory({
        id: catId,
        name: editName.trim(),
        color: editColor,
      });

      if (res.success) {
        toast.success("Category updated successfully");
        setEditingId(null);
        onCategoriesUpdated();
      } else {
        toast.error(res.error || "Failed to update category");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string, expenseCount: number) => {
    const confirmed = await modal.confirm({
      title: `Delete "${catName}" Category?`,
      message:
        expenseCount > 0
          ? `This category has ${expenseCount} logged expense(s). Deleting it will hide it from future selection while keeping historical records intact.`
          : `Are you sure you want to permanently delete "${catName}"?`,
      confirmText: "Delete Category",
      cancelText: "Keep Category",
      type: "danger",
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await deleteExpenseCategory(catId);
      if (res.success) {
        toast.success(`Category "${catName}" removed`);
        onCategoriesUpdated();
      } else {
        toast.error(res.error || "Failed to delete category");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Manage Expense Categories
              </h3>
              <p className="text-xs text-slate-400">
                Categorize print shop petty cash & overhead costs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add New Category Input */}
        <form onSubmit={handleCreateCategory} className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
          <span className="text-xs font-bold text-slate-800 block">Add New Category</span>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Courier & Delivery, Packaging Boxes"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
            <button
              type="submit"
              disabled={saving || !newCatName.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-lime-400" />}
              <span>Add</span>
            </button>
          </div>

          {/* Color Picker Swatches */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <Palette className="w-3 h-3" /> Color:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewCatColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newCatColor === c ? "scale-125 ring-2 ring-slate-900 ring-offset-1" : "hover:scale-110 opacity-80"
                  }`}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Existing Categories List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            Existing Categories ({categories.length})
          </span>

          {categories.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No categories found. Add your first overhead category above.
            </div>
          ) : (
            categories.map((cat) => {
              const isEditing = editingId === cat.id;
              const count = cat._count?.expenses || 0;

              return (
                <div
                  key={cat.id}
                  className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-slate-200 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                      />
                      <div className="flex items-center gap-1">
                        {COLOR_PALETTE.slice(0, 5).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-4 h-4 rounded-full ${
                              editColor === c ? "ring-2 ring-slate-900 scale-110" : "opacity-70"
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        className="p-1.5 bg-lime-300 text-slate-900 rounded-lg hover:bg-lime-400 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color || "#64748B" }}
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {count} recorded expense{count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name, count)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
