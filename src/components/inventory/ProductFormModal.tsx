"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Barcode, Plus, Settings2 } from "lucide-react";
import { upsertProduct } from "@/actions/products";
import { SubCategoryManagerModal } from "./SubCategoryManagerModal";
import { UOMManagerModal } from "./UOMManagerModal";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";
import { SearchableSelect, SearchableOption } from "@/components/ui/SearchableSelect";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: any | null;
  categories: any[];
  units: any[];
}

export function ProductFormModal({
  isOpen,
  onClose,
  productToEdit,
  categories = [],
  units = [],
}: ProductFormModalProps) {
  const [name, setName] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(10);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals for SubCategory & UOM management
  const [isSubCatModalOpen, setIsSubCatModalOpen] = useState(false);
  const [isUOMModalOpen, setIsUOMModalOpen] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setSkuCode(productToEdit.skuCode || "");
      setBarcode(productToEdit.barcode || "");
      setSubCategoryId(productToEdit.subCategoryId || "");
      setUnitId(productToEdit.unitId || "");
      setCostPrice(Number(productToEdit.costPrice) || 0);
      setSellingPrice(Number(productToEdit.sellingPrice) || 0);
      setCurrentStock(Number(productToEdit.currentStock) || 0);
      setMinStockAlert(Number(productToEdit.minStockAlert) || 10);
      setTaxPercent(Number(productToEdit.taxPercent) || 0);
    } else {
      // Auto-generate random SKU
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setSkuCode(`CP-${randomSuffix}`);
      setBarcode(`89012345${randomSuffix}`);
      setName("");
      setCostPrice(0);
      setSellingPrice(0);
      setCurrentStock(50);
      setMinStockAlert(10);
      if (categories[0]?.subCategories?.[0]) {
        setSubCategoryId(categories[0].subCategories[0].id);
      }
      if (units[0]) {
        setUnitId(units[0].id);
      }
    }
  }, [productToEdit, isOpen, categories, units]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !skuCode.trim() || !subCategoryId || !unitId || sellingPrice <= 0) {
      modal.alert("Please fill in all required product fields and ensure selling price is greater than ₹0.", "Incomplete Product Form");
      return;
    }

    setIsSubmitting(true);
    const res = await upsertProduct({
      id: productToEdit?.id,
      name,
      skuCode,
      barcode: barcode || null,
      subCategoryId,
      unitId,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      currentStock: Number(currentStock),
      minStockAlert: Number(minStockAlert),
      taxPercent: Number(taxPercent),
    });

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        productToEdit ? `Updated "${name}" successfully` : `Added "${name}" to product catalog`,
        productToEdit ? "Product Updated" : "Product Created"
      );
      onClose();
    } else {
      modal.error(res.error || "Failed to save product");
    }
  };

  const subCategoryOptions: SearchableOption[] = categories.flatMap((cat) =>
    (cat.subCategories || []).map((sub: any) => ({
      value: sub.id,
      label: sub.name,
      subLabel: `Category: ${cat.name}`,
      badge: cat.name,
    }))
  );

  const unitOptions: SearchableOption[] = units.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
    subLabel: `Packaging Unit: ${u.code}`,
    badge: u.code,
  }));

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {productToEdit ? "Edit Product" : "Add New SKU Product"}
              </h3>
              <p className="text-xs text-slate-400">Manage 1,500+ product catalog</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 my-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Product Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. JK Copier Paper 75 GSM - A4 Ream"
                className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">SKU Code *</label>
                <input
                  type="text"
                  required
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder="e.g. PAP-JK-75A4"
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Barcode (EAN/Code128)</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 890123450001"
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Sub-Category with Searchable Select */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Sub-Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsSubCatModalOpen(true)}
                    className="text-[11px] font-bold text-lime-700 hover:text-lime-800 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Manage / Add</span>
                  </button>
                </div>
                <SearchableSelect
                  options={subCategoryOptions}
                  value={subCategoryId}
                  onChange={(val) => setSubCategoryId(val)}
                  placeholder="-- Type or choose SubCategory --"
                  searchPlaceholder="Search category or subcategory..."
                />
              </div>

              {/* UOM with Searchable Select */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Unit of Measure (UOM) *</label>
                  <button
                    type="button"
                    onClick={() => setIsUOMModalOpen(true)}
                    className="text-[11px] font-bold text-lime-700 hover:text-lime-800 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Manage / Add</span>
                  </button>
                </div>
                <SearchableSelect
                  options={unitOptions}
                  value={unitId}
                  onChange={(val) => setUnitId(val)}
                  placeholder="-- Type or choose Unit --"
                  searchPlaceholder="Search unit (pcs, ream, box)..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700">Cost Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Selling Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-lime-300 rounded-lg text-xs font-bold text-lime-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Current Stock</label>
                <input
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Low Stock Alert</label>
                <input
                  type="number"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-700"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-lime-400" />
                <span>{isSubmitting ? "Saving..." : "Save Product"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SubCategory Manager Modal */}
      <SubCategoryManagerModal
        isOpen={isSubCatModalOpen}
        onClose={() => setIsSubCatModalOpen(false)}
        categories={categories}
        onSubCategoryCreated={(newSub) => {
          setSubCategoryId(newSub.id);
        }}
      />

      {/* UOM Manager Modal */}
      <UOMManagerModal
        isOpen={isUOMModalOpen}
        onClose={() => setIsUOMModalOpen(false)}
        units={units}
        onUnitCreated={(newUnit) => {
          setUnitId(newUnit.id);
        }}
      />
    </>
  );
}
