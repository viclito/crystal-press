"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  AlertCircle,
  LayoutGrid,
  List,
  Plus,
  Minus,
  Sparkles,
  CheckCircle2,
  Package,
  Layers,
  Zap,
} from "lucide-react";
import { usePOSStore } from "@/stores/usePOSStore";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatCurrency, cn } from "@/lib/utils";
import { playScannerBeep } from "@/hooks/useBarcodeScanner";
import { toast } from "@/stores/useSnackbarStore";

interface Product {
  id: string;
  name: string;
  skuCode: string;
  barcode?: string | null;
  sellingPrice: number | string;
  costPrice?: number | string;
  currentStock: number | string;
  minStockAlert?: number | string;
  taxPercent?: number | string;
  subCategory?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
    };
  };
}

interface VirtualizedProductGridProps {
  products: Product[];
  categories?: Array<{ id: string; name: string }>;
}

const CATEGORY_STYLES: Record<
  string,
  {
    border: string;
    bg: string;
    badge: string;
    dot: string;
  }
> = {
  "Paper & Boards": {
    border: "border-amber-300 hover:border-amber-400",
    bg: "bg-amber-50/20",
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
  },
  "Stationery & Writing": {
    border: "border-blue-300 hover:border-blue-400",
    bg: "bg-blue-50/20",
    badge: "bg-blue-100 text-blue-900 border-blue-200",
    dot: "bg-blue-500",
  },
  "Printing Consumables": {
    border: "border-purple-300 hover:border-purple-400",
    bg: "bg-purple-50/20",
    badge: "bg-purple-100 text-purple-900 border-purple-200",
    dot: "bg-purple-500",
  },
  "Office Tools & Adhesives": {
    border: "border-emerald-300 hover:border-emerald-400",
    bg: "bg-emerald-50/20",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

function getCategoryStyle(catName?: string) {
  if (!catName) {
    return {
      border: "border-slate-200 hover:border-slate-300",
      bg: "bg-white",
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
    };
  }
  return (
    CATEGORY_STYLES[catName] || {
      border: "border-slate-200 hover:border-slate-300",
      bg: "bg-white",
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
    }
  );
}

export function VirtualizedProductGrid({
  products = [],
  categories = [],
}: VirtualizedProductGridProps) {
  const { addItem, updateQuantity, items } = usePOSStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showQuickBar, setShowQuickBar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    let list = products;

    if (selectedCategory !== "ALL") {
      list = list.filter((p) => p.subCategory?.category?.id === selectedCategory);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.skuCode.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    return list;
  }, [products, selectedCategory, searchTerm]);

  // Frequently Billed / Fast-Moving Items (first 6 items or popular stationery)
  const quickItems = useMemo(() => {
    return products.slice(0, 6);
  }, [products]);

  // Helper to check in-cart quantity
  const getInCartInfo = (product: Product) => {
    const idx = items.findIndex(
      (i) => i.productId === product.id || i.skuCode === product.skuCode
    );
    if (idx >= 0) {
      return { inCart: true, qty: items[idx].quantity, cartIndex: idx };
    }
    return { inCart: false, qty: 0, cartIndex: -1 };
  };

  // Add Item with audio beep
  const handleAddProduct = (product: Product, qty = 1) => {
    addItem(product, qty);
    playScannerBeep();
  };

  // Handle Enter key in search to immediately add top result
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        handleAddProduct(filteredProducts[0], 1);
        toast.success(`Added "${filteredProducts[0].name}" to bill`);
        setSearchTerm("");
      }
    }
  };

  // Virtualizer calculations
  const columnCount = viewMode === "grid" ? (isMobile ? 2 : 3) : 1;
  const rowCount = Math.ceil(filteredProducts.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === "grid" ? (isMobile ? 150 : 140) : 54),
    overscan: 4,
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-100/90 shadow-[0_2px_14px_rgba(0,0,0,0.02)] select-none">
      {/* 1. Header: Enhanced Search & View Toggle */}
      <div className="shrink-0 space-y-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by name, SKU, or scan barcode... (Press Enter to add first match)"
              data-scanner-capture="true"
              className="w-full pl-10 pr-20 py-2 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white transition-all shadow-xs"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-200/80 hover:bg-slate-300 px-2 py-0.5 rounded-lg transition-colors"
              >
                Clear
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-bold bg-slate-200/50 px-1.5 py-0.5 rounded">
                F2
              </span>
            )}
          </div>

          {/* Grid / List View Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/60 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              title="Touch Grid View"
              className={cn(
                "p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold",
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-400 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Grid</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Fast Compact List View"
              className={cn(
                "p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold",
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-400 hover:text-slate-700"
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">List</span>
            </button>
          </div>
        </div>

        {/* 2. Fast-Moving / Quick-Pick Favorites Bar */}
        {showQuickBar && quickItems.length > 0 && !searchTerm && selectedCategory === "ALL" && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-1">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-400" />
              Quick:
            </span>
            {quickItems.map((item) => {
              const { inCart, qty } = getInCartInfo(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleAddProduct(item, 1)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 shrink-0 active:scale-95",
                    inCart
                      ? "bg-lime-50 border-lime-400 text-lime-950 shadow-xs ring-1 ring-lime-400/40"
                      : "bg-slate-50 hover:bg-white border-slate-200/80 text-slate-700 hover:border-slate-300"
                  )}
                >
                  <span className="truncate max-w-[120px]">{item.name}</span>
                  <span className="text-[10px] font-extrabold text-slate-900 bg-white px-1 rounded">
                    ₹{Number(item.sellingPrice).toFixed(0)}
                  </span>
                  {inCart && (
                    <span className="w-4 h-4 rounded-full bg-lime-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                      {qty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5",
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            )}
          >
            <span>All Products</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                selectedCategory === "ALL" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
              )}
            >
              {products.length}
            </span>
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const style = getCategoryStyle(cat.name);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5",
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", style.dot)} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Product Display Area (Takes Remaining Height) */}
      <div ref={parentRef} className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-800">No products found</p>
            <p className="text-xs text-slate-400 mt-1">
              No items match &quot;{searchTerm}&quot;. Try another name, SKU or barcode.
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ================= GRID VIEW ================= */
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * columnCount;
              const rowItems = filteredProducts.slice(startIndex, startIndex + columnCount);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={cn("grid gap-2 sm:gap-3 py-1.5", isMobile ? "grid-cols-2" : "grid-cols-3")}
                >
                  {rowItems.map((p) => {
                    const stock = Number(p.currentStock) || 0;
                    const minStock = Number(p.minStockAlert) || 10;
                    const isLowStock = stock <= minStock;
                    const { inCart, qty, cartIndex } = getInCartInfo(p);
                    const catName = p.subCategory?.category?.name;
                    const catStyle = getCategoryStyle(catName);

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "h-full rounded-2xl p-3 border transition-all duration-150 flex flex-col justify-between group shadow-xs select-none relative overflow-hidden",
                          inCart
                            ? "bg-lime-50/50 border-lime-400 ring-2 ring-lime-400/40 shadow-sm"
                            : cn(
                                "bg-white hover:bg-slate-50/50 hover:shadow-md",
                                catStyle.border
                              )
                        )}
                      >
                        {/* Top Meta Bar */}
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase truncate">
                              {p.skuCode}
                            </span>
                            {inCart ? (
                              <span className="text-[10px] font-black text-lime-900 bg-lime-200/90 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-lime-700" />
                                {qty} in cart
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md">
                                Low Stock
                              </span>
                            ) : null}
                          </div>

                          {/* Product Title */}
                          <h4
                            onClick={() => handleAddProduct(p, 1)}
                            className="text-xs font-black text-slate-900 line-clamp-2 leading-tight cursor-pointer hover:text-lime-700 transition-colors"
                            title={p.name}
                          >
                            {p.name}
                          </h4>
                        </div>

                        {/* Bottom Row: Price & Controls */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">
                              {formatCurrency(p.sellingPrice)}
                            </div>
                            <div className="text-[9.5px] font-semibold text-slate-400">
                              {stock} in stock
                            </div>
                          </div>

                          {/* Action Button: Tap to Add or In-Cart Stepper */}
                          {inCart ? (
                            <div className="flex items-center border border-lime-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                              <button
                                onClick={() => updateQuantity(cartIndex, qty - 1)}
                                title="Decrease quantity"
                                className="px-2 py-1 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-black text-xs text-lime-950">
                                {qty}
                              </span>
                              <button
                                onClick={() => updateQuantity(cartIndex, qty + 1)}
                                title="Increase quantity"
                                className="px-2 py-1 text-slate-700 hover:bg-lime-100 hover:text-lime-800 transition-colors active:scale-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddProduct(p, 1)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs flex items-center gap-1 group-hover:bg-lime-500 group-hover:text-slate-950"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= LIST VIEW ================= */
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const p = filteredProducts[virtualRow.index];
              if (!p) return null;

              const stock = Number(p.currentStock) || 0;
              const minStock = Number(p.minStockAlert) || 10;
              const isLowStock = stock <= minStock;
              const { inCart, qty, cartIndex } = getInCartInfo(p);
              const catName = p.subCategory?.category?.name;
              const catStyle = getCategoryStyle(catName);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="py-1"
                >
                  <div
                    className={cn(
                      "h-full px-3 py-1.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs",
                      inCart
                        ? "bg-lime-50/70 border-lime-400 ring-1 ring-lime-400/40"
                        : "bg-white hover:bg-slate-50 border-slate-200/80"
                    )}
                  >
                    {/* Left: SKU & Title */}
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        {p.skuCode}
                      </span>
                      <div
                        onClick={() => handleAddProduct(p, 1)}
                        className="font-bold text-slate-900 truncate hover:text-lime-700 cursor-pointer flex-1"
                      >
                        {p.name}
                      </div>
                      {catName && (
                        <span
                          className={cn(
                            "text-[9.5px] font-bold px-1.5 py-0.2 rounded-md border hidden md:inline-block",
                            catStyle.badge
                          )}
                        >
                          {catName}
                        </span>
                      )}
                    </div>

                    {/* Stock & Price */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "text-[10.5px] font-semibold px-1.5 py-0.5 rounded",
                          isLowStock ? "bg-rose-50 text-rose-700 font-bold" : "text-slate-500"
                        )}
                      >
                        {stock} in stock
                      </span>

                      <span className="font-extrabold text-slate-900 w-16 text-right">
                        {formatCurrency(p.sellingPrice)}
                      </span>

                      {/* Add Button or In-Cart Stepper */}
                      {inCart ? (
                        <div className="flex items-center border border-lime-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                          <button
                            onClick={() => updateQuantity(cartIndex, qty - 1)}
                            className="px-1.5 py-0.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-black text-xs text-lime-950">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(cartIndex, qty + 1)}
                            className="px-1.5 py-0.5 text-slate-700 hover:bg-lime-100 hover:text-lime-800 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddProduct(p, 1)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-lime-500 hover:text-slate-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
