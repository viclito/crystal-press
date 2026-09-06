"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, CheckCircle2, Folders, AlertCircle, ChevronRight } from "lucide-react";
import { createCategory, deleteCategory, createSubCategory, deleteSubCategory } from "@/actions/categories";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
}

export function CategoryManagerModal({ isOpen, onClose, categories = [] }: CategoryManagerModalProps) {
  const [newCatName, setNewCatName] = useState("");
  const [activeCatForSub, setActiveCatForSub] = useState<string | null>(null);
  const [newSubCatName, setNewSubCatName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    setError("");

    const res = await createCategory(newCatName.trim());
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Category "${newCatName.trim()}" created successfully`, "Category Created");
      setNewCatName("");
    } else {
      setError(res.error || "Failed to create category");
      toast.error(res.error || "Failed to create category");
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    const confirmed = await modal.confirm({
      title: "Delete Category?",
      message: `Are you sure you want to delete category "${catName}"? Products inside must be reassigned first.`,
      confirmText: "Delete Category",
      type: "danger",
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");

    const res = await deleteCategory(catId);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Category "${catName}" deleted`, "Category Removed");
    } else {
      setError(res.error || "Failed to delete category");
      toast.error(res.error || "Failed to delete category");
    }
  };

  const handleAddSubCategory = async (catId: string) => {
    if (!newSubCatName.trim()) return;

    setIsSubmitting(true);
    setError("");

    const res = await createSubCategory(catId, newSubCatName.trim());
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Sub-category "${newSubCatName.trim()}" created`, "Sub-Category Created");
      setNewSubCatName("");
      setActiveCatForSub(null);
    } else {
      setError(res.error || "Failed to create subcategory");
      toast.error(res.error || "Failed to create subcategory");
    }
  };

  const handleDeleteSubCategory = async (subId: string, subName: string) => {
    const confirmed = await modal.confirm({
      title: "Delete Sub-Category?",
      message: `Are you sure you want to delete subcategory "${subName}"?`,
      confirmText: "Delete Sub-Category",
      type: "danger",
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");

    const res = await deleteSubCategory(subId);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Sub-category "${subName}" deleted`, "Sub-Category Removed");
    } else {
      setError(res.error || "Failed to delete subcategory");
      toast.error(res.error || "Failed to delete subcategory");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <Folders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Product Categories</h3>
              <p className="text-xs text-slate-400">Organize your 1,500+ stationery and printing inventory</p>
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
          {/* Add New Category Input */}
          <form onSubmit={handleAddCategory} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex gap-2">
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Enter new Category Name (e.g. Spiral Binding Supplies)"
              className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCatName.trim()}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 flex items-center gap-1 shrink-0 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5 text-lime-400" />
              <span>Add Category</span>
            </button>
          </form>

          {/* List of Categories with SubCategories */}
          <div className="space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lime-500" />
                    <span className="font-extrabold text-xs text-slate-900">{cat.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({cat.subCategories?.length || 0} sub-categories)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveCatForSub(activeCatForSub === cat.id ? null : cat.id)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-lime-600" />
                      <span>Sub-category</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategory Pills */}
                {cat.subCategories && cat.subCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 pl-4">
                    {cat.subCategories.map((sub: any) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200/80 rounded-xl text-[11px] font-semibold text-slate-700"
                      >
                        <span>{sub.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubCategory(sub.id, sub.name)}
                          className="text-slate-400 hover:text-rose-600 ml-0.5"
                          title="Delete Sub-category"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Subcategory Inline Input */}
                {activeCatForSub === cat.id && (
                  <div className="flex gap-2 pl-4 pt-1">
                    <input
                      type="text"
                      value={newSubCatName}
                      onChange={(e) => setNewSubCatName(e.target.value)}
                      placeholder={`New subcategory under ${cat.name}...`}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-lime-400"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting || !newSubCatName.trim()}
                      onClick={() => handleAddSubCategory(cat.id)}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
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
