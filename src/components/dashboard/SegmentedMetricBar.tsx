import React from "react";
import { cn } from "@/lib/utils";

export function StockAvailabilityBar({
  inStock = 0,
  lowStock = 0,
  outOfStock = 0,
}: {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}) {
  const total = inStock + lowStock + outOfStock || 1;
  const inStockPct = (inStock / total) * 100;
  const lowStockPct = (lowStock / total) * 100;
  const outOfStockPct = (outOfStock / total) * 100;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_2px_14px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Inventory Status</h3>
          <p className="text-xs text-slate-400">Physical stock across active varieties</p>
        </div>
        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full">
          {total} Total SKUs
        </span>
      </div>

      {/* Progress segmented track */}
      <div className="h-4 w-full bg-slate-100 rounded-full flex overflow-hidden gap-1 p-0.5 shadow-inner">
        <div
          style={{ width: `${inStockPct}%` }}
          className="bg-emerald-400 rounded-l-full h-full transition-all duration-500"
          title={`In Stock: ${inStock}`}
        />
        <div
          style={{ width: `${lowStockPct}%` }}
          className="bg-amber-300 h-full transition-all duration-500"
          title={`Low Stock: ${lowStock}`}
        />
        <div
          style={{ width: `${outOfStockPct}%` }}
          className="bg-rose-400 rounded-r-full h-full transition-all duration-500"
          title={`Out of Stock: ${outOfStock}`}
        />
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-50">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-400 font-semibold uppercase">In Stock</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{inStock}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Low Stock</span>
          </div>
          <div className="text-xl font-extrabold text-amber-700 mt-1">{lowStock}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Out of Stock</span>
          </div>
          <div className="text-xl font-extrabold text-slate-400 mt-1">{outOfStock}</div>
        </div>
      </div>
    </div>
  );
}
