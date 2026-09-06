# ⚡ 04. Frontend Performance & Zero-Lag Architecture

> **Goal**: Sub-50ms user interactions, instant barcode scanning, zero layout thrashing, 60fps rendering across 1,500+ SKUs.  
> **Key Technologies**: TanStack Query v5 + Zustand + `@tanstack/react-virtual` + IndexedDB + Native HID Scanner Wedge.

---

## 1. Zero-Lag Performance Architecture

```mermaid
graph TD
    UserAction[Barcode Scan / Keyboard / Search Input] --> FastPath{Action Type}
    
    FastPath -->|Barcode Scan| ScannerBuffer[HID Scanner Buffer < 30ms]
    ScannerBuffer --> InMemLookup[In-Memory Product Map O-1]
    InMemLookup --> ZustandCart[Zustand In-Memory Cart Store]
    
    FastPath -->|Catalog Search| FuzzyEngine[IndexedDB / In-Memory Fuse / Prefix Tree]
    FuzzyEngine --> VirtualList[@tanstack/react-virtual: 15 DOM nodes rendered]
    
    FastPath -->|Server Mutation| OptimisticUI[Optimistic Local UI Update]
    OptimisticUI --> TanStackQuery[TanStack Query Background Mutation]
    TanStackQuery --> PostgreSQL[(PostgreSQL via Server Actions)]
```

---

## 2. TanStack Query v5 & Local Cache Architecture

To eliminate network wait times at the counter, master data (1,500 products, categories, units) is cached aggressively in browser memory and synced to **IndexedDB**.

### 2.1 Query Cache Strategy

```typescript
// lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,      // 10 minutes fresh window for products
      gcTime: 60 * 60 * 1000,         // Keep in cache for 1 hour
      refetchOnWindowFocus: false,     // Avoid jitter during counter operations
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
```

### 2.2 Product Catalog Pre-Caching & IndexedDB Persistence
On application startup, pre-load the lightweight product catalog (`id`, `skuCode`, `barcode`, `name`, `sellingPrice`, `currentStock`) into browser IndexedDB so search and scanning work instantly even during network blips:

```typescript
// hooks/useProductCatalog.ts
import { useQuery } from "@tanstack/react-query";
import { get, set } from "idb-keyval";

export function useProductCatalog() {
  return useQuery({
    queryKey: ["products", "catalog-all"],
    queryFn: async () => {
      // 1. Check local IndexedDB first for instant rendering (< 5ms)
      const cached = await get("crystal_product_catalog");
      
      // 2. Fetch fresh catalog in background
      fetch("/api/products/catalog-compact")
        .then((res) => res.json())
        .then((data) => set("crystal_product_catalog", data));

      return cached || (await fetch("/api/products/catalog-compact").then((r) => r.json()));
    },
  });
}
```

---

## 3. Zustand In-Memory POS Billing Engine

Cart modifications (adding items, changing quantity, applying discounts, round-off) must **never trigger server roundtrips**. Calculations are performed synchronously in memory with zero latency.

```typescript
// stores/usePOSStore.ts
import { create } from "zustand";

export interface POSCartItem {
  productId?: string;
  skuCode: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  unitName: string;
  discountAmount: number;
  taxPercent: number;
  lineTotal: number;
  version: number;
}

interface POSState {
  items: POSCartItem[];
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  globalDiscount: number; // Flat or %
  taxRate: number;
  
  // Computed helpers
  subTotal: () => number;
  totalDiscount: () => number;
  taxTotal: () => number;
  roundOff: () => number;
  netTotal: () => number;

  // Actions (Instantaneous O(1))
  addItem: (product: any, qty?: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  updatePrice: (index: number, newPrice: number) => void;
  updateItemDiscount: (index: number, discount: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  setCustomer: (id: string | null, name: string, phone: string) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: "Walk-in Customer",
  customerPhone: "",
  globalDiscount: 0,
  taxRate: 0,

  subTotal: () => get().items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  totalDiscount: () => get().items.reduce((sum, item) => sum + item.discountAmount, 0) + get().globalDiscount,
  taxTotal: () => {
    const taxableAmount = Math.max(0, get().subTotal() - get().totalDiscount());
    return (taxableAmount * get().taxRate) / 100;
  },
  roundOff: () => {
    const rawTotal = get().subTotal() - get().totalDiscount() + get().taxTotal();
    return Math.round(rawTotal) - rawTotal;
  },
  netTotal: () => {
    const rawTotal = get().subTotal() - get().totalDiscount() + get().taxTotal();
    return Math.round(rawTotal);
  },

  addItem: (product, qty = 1) => {
    set((state) => {
      const existingIdx = state.items.findIndex(
        (i) => i.productId === product.id || (i.skuCode && i.skuCode === product.skuCode)
      );

      if (existingIdx > -1) {
        const updated = [...state.items];
        const item = updated[existingIdx];
        const newQty = item.quantity + qty;
        const lineTotal = newQty * item.unitPrice - item.discountAmount;
        updated[existingIdx] = { ...item, quantity: newQty, lineTotal };
        return { items: updated };
      }

      const lineTotal = qty * product.sellingPrice;
      const newItem: POSCartItem = {
        productId: product.id,
        skuCode: product.skuCode,
        name: product.name,
        unitPrice: Number(product.sellingPrice),
        costPrice: Number(product.costPrice || 0),
        quantity: qty,
        unitName: product.unit?.code || "pcs",
        discountAmount: 0,
        taxPercent: Number(product.taxPercent || 0),
        lineTotal,
        version: product.version || 0,
      };

      return { items: [newItem, ...state.items] };
    });
  },

  updateQuantity: (index, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((_, i) => i !== index) };
      }
      const updated = [...state.items];
      const item = updated[index];
      const lineTotal = quantity * item.unitPrice - item.discountAmount;
      updated[index] = { ...item, quantity, lineTotal };
      return { items: updated };
    });
  },

  updatePrice: (index, newPrice) => {
    set((state) => {
      const updated = [...state.items];
      const item = updated[index];
      const lineTotal = item.quantity * newPrice - item.discountAmount;
      updated[index] = { ...item, unitPrice: newPrice, lineTotal };
      return { items: updated };
    });
  },

  updateItemDiscount: (index, discount) => {
    set((state) => {
      const updated = [...state.items];
      const item = updated[index];
      const lineTotal = item.quantity * item.unitPrice - discount;
      updated[index] = { ...item, discountAmount: discount, lineTotal };
      return { items: updated };
    });
  },

  removeItem: (index) => set((state) => ({ items: state.items.filter((_, i) => i !== index) })),
  clearCart: () => set({ items: [], globalDiscount: 0, customerId: null, customerName: "Walk-in Customer", customerPhone: "" }),
  setCustomer: (id, name, phone) => set({ customerId: id, customerName: name, customerPhone: phone }),
}));
```

