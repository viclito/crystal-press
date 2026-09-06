"use client";

import React, { useState } from "react";
import { X, Check, SlidersHorizontal, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { adjustStock } from "@/actions/products";
import { StockAdjustmentType } from "@prisma/client";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

export function StockAdjustmentModal({ isOpen, onClose, product }: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>(StockAdjustmentType.PRINT_SPOILAGE);
  const [quantity, setQuantity] = useState<number>(1);
  const [reasonNotes, setReasonNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const currentStock = Number(product.currentStock) || 0;
  const isDeduction =
    adjustmentType === StockAdjustmentType.PRINT_SPOILAGE ||
    adjustmentType === StockAdjustmentType.DAMAGE_WASTAGE;

  const quantityDelta = isDeduction ? -Math.abs(quantity) : Math.abs(quantity);
  const calculatedNewStock = Math.max(0, currentStock + quantityDelta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    setIsSubmitting(true);
    const res = await adjustStock({
      productId: product.id,
      adjustmentType,
      quantityDelta,
      reasonNotes,
    });

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        `Stock for "${product.name}" adjusted by ${quantityDelta > 0 ? "+" : ""}${quantityDelta}`,
        "Stock Adjusted"
      );
      onClose();
    } else {
      modal.error(res.error || "Failed to adjust stock");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Stock Spoilage & Adjustment</h3>
            <p className="text-xs text-slate-400 truncate max-w-[280px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">Current Recorded Stock:</span>
            <span className="font-bold text-slate-900">{currentStock} {product.unit?.code || "pcs"}</span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Reason / Type</label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400"
            >
              <option value="PRINT_SPOILAGE">Print Spoilage / Machine Jam (-)</option>
              <option value="DAMAGE_WASTAGE">Damaged / Shelf Wastage (-)</option>
              <option value="PURCHASE_RESTOCK">Manual Restock / Arrival (+)</option>
              <option value="MANUAL_CORRECTION">Stock Count Correction</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Quantity to {isDeduction ? "Deduct" : "Add"}
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Description</label>
            <textarea
              rows={2}
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
              placeholder="e.g. 5 sheets damaged during offset test print"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-lime-400 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-lime-50 rounded-2xl border border-lime-200/60 flex items-center justify-between text-xs text-lime-900">
            <span className="font-semibold">New Resulting Stock:</span>
            <span className="text-sm font-black">{calculatedNewStock} {product.unit?.code || "pcs"}</span>
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
              <span>{isSubmitting ? "Adjusting..." : "Record Adjustment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
