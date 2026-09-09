"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Filter, AlertTriangle, Edit3, SlidersHorizontal, Barcode, Boxes, ArrowUpDown, FileSpreadsheet, Download } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { ProductFormModal } from "@/components/inventory/ProductFormModal";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { BulkImportModal } from "@/components/inventory/BulkImportModal";
import { CategoryManagerModal } from "@/components/inventory/CategoryManagerModal";
import { BarcodePrintModal } from "@/components/inventory/BarcodePrintModal";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatCurrency, cn } from "@/lib/utils";

interface InventoryPageClientProps {
  initialProducts: any[];
  categories: any[];
  units: any[];
}

export function InventoryPageClient({
  initialProducts,
  categories,
  units,
}: InventoryPageClientProps) {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter");
  const urlSearch = searchParams.get("search");

  const [search, setSearch] = useState(urlSearch || "");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(urlFilter === "low_stock");

  useEffect(() => {
    if (urlFilter === "low_stock") {
      setFilterLowStockOnly(true);
      setSelectedCategory("ALL");
    }
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlFilter, urlSearch]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any | null>(null);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<any | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  // Computed inventory metrics
  const totalSKUs = initialProducts.length;
  const totalStockCount = initialProducts.reduce((sum, p) => sum + p.currentStock, 0);
  const totalValuation = initialProducts.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
  const lowStockItems = initialProducts.filter((p) => p.currentStock <= p.minStockAlert);

  const filteredProducts = useMemo(() => {
    let list = initialProducts;

    if (filterLowStockOnly) {
      list = list.filter((p) => p.currentStock <= p.minStockAlert);
    }

    if (selectedCategory !== "ALL") {
      list = list.filter((p) => p.subCategory?.category?.id === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.skuCode.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    return list;
  }, [initialProducts, filterLowStockOnly, selectedCategory, search]);

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  return (
    <div className="space-y-6">
      {/* Top Lodgify-style Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Catalog SKUs"
          value={totalSKUs}
          subtitle="Active retail products"
          icon={<Boxes className="w-5 h-5" />}
          iconBg="bg-slate-100 text-slate-800"
          changeText="1,500 SKU capacity"
          changeType="neutral"
        />

        <StatCard
          title="Total Physical Stock"
          value={totalStockCount.toLocaleString()}
          subtitle="Units across all items"
          icon={<Boxes className="w-5 h-5" />}
          iconBg="bg-lime-50 text-lime-800 border border-lime-200/80"
          changeText="In Warehouse"
          changeType="positive"
        />

        <StatCard
          title="Inventory Valuation"
          value={`₹${totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtitle="At wholesale cost price"
          icon={<ArrowUpDown className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
          changeText="Asset Value"
          changeType="neutral"
        />

        <div
          onClick={() => {
            const next = !filterLowStockOnly;
            setFilterLowStockOnly(next);
            if (next) setSelectedCategory("ALL");
          }}
          className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-99 select-none"
          title={filterLowStockOnly ? "Click to view all products" : "Click to view low-stock items"}
        >
          <StatCard
            title="Low-Stock Alerts"
            value={lowStockItems.length}
            subtitle={
              filterLowStockOnly
                ? "Active Filter (Click to show all)"
                : "Below reorder threshold"
            }
            icon={<AlertTriangle className="w-5 h-5" />}
            iconBg={cn(
              "border",
              filterLowStockOnly
                ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                : "bg-rose-50 text-rose-800 border border-rose-200/80"
            )}
            changeText={lowStockItems.length > 0 ? `${lowStockItems.length} Reorder Needed` : "Healthy"}
            changeType={lowStockItems.length > 0 ? "negative" : "positive"}
          />
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 1,500+ items by name, barcode, or SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-lime-400 focus:outline-none shadow-sm"
            />
          </div>

          <button
            onClick={() => {
              const next = !filterLowStockOnly;
              setFilterLowStockOnly(next);
              if (next) setSelectedCategory("ALL");
            }}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
              filterLowStockOnly
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({lowStockItems.length})</span>
          </button>
        </div>

        {/* Action Buttons: Bulk Import & Add Product */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4 text-lime-700" />
            <span>Import Excel / CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsAddOpen(true);
            }}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-extrabold hover:bg-slate-800 shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4 text-lime-400" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Categories Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
            selectedCategory === "ALL"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100"
          )}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              selectedCategory === cat.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100"
            )}
          >
            {cat.name}
          </button>
        ))}

        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-lime-50 hover:bg-lime-100 text-lime-800 transition-all border border-lime-200/80 flex items-center gap-1 ml-auto"
        >
          <Filter className="w-3 h-3" />
          <span>+ Manage Categories</span>
        </button>
      </div>

      {/* Virtualized Table Container with Horizontal Touch Scroll */}
      <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200/80 shadow-xs overflow-x-auto -mx-1 sm:mx-0">
        <div className="min-w-[680px]">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2 border-b border-slate-100">
            <span className="col-span-4">Product / SKU</span>
            <span className="col-span-2">Category</span>
            <span className="col-span-2 text-right">Cost / Sale</span>
            <span className="col-span-2 text-center">Stock Level</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {/* Table Body (Virtualized) */}
          <div ref={parentRef} className="h-[480px] overflow-y-auto custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Boxes className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No items match your filter</p>
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const p = filteredProducts[virtualRow.index];
                const isLow = p.currentStock <= p.minStockAlert;

                return (
                  <div
                    key={p.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="grid grid-cols-12 items-center px-4 py-2 hover:bg-slate-50/80 rounded-2xl transition-colors border-b border-slate-50 text-xs"
                  >
                    {/* Name & SKU */}
                    <div className="col-span-4 pr-2">
                      <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono">{p.skuCode}</span>
                        {p.barcode && <span>• {p.barcode}</span>}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="col-span-2 text-slate-600 truncate">
                      {p.subCategory?.name || "General"}
                    </div>

                    {/* Pricing */}
                    <div className="col-span-2 text-right">
                      <div className="font-bold text-slate-900">₹{p.sellingPrice.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">Cost: ₹{p.costPrice.toFixed(2)}</div>
                    </div>

                    {/* Stock Level */}
                    <div className="col-span-2 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                          isLow ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                        )}
                      >
                        {p.currentStock} {p.unit?.code || "pcs"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        title="Print Barcode Stickers"
                        onClick={() => setBarcodeModalProduct(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <Barcode className="w-4 h-4" />
                      </button>

                      <button
                        title="Spoilage / Stock Adjust"
                        onClick={() => setAdjustingProduct(p)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 rounded-xl hover:bg-amber-50 transition-colors"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>

                      <button
                        title="Edit Product"
                        onClick={() => {
                          setEditingProduct(p);
                          setIsAddOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Add / Edit Product Form Modal */}
      <ProductFormModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
        categories={categories}
        units={units}
      />

      {/* Bulk Excel / CSV Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
      />

      {/* Spoilage & Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
      />

      {/* Barcode Print Modal */}
      {barcodeModalProduct && (
        <BarcodePrintModal
          isOpen={!!barcodeModalProduct}
          onClose={() => setBarcodeModalProduct(null)}
          product={barcodeModalProduct}
        />
      )}
    </div>
  );
}