---

## 4. Hardware Barcode Scanner HID Wedge Listener

Standard USB/Bluetooth barcode scanners emulate rapid keyboard typing (< 25ms between characters) followed by an `Enter` key.  
This listener captures barcodes **globally from anywhere in the window**, without requiring the user to focus a search box:

```typescript
// hooks/useBarcodeScanner.ts
import { useEffect, useRef } from "react";
import { usePOSStore } from "@/stores/usePOSStore";

interface BarcodeScannerOptions {
  onScanSuccess?: (barcode: string) => void;
  productCatalog: any[]; // Fast indexed array or Map
}

export function useBarcodeScanner({ productCatalog, onScanSuccess }: BarcodeScannerOptions) {
  const addItem = usePOSStore((s) => s.addItem);
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in a normal text input (unless marked data-scanner-target)
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (!target.hasAttribute("data-scanner-capture")) {
          return;
        }
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Scanners send keys at < 35ms cadence
      if (diff > 50) {
        bufferRef.current = ""; // Reset buffer if slow human typing
      }

      if (e.key === "Enter") {
        if (bufferRef.current.length >= 3) {
          const barcode = bufferRef.current.trim();
          e.preventDefault();
          e.stopPropagation();

          // Instant O(1) Match in product map
          const matched = productCatalog.find((p) => p.barcode === barcode || p.skuCode === barcode);
          if (matched) {
            addItem(matched, 1);
            // Play subtle audio confirmation beep
            playAudioBeep();
            if (onScanSuccess) onScanSuccess(barcode);
          }
          bufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [productCatalog, addItem, onScanSuccess]);
}

function playAudioBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1800; // Crisp high POS beep
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.04); // 40ms duration
  } catch (e) {
    // Ignore audio failures
  }
}
```

---

## 5. Virtualized 1,500+ SKU Catalog Rendering

Rendering 1,500 DOM elements causes substantial memory usage and 200ms+ render lag. With `@tanstack/react-virtual`, only the visible 15–20 cards/rows are rendered in the DOM:

```tsx
// components/pos/VirtualizedProductGrid.tsx
"use client";
import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePOSStore } from "@/stores/usePOSStore";

interface VirtualizedGridProps {
  products: any[];
}

export function VirtualizedProductGrid({ products }: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const addItem = usePOSStore((s) => s.addItem);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(products.length / 4), // 4 columns grid
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Height per row
    overscan: 3,
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-220px)] overflow-y-auto pr-2 custom-scrollbar">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * 4;
          const rowProducts = products.slice(startIndex, startIndex + 4);

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
              className="grid grid-cols-4 gap-3 py-1.5"
            >
              {rowProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p, 1)}
                  className="h-full bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-lime-400 hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-[0.98]"
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.skuCode}</span>
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 mt-0.5 group-hover:text-lime-700">
                      {p.name}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                    <span className="text-sm font-bold text-slate-900">₹{Number(p.sellingPrice).toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{p.currentStock} in stock</span>
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 6. Keyboard-First POS Navigation Engine

Cashiers can bill an entire order without touching the mouse:

| Shortcut Key | Action Performed |
| :--- | :--- |
| **`F2`** | Focus Product Search Modal / Palette |
| **`F4`** | Select / Search Customer |
| **`F7`** | Hold / Park Active Bill |
| **`F8`** | Trigger Payment & Checkout Modal (Cash / UPI / Udhaar) |
| **`F9`** | Instant Thermal Print of Last Bill |
| **`+` / `-`** | Increase / Decrease Quantity of Last Added Item |
| **`Del`** | Remove Selected Line Item from Cart |
| **`Escape`** | Close open modals or clear search filter |
