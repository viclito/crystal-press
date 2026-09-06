"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Layers, AlertCircle } from "lucide-react";
import { createSubCategory, deleteSubCategory, createCategory, deleteCategory } from "@/actions/categories";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";

interface SubCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onSubCategoryCreated?: (newSubCat: any, categoryId: string) => void;
  onSubCategoryDeleted?: (subCatId: string) => void;
  onCategoryDeleted?: (catId: string) => void;
}

export function SubCategoryManagerModal({
  isOpen,
  onClose,
  categories = [],
  onSubCategoryCreated,
  onSubCategoryDeleted,
  onCategoryDeleted,
}: SubCategoryManagerModalProps) {
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id || "");
  const [newSubCatName, setNewSubCatName] = useState("");
  const [newParentCatName, setNewParentCatName] = useState("");
  const [showAddParent, setShowAddParent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCatName.trim() || !selectedCatId) {
      setError("Please select a category and enter sub-category name");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const res = await createSubCategory(selectedCatId, newSubCatName.trim());
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Sub-category "${newSubCatName.trim()}" created`, "Sub-Category Added");
      if (onSubCategoryCreated && res.subCategory) {
        onSubCategoryCreated(res.subCategory, selectedCatId);
      }
      setNewSubCatName("");
    } else {
      setError(res.error || "Failed to create sub-category");
      toast.error(res.error || "Failed to create sub-category");
    }
  };

  const handleCreateParentCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentCatName.trim()) return;

    setIsSubmitting(true);
    setError("");

    const res = await createCategory(newParentCatName.trim());
    setIsSubmitting(false);

    if (res.success && res.category) {
      toast.success(`Category "${newParentCatName.trim()}" created`, "Category Created");
      setSelectedCatId(res.category.id);
      setShowAddParent(false);
      setNewParentCatName("");
    } else {
      setError((res as any).error || "Failed to create category");
      toast.error((res as any).error || "Failed to create category");
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    const confirmed = await modal.confirm({
      title: "Delete Category?",
      message: `Are you sure you want to delete category "${catName}"?`,
      confirmText: "Delete Category",
      type: "danger",
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");

    const res = await deleteCategory(catId);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Category "${catName}" deleted`, "Category Deleted");
      if (onCategoryDeleted) onCategoryDeleted(catId);
    } else {
      setError(res.error || "Failed to delete category");
      toast.error(res.error || "Failed to delete category");
    }
  };

  const handleDeleteSubCategory = async (subId: string, subName: string) => {
    const confirmed = await modal.confirm({
      title: "Delete Sub-Category?",
      message: `Are you sure you want to delete sub-category "${subName}"?`,
      confirmText: "Delete Sub-Category",
      type: "danger",
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");

    const res = await deleteSubCategory(subId);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Sub-category "${subName}" deleted`, "Sub-Category Deleted");
      if (onSubCategoryDeleted) onSubCategoryDeleted(subId);
    } else {
      setError(res.error || "Failed to delete sub-category");
      toast.error(res.error || "Failed to delete sub-category");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Product Categories & Sub-Categories</h3>
              <p className="text-xs text-slate-400">Add or delete categories and sub-categories</p>
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
          {/* Create New Sub-Category Form */}
          <form onSubmit={handleCreateSubCategory} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 block">+ Add New Sub-Category</span>
              <button
                type="button"
                onClick={() => setShowAddParent(!showAddParent)}
                className="text-[11px] font-bold text-lime-700 hover:text-lime-800"
              >
                {showAddParent ? "Select Existing Category" : "+ New Parent Category"}
              </button>
            </div>

            {showAddParent ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newParentCatName}
                  onChange={(e) => setNewParentCatName(e.target.value)}
                  placeholder="New Category Name (e.g. Specialty Boards)..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-lime-400"
                />
                <button
                  type="button"
                  onClick={handleCreateParentCategory}
                  disabled={isSubmitting || !newParentCatName.trim()}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Parent Category *</label>
                  <select
                    value={selectedCatId}
                    onChange={(e) => setSelectedCatId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Sub-Category Name *</label>
                  <input
                    type="text"
                    required
                    value={newSubCatName}
                    onChange={(e) => setNewSubCatName(e.target.value)}
                    placeholder="e.g. Glossy Sticker Sheets"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-400"
                  />
                </div>
              </div>
            )}

            {!showAddParent && (
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !newSubCatName.trim()}
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 flex items-center gap-1 disabled:opacity-40 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-lime-400" />
                  <span>Add Sub-Category</span>
                </button>
              </div>
            )}
          </form>

          {/* List of Existing Categories & Sub-Categories */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Existing Categories & Sub-Categories</span>
            {categories.map((cat) => (
              <div key={cat.id} className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lime-500" />
                    <span className="font-extrabold text-xs text-slate-900">{cat.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({cat.subCategories?.length || 0} sub-categories)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                    title={`Delete Category "${cat.name}"`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Category</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(!cat.subCategories || cat.subCategories.length === 0) ? (
                    <span className="text-[11px] text-slate-400 italic">No sub-categories yet.</span>
                  ) : (
                    cat.subCategories.map((sub: any) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 shadow-2xs"
                      >
                        <span>{sub.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubCategory(sub.id, sub.name)}
                          className="text-slate-400 hover:text-rose-600 ml-0.5 p-0.5 rounded hover:bg-rose-50"
                          title="Delete Sub-Category"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
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
