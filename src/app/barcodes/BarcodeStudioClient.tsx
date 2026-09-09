"use client";

import React, { useState, useRef } from "react";
import {
  Barcode,
  Printer,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  Camera,
  Settings2,
  FileText,
  AlertTriangle,
  Tag,
  CheckSquare,
  Square,
  RotateCcw,
  ArrowRight,
  Boxes,
  Zap,
} from "lucide-react";
import {
  autoGenerateMissingBarcodes,
  getProductsForBarcodes,
} from "@/actions/barcodes";
import { generateBarcodeSvgString } from "@/utils/barcodeSvg";
import { BarcodeCameraModal } from "@/components/barcodes/BarcodeCameraModal";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";
import { playScannerBeep, playErrorBeep } from "@/hooks/useBarcodeScanner";

export type LabelTemplate =
  | "THERMAL_20x10"
  | "THERMAL_25x10"
  | "THERMAL_30x10"
  | "THERMAL_40x10"
  | "THERMAL_45x10"
  | "THERMAL_25x15"
  | "THERMAL_30x15"
  | "THERMAL_38x25"
  | "THERMAL_50x25"
  | "THERMAL_100x50"
  | "A4_144_UP"
  | "A4_100_UP"
  | "A4_84_UP"
  | "A4_65_UP"
  | "A4_40_UP"
  | "A4_24_UP";

interface TemplateDef {
  id: LabelTemplate;
  category: "thermal" | "sheet";
  subCategory?: "pen" | "standard" | "shipping";
  title: string;
  badge: string;
  desc: string;
  widthMm: number;
  heightMm: number;
  isPenSpecial?: boolean;
}

const TEMPLATES: TemplateDef[] = [
  // --- THERMAL: PEN & ULTRA-MICRO SIZES ---
  {
    id: "THERMAL_20x10",
    category: "thermal",
    subCategory: "pen",
    title: "Nano Micro (20 x 10mm)",
    badge: "0.8\" x 0.4\" Pen Cap",
    desc: "Ultra-tiny for pen caps, refills, jewelry rings, leads & micro parts",
    widthMm: 20,
    heightMm: 10,
    isPenSpecial: true,
  },
  {
    id: "THERMAL_25x10",
    category: "thermal",
    subCategory: "pen",
    title: "Pen Slim (25 x 10mm)",
    badge: "1\" x 0.4\" Pen Body",
    desc: "Specifically sized for ballpoint pens, pencils, thin markers & cosmetics",
    widthMm: 25,
    heightMm: 10,
    isPenSpecial: true,
  },
  {
    id: "THERMAL_30x10",
    category: "thermal",
    subCategory: "pen",
    title: "Pen Barrel (30 x 10mm)",
    badge: "1.2\" x 0.4\" Stationery",
    desc: "Fits lengthwise on pen barrels & pencils without peeling or lifting",
    widthMm: 30,
    heightMm: 10,
    isPenSpecial: true,
  },
  {
    id: "THERMAL_40x10",
    category: "thermal",
    subCategory: "pen",
    title: "Pen Strip Pro (40 x 10mm)",
    badge: "1.6\" x 0.4\" Long Strip",
    desc: "Elongated strip with split layout for pens, brushes, cables & slim tools",
    widthMm: 40,
    heightMm: 10,
    isPenSpecial: true,
  },
  {
    id: "THERMAL_45x10",
    category: "thermal",
    subCategory: "pen",
    title: "Jewelry / Pen Clip (45 x 10mm)",
    badge: "1.8\" x 0.4\" Clip / Tag",
    desc: "Fold-around barbell / dumbbell tag for pen clips, optical frames & jewelry",
    widthMm: 45,
    heightMm: 10,
    isPenSpecial: true,
  },
  {
    id: "THERMAL_25x15",
    category: "thermal",
    subCategory: "pen",
    title: "Tiny (25 x 15mm)",
    badge: "1\" x 0.6\" Micro",
    desc: "Ultra-compact for sharpeners, erasers, small bottles & cosmetics",
    widthMm: 25,
    heightMm: 15,
    isPenSpecial: true,
  },
  // --- THERMAL: STANDARD & SHIPPING ---
  {
    id: "THERMAL_30x15",
    category: "thermal",
    subCategory: "standard",
    title: "Micro (30 x 15mm)",
    badge: "1.2\" x 0.6\" Small",
    desc: "Stationery, markers, small bottles, cosmetics & tubes",
    widthMm: 30,
    heightMm: 15,
  },
  {
    id: "THERMAL_38x25",
    category: "thermal",
    subCategory: "standard",
    title: "Compact (38 x 25mm)",
    badge: "1.5\" x 1\"",
    desc: "Small notebooks, accessories, cards & stationery",
    widthMm: 38,
    heightMm: 25,
  },
  {
    id: "THERMAL_50x25",
    category: "thermal",
    subCategory: "standard",
    title: "Standard (50 x 25mm)",
    badge: "2\" x 1\" Most Popular",
    desc: "Standard retail barcode roll sticker (TVS, TSC, Zebra)",
    widthMm: 50,
    heightMm: 25,
  },
  {
    id: "THERMAL_100x50",
    category: "thermal",
    subCategory: "shipping",
    title: "Shipping (100 x 50mm)",
    badge: "4\" x 2\" Parcel",
    desc: "Carton boxes, job order parcels & paper ream bundles",
    widthMm: 100,
    heightMm: 50,
  },
  // --- A4 SHEETS ---
  {
    id: "A4_144_UP",
    category: "sheet",
    subCategory: "pen",
    title: "A4 Tiny Grid (144 Labels - 25x15mm)",
    badge: "25 x 15mm on A4",
    desc: "144 micro stickers (8x18) on 1 A4 sheet — prints 25x15mm labels on normal paper & PDF",
    widthMm: 25,
    heightMm: 15,
    isPenSpecial: true,
  },
  {
    id: "A4_100_UP",
    category: "sheet",
    subCategory: "pen",
    title: "A4 Pen Strip Grid (100 Labels - 38x10mm)",
    badge: "38 x 10mm Pen Strip",
    desc: "100 slim pen strips (5x20) on 1 A4 sheet — fits all pens & pencils on regular printers",
    widthMm: 38,
    heightMm: 10,
    isPenSpecial: true,
  },
  {
    id: "A4_84_UP",
    category: "sheet",
    subCategory: "pen",
    title: "A4 Pen & Micro (84 Labels - 4x21)",
    badge: "46 x 11.1mm Slim",
    desc: "84 slim stickers per A4 sheet — tailored for pens, pencils, cables & files",
    widthMm: 46,
    heightMm: 11.1,
    isPenSpecial: true,
  },
  {
    id: "A4_65_UP",
    category: "sheet",
    subCategory: "standard",
    title: "A4 Micro (65 Labels - 5x13)",
    badge: "38.1 x 21.2mm",
    desc: "65 mini stickers per standard A4 laser/inkjet sheet",
    widthMm: 38.1,
    heightMm: 21.2,
  },
  {
    id: "A4_40_UP",
    category: "sheet",
    subCategory: "standard",
    title: "A4 Compact (40 Labels - 4x10)",
    badge: "52.5 x 29.7mm",
    desc: "40 medium stationery labels per A4 sheet",
    widthMm: 52.5,
    heightMm: 29.7,
  },
  {
    id: "A4_24_UP",
    category: "sheet",
    subCategory: "shipping",
    title: "A4 Standard (24 Labels - 3x8)",
    badge: "70 x 36mm",
    desc: "24 standard shipping/pricing tags per A4 sheet",
    widthMm: 70,
    heightMm: 36,
  },
];

interface BarcodeStudioClientProps {
  initialProducts: any[];
  categories: any[];
  metrics: {
    total: number;
    withBarcode: number;
    missingBarcode: number;
  };
  shopSettings: any;
}

interface QueueItem {
  id: string;
  product: any;
  quantity: number;
  customSubtitle?: string;
}

export function BarcodeStudioClient({
  initialProducts,
  categories,
  metrics,
  shopSettings,
}: BarcodeStudioClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [catalogMetrics, setCatalogMetrics] = useState(metrics);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "MISSING_BARCODE">("ALL");

  // Multi-Selection State in Catalog
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  // Inline row quantities before queueing
  const [rowQuantities, setRowQuantities] = useState<Record<string, number>>({});

  // Fast Top Search / Barcode Entry
  const [quickInput, setQuickInput] = useState("");
  const [quickQty, setQuickQty] = useState(1);

  // Template & Customization Options
  const [template, setTemplate] = useState<LabelTemplate>("THERMAL_50x25");
  const [templateCategoryTab, setTemplateCategoryTab] = useState<"thermal" | "sheet">("thermal");
  const [templateSubFilter, setTemplateSubFilter] = useState<"ALL" | "PEN" | "STANDARD">("ALL");
  const [showShopName, setShowShopName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showHumanReadable, setShowHumanReadable] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  // Print Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isGeneratingMissing, setIsGeneratingMissing] = useState(false);

  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const shopName = shopSettings?.shopName || "CRYSTAL PRESS";
  const activeTemplateDef = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0];

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== "ALL" && p.categoryName !== selectedCategory) return false;
    if (stockFilter === "IN_STOCK" && (!p.currentStock || p.currentStock <= 0)) return false;
    if (stockFilter === "MISSING_BARCODE" && p.barcode) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.skuCode.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Active Preview Item: either first item in queue or a sample product
  const previewProduct = queue[0]?.product || products[0] || {
    name: "A4 Offset Printing Paper 80 GSM",
    skuCode: "CP-PAP-001",
    barcode: "CP-PAP-001",
    sellingPrice: 450,
  };

  // Helper for row quantity
  const getRowQty = (productId: string) => rowQuantities[productId] || 1;
  const setRowQty = (productId: string, val: number) => {
    setRowQuantities((prev) => ({ ...prev, [productId]: Math.max(1, val) }));
  };

  // Add Single Product to Queue
  const addToQueue = (product: any, qty = 1) => {
    const existingIndex = queue.findIndex((q) => q.product.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...queue];
      updated[existingIndex].quantity += qty;
      setQueue(updated);
    } else {
      setQueue([
        ...queue,
        {
          id: String(Date.now() + Math.random()),
          product,
          quantity: qty,
        },
      ]);
    }
    playScannerBeep();
    toast.success(`Added ${qty} sticker(s) for "${product.name}"`);
  };

  // Quick Add from Top Bar (handles scanner guns and manual typing + Enter)
  const handleQuickAdd = () => {
    if (!quickInput.trim()) return;
    const query = quickInput.trim().toLowerCase();

    // Exact barcode match first
    let matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query) ||
        (p.skuCode && p.skuCode.toLowerCase() === query)
    );

    // Fallback to name match
    if (!matched) {
      matched = products.find((p) => p.name.toLowerCase().includes(query));
    }

    if (matched) {
      addToQueue(matched, quickQty);
      setQuickInput("");
      setQuickQty(1);
    } else {
      playErrorBeep();
      toast.error(`No product found matching "${quickInput}"`);
    }
  };

  // Multi-Selection Toggle
  const toggleSelectProduct = (productId: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    setSelectedProductIds(next);
  };

  const toggleSelectAllFiltered = () => {
    if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      const allIds = new Set(filteredProducts.map((p) => p.id));
      setSelectedProductIds(allIds);
    }
  };

  // Add Selected to Queue (1 each or using their row quantities)
  const addSelectedToQueue = (useStockQty = false) => {
    if (selectedProductIds.size === 0) return;

    const itemsToAdd = products.filter((p) => selectedProductIds.has(p.id));
    const nextQueue = [...queue];

    itemsToAdd.forEach((product) => {
      const qty = useStockQty
        ? Math.max(1, Math.round(product.currentStock || 1))
        : getRowQty(product.id);

      const existingIndex = nextQueue.findIndex((q) => q.product.id === product.id);
      if (existingIndex >= 0) {
        nextQueue[existingIndex].quantity += qty;
      } else {
        nextQueue.push({
          id: String(Date.now() + Math.random()),
          product,
          quantity: qty,
        });
      }
    });

    setQueue(nextQueue);
    setSelectedProductIds(new Set());
    playScannerBeep();
    toast.success(`Added ${itemsToAdd.length} products to print queue!`);
  };

  // Add All Filtered to Queue
  const addAllFilteredToQueue = () => {
    if (filteredProducts.length === 0) return;

    const nextQueue = [...queue];
    filteredProducts.forEach((product) => {
      const qty = getRowQty(product.id);
      const existingIndex = nextQueue.findIndex((q) => q.product.id === product.id);
      if (existingIndex >= 0) {
        nextQueue[existingIndex].quantity += qty;
      } else {
        nextQueue.push({
          id: String(Date.now() + Math.random()),
          product,
          quantity: qty,
        });
      }
    });

    setQueue(nextQueue);
    playScannerBeep();
    toast.success(`Added all ${filteredProducts.length} filtered products to queue!`);
  };

  const removeFromQueue = (id: string) => {
    setQueue(queue.filter((q) => q.id !== id));
  };

  const updateQueueQty = (id: string, qty: number) => {
    setQueue(
      queue.map((q) => (q.id === id ? { ...q, quantity: Math.max(1, qty) } : q))
    );
  };

  const matchStockQuantities = () => {
    if (queue.length === 0) {
      toast.warning("Add products to the queue first");
      return;
    }
    const updated = queue.map((q) => ({
      ...q,
      quantity: Math.max(1, Math.round(q.product.currentStock || 1)),
    }));
    setQueue(updated);
    toast.info("Matched print quantities to current stock");
  };

  const handleAutoGenerateMissing = async () => {
    const confirmed = await modal.confirm({
      title: "Auto-Generate Barcodes",
      message: `Automatically assign unique Code-128 barcodes to ${catalogMetrics.missingBarcode} products missing barcodes?`,
      confirmText: "Generate Barcodes",
    });

    if (confirmed) {
      setIsGeneratingMissing(true);
      const res = await autoGenerateMissingBarcodes();
      setIsGeneratingMissing(false);

      if (res.success) {
        toast.success(res.message);
        const refreshed = await getProductsForBarcodes();
        if (refreshed.success && refreshed.products) {
          setProducts(refreshed.products);
          if (refreshed.metrics) setCatalogMetrics(refreshed.metrics);
        }
      } else {
        toast.error(res.error || "Failed to auto-generate barcodes");
      }
    }
  };

  // HTML Generator for Single Sticker based on Template
  const renderStickerHtml = (product: any) => {
    const barcodeText = product.barcode || product.skuCode || "CP-000000";

    // Dynamic Sizing based on template
    let height = 32;
    let moduleWidth = 1.2;
    let quietZone = 8;

    if (template === "THERMAL_20x10") {
      height = 11;
      moduleWidth = 0.68;
      quietZone = 2;
    } else if (template === "THERMAL_25x10") {
      height = 12;
      moduleWidth = 0.74;
      quietZone = 3;
    } else if (template === "THERMAL_30x10") {
      height = 13;
      moduleWidth = 0.78;
      quietZone = 3;
    } else if (template === "THERMAL_40x10" || template === "THERMAL_45x10") {
      height = 16;
      moduleWidth = 0.82;
      quietZone = 4;
    } else if (template === "THERMAL_25x15") {
      height = 16;
      moduleWidth = 0.82;
      quietZone = 3;
    } else if (template === "THERMAL_30x15") {
      height = 18;
      moduleWidth = 0.9;
      quietZone = 4;
    } else if (template === "THERMAL_38x25") {
      height = 26;
      moduleWidth = 1.0;
      quietZone = 6;
    } else if (template === "THERMAL_50x25") {
      height = 32;
      moduleWidth = 1.25;
      quietZone = 8;
    } else if (template === "THERMAL_100x50") {
      height = 55;
      moduleWidth = 1.6;
      quietZone = 10;
    } else if (template === "A4_144_UP") {
      height = 16;
      moduleWidth = 0.82;
      quietZone = 3;
    } else if (template === "A4_100_UP") {
      height = 15;
      moduleWidth = 0.80;
      quietZone = 3;
    } else if (template === "A4_84_UP") {
      height = 14;
      moduleWidth = 0.82;
      quietZone = 3;
    } else if (template === "A4_65_UP") {
      height = 20;
      moduleWidth = 0.9;
      quietZone = 5;
    } else if (template === "A4_40_UP") {
      height = 26;
      moduleWidth = 1.1;
      quietZone = 6;
    } else if (template === "A4_24_UP") {
      height = 34;
      moduleWidth = 1.3;
      quietZone = 8;
    }

    const barcodeSvg = generateBarcodeSvgString(barcodeText, {
      height,
      moduleWidth,
      quietZone,
      showText: false,
    });

    const isPenStrip = template === "THERMAL_40x10" || template === "THERMAL_45x10" || template === "A4_84_UP" || template === "A4_100_UP";
    const isPenMicro = template === "THERMAL_20x10" || template === "THERMAL_25x10" || template === "THERMAL_30x10";
    const isMicro = template === "THERMAL_25x15" || template === "THERMAL_30x15" || template === "A4_144_UP";

    if (isPenStrip) {
      return `
        <div class="barcode-sticker is-pen-strip">
          <div class="pen-strip-info">
            ${showProductName ? `<div class="sticker-title">${product.name}</div>` : ""}
            <div class="pen-strip-meta">
              ${showPrice ? `<span class="sticker-price">₹${Number(product.sellingPrice).toFixed(0)}</span>` : ""}
              ${showShopName ? `<span class="sticker-shop">${shopName}</span>` : ""}
            </div>
          </div>
          <div class="pen-strip-barcode">
            <div class="sticker-barcode">${barcodeSvg}</div>
            ${showHumanReadable ? `<div class="sticker-code">${barcodeText}</div>` : ""}
          </div>
        </div>
      `;
    }

    if (isPenMicro) {
      return `
        <div class="barcode-sticker is-pen-micro">
          <div class="pen-micro-header">
            ${showProductName ? `<span class="sticker-title">${product.name}</span>` : ""}
            ${showPrice ? `<span class="sticker-price">₹${Number(product.sellingPrice).toFixed(0)}</span>` : ""}
          </div>
          <div class="sticker-barcode">
            ${barcodeSvg}
          </div>
          <div class="pen-micro-footer">
            ${showHumanReadable ? `<span class="sticker-code">${barcodeText}</span>` : ""}
            ${showShopName ? `<span class="sticker-shop">${shopName}</span>` : ""}
          </div>
        </div>
      `;
    }

    return `
      <div class="barcode-sticker ${isMicro ? "is-micro" : ""}">
        ${showShopName ? `<div class="sticker-shop">${shopName}</div>` : ""}
        ${showProductName ? `<div class="sticker-title">${product.name}</div>` : ""}
        
        <div class="sticker-barcode">
          ${barcodeSvg}
        </div>

        <div class="sticker-footer">
          ${showHumanReadable ? `<span class="sticker-code">${barcodeText}</span>` : ""}
          ${showPrice ? `<span class="sticker-price">₹${Number(product.sellingPrice).toFixed(0)}</span>` : ""}
        </div>
      </div>
    `;
  };

  // Print Execution
  const handlePrint = () => {
    if (queue.length === 0) {
      toast.warning("Please add at least one product to the print queue");
      return;
    }

    const allStickers: any[] = [];
    queue.forEach((q) => {
      for (let i = 0; i < q.quantity; i++) {
        allStickers.push(q.product);
      }
    });

    let printCss = "";
    let containerClass = "thermal-container";

    if (template === "THERMAL_20x10") {
      printCss = `
        @page { size: 20mm 10mm; margin: 0; }
        body { margin: 0; padding: 0; width: 20mm; }
        .barcode-sticker {
          width: 20mm;
          height: 10mm;
          box-sizing: border-box;
          padding: 0.3mm 0.5mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }
      `;
    } else if (template === "THERMAL_25x10") {
      printCss = `
        @page { size: 25mm 10mm; margin: 0; }
        body { margin: 0; padding: 0; width: 25mm; }
        .barcode-sticker {
          width: 25mm;
          height: 10mm;
          box-sizing: border-box;
          padding: 0.4mm 0.6mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }
      `;
    } else if (template === "THERMAL_30x10") {
      printCss = `
        @page { size: 30mm 10mm; margin: 0; }
        body { margin: 0; padding: 0; width: 30mm; }
        .barcode-sticker {
          width: 30mm;
          height: 10mm;
          box-sizing: border-box;
          padding: 0.4mm 0.7mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }
      `;
    } else if (template === "THERMAL_40x10") {
      printCss = `
        @page { size: 40mm 10mm; margin: 0; }
        body { margin: 0; padding: 0; width: 40mm; }
        .barcode-sticker {
          width: 40mm;
          height: 10mm;
          box-sizing: border-box;
          padding: 0.5mm 1mm;
          page-break-after: always;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          text-align: left;
        }
      `;
    } else if (template === "THERMAL_45x10") {
      printCss = `
        @page { size: 45mm 10mm; margin: 0; }
        body { margin: 0; padding: 0; width: 45mm; }
        .barcode-sticker {
          width: 45mm;
          height: 10mm;
          box-sizing: border-box;
          padding: 0.5mm 1.2mm;
          page-break-after: always;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          text-align: left;
        }
      `;
    } else if (template === "THERMAL_25x15") {
      printCss = `
        @page { size: 25mm 15mm; margin: 0; }
        body { margin: 0; padding: 0; width: 25mm; }
        .barcode-sticker {
          width: 25mm;
          height: 15mm;
          box-sizing: border-box;
          padding: 0.8mm 1mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }
      `;
    } else if (template === "THERMAL_30x15") {
      printCss = `
        @page { size: 30mm 15mm; margin: 0; }
        body { margin: 0; padding: 0; width: 30mm; }
        .barcode-sticker {
          width: 30mm;
          height: 15mm;
          box-sizing: border-box;
          padding: 1mm 1.2mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }
      `;
    } else if (template === "THERMAL_38x25") {
      printCss = `
        @page { size: 38mm 25mm; margin: 0; }
        body { margin: 0; padding: 0; width: 38mm; }
        .barcode-sticker {
          width: 38mm;
          height: 25mm;
          box-sizing: border-box;
          padding: 1.5mm 2mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }
      `;
    } else if (template === "THERMAL_50x25") {
      printCss = `
        @page { size: 50mm 25mm; margin: 0; }
        body { margin: 0; padding: 0; width: 50mm; }
        .barcode-sticker {
          width: 50mm;
          height: 25mm;
          box-sizing: border-box;
          padding: 2mm 2.5mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }
      `;
    } else if (template === "THERMAL_100x50") {
      printCss = `
        @page { size: 100mm 50mm; margin: 0; }
        body { margin: 0; padding: 0; width: 100mm; }
        .barcode-sticker {
          width: 100mm;
          height: 50mm;
          box-sizing: border-box;
          padding: 4mm 5mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }
      `;
    } else if (template === "A4_144_UP") {
      containerClass = "a4-grid-144";
      printCss = `
        @page { size: A4 portrait; margin: 6mm 5mm; }
        body { margin: 0; padding: 0; }
        .a4-grid-144 {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 1mm 1.5mm;
        }
        .barcode-sticker {
          height: 15mm;
          box-sizing: border-box;
          padding: 0.4mm 0.8mm;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          break-inside: avoid;
        }
      `;
    } else if (template === "A4_100_UP") {
      containerClass = "a4-grid-100";
      printCss = `
        @page { size: A4 portrait; margin: 6mm 5mm; }
        body { margin: 0; padding: 0; }
        .a4-grid-100 {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.5mm 2mm;
        }
        .barcode-sticker {
          height: 10mm;
          box-sizing: border-box;
          padding: 0.3mm 0.8mm;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          break-inside: avoid;
        }
      `;
    } else if (template === "A4_84_UP") {
      containerClass = "a4-grid-84";
      printCss = `
        @page { size: A4 portrait; margin: 6mm 5mm; }
        body { margin: 0; padding: 0; }
        .a4-grid-84 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5mm 2.5mm;
        }
        .barcode-sticker {
          height: 11.2mm;
          box-sizing: border-box;
          padding: 0.4mm 0.8mm;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          break-inside: avoid;
        }
      `;
    } else if (template === "A4_65_UP") {
      containerClass = "a4-grid-65";
      printCss = `
        @page { size: A4 portrait; margin: 8mm; }
        body { margin: 0; padding: 0; }
        .a4-grid-65 {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 2.5mm 2.5mm;
        }
        .barcode-sticker {
          height: 20mm;
          box-sizing: border-box;
          padding: 1mm 1.5mm;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          break-inside: avoid;
        }
      `;
    } else if (template === "A4_40_UP") {
      containerClass = "a4-grid-40";
      printCss = `
        @page { size: A4 portrait; margin: 8mm; }
        body { margin: 0; padding: 0; }
        .a4-grid-40 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4mm 3mm;
        }
        .barcode-sticker {
          height: 25.4mm;
          box-sizing: border-box;
          padding: 1.5mm 2mm;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          break-inside: avoid;
        }
      `;
    } else if (template === "A4_24_UP") {
      containerClass = "a4-grid-24";
      printCss = `
        @page { size: A4 portrait; margin: 6mm; }
        body { margin: 0; padding: 0; }
        .a4-grid-24 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(8, 31.5mm);
          gap: 2.2mm 3mm;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .barcode-sticker {
          height: 31.5mm;
          box-sizing: border-box;
          padding: 1.5mm 2.5mm;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          break-inside: avoid;
        }
      `;
    }

    const commonStyles = `
      * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sticker-shop {
        font-size: 5.5pt;
        font-weight: 800;
        text-transform: uppercase;
        color: #475569;
        letter-spacing: 0.3px;
        line-height: 1.1;
      }
      .sticker-title {
        font-size: 6.8pt;
        font-weight: 900;
        color: #0f172a;
        line-height: 1.1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .sticker-barcode {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 1px 0;
        overflow: hidden;
      }
      .sticker-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 6pt;
        font-weight: bold;
        border-top: 1px solid #e2e8f0;
        padding-top: 1px;
      }
      .sticker-code {
        font-family: monospace;
        font-size: 5.8pt;
      }
      .sticker-price {
        font-weight: 900;
        color: #0f172a;
        font-size: 7pt;
      }

      /* Micro stickers (25x15mm, 30x15mm, A4 144-up) styles */
      .is-micro {
        padding: 0.5mm 0.8mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
        height: 100% !important;
        max-height: 15mm !important;
        box-sizing: border-box !important;
      }
      .is-micro .sticker-shop {
        font-size: 4.5pt !important;
        letter-spacing: 0.2px !important;
        height: 1.8mm !important;
        line-height: 1.8mm !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .is-micro .sticker-title {
        font-size: 5.5pt !important;
        font-weight: 900 !important;
        height: 2.3mm !important;
        line-height: 2.3mm !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .is-micro .sticker-barcode {
        height: 5.5mm !important;
        max-height: 5.5mm !important;
        margin: 0.2mm 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
      }
      .is-micro .sticker-barcode svg {
        height: 5.5mm !important;
        max-height: 5.5mm !important;
        width: 100% !important;
      }
      .is-micro .sticker-footer {
        font-size: 5pt !important;
        padding-top: 0.3mm !important;
        height: 1.8mm !important;
        line-height: 1.8mm !important;
        border-top: 0.5px solid #cbd5e1 !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      .is-micro .sticker-code {
        font-size: 4.8pt !important;
        font-family: monospace !important;
      }
      .is-micro .sticker-price {
        font-size: 5.8pt !important;
        font-weight: 900 !important;
      }

      /* Pen & Nano Micro stickers (20x10mm, 25x10mm, 30x10mm) */
      .is-pen-micro {
        padding: 0.3mm 0.6mm !important;
        line-height: 1 !important;
        height: 100% !important;
        max-height: 10mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
      }
      .is-pen-micro .pen-micro-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        font-size: 4.8pt !important;
        font-weight: 800 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        height: 1.8mm !important;
        line-height: 1.8mm !important;
      }
      .is-pen-micro .sticker-title {
        max-width: 68% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        font-size: 4.8pt !important;
        font-weight: 900 !important;
        color: #0f172a !important;
      }
      .is-pen-micro .sticker-price {
        font-size: 5.2pt !important;
        font-weight: 900 !important;
        color: #0f172a !important;
      }
      .is-pen-micro .sticker-barcode {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        margin: 0.1mm 0 !important;
        height: 4.5mm !important;
        max-height: 4.5mm !important;
      }
      .is-pen-micro .sticker-barcode svg {
        height: 4.5mm !important;
        max-height: 4.5mm !important;
        width: 100% !important;
      }
      .is-pen-micro .pen-micro-footer {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        font-size: 4.5pt !important;
        font-family: monospace !important;
        font-weight: bold !important;
        height: 1.8mm !important;
        line-height: 1.8mm !important;
      }
      .is-pen-micro .sticker-code {
        font-size: 4.5pt !important;
      }
      .is-pen-micro .sticker-shop {
        font-size: 4.2pt !important;
        max-width: 45% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        color: #64748b !important;
      }

      /* Pen Strip Split Layout (40x10mm, 45x10mm, A4 84-up, A4 100-up) */
      .is-pen-strip {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0.4mm 0.8mm !important;
        text-align: left !important;
        height: 100% !important;
        max-height: 10mm !important;
        overflow: hidden !important;
      }
      .is-pen-strip .pen-strip-info {
        width: 38% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        height: 100% !important;
        padding-right: 0.8mm !important;
        overflow: hidden !important;
      }
      .is-pen-strip .pen-strip-barcode {
        width: 62% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important;
      }
      .is-pen-strip .sticker-title {
        font-size: 5pt !important;
        font-weight: 900 !important;
        line-height: 1.1 !important;
        max-height: 4mm !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
        color: #0f172a !important;
      }
      .is-pen-strip .pen-strip-meta {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        font-size: 4.8pt !important;
        margin-top: 0.2mm !important;
      }
      .is-pen-strip .sticker-price {
        font-size: 5.5pt !important;
        font-weight: 900 !important;
        color: #0f172a !important;
      }
      .is-pen-strip .sticker-shop {
        font-size: 4.2pt !important;
        color: #64748b !important;
      }
      .is-pen-strip .sticker-barcode {
        height: 6mm !important;
        max-height: 6mm !important;
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
      }
      .is-pen-strip .sticker-barcode svg {
        height: 6mm !important;
        max-height: 6mm !important;
        width: 100% !important;
      }
      .is-pen-strip .sticker-code {
        font-size: 4.5pt !important;
        font-family: monospace !important;
        text-align: center !important;
        margin-top: 0.1mm !important;
        color: #334155 !important;
      }
    `;

    const stickersHtml = allStickers.map((prod) => renderStickerHtml(prod)).join("");

    const fullDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Print Barcode Labels - Crystal Press</title>
        <style>
          ${printCss}
          ${commonStyles}
        </style>
      </head>
      <body>
        <div class="${containerClass}">
          ${stickersHtml}
        </div>
      </body>
      </html>
    `;

    const iframe = printFrameRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(fullDoc);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  const totalQueuedStickers = queue.reduce((sum, q) => sum + q.quantity, 0);
  const isAllFilteredSelected =
    filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime">
            <Barcode className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Barcode & Thermal Label Studio
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-lime-100 text-lime-800 rounded-full">
                Multi-Template
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Print roll stickers (20x10mm pen, 25x10mm slim, 40x10mm barrel, 50x25mm standard) &amp; A4 sheets
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsCameraOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Camera className="w-4 h-4 text-lime-600" />
            <span>Scan via Camera</span>
          </button>

          {catalogMetrics.missingBarcode > 0 && (
            <button
              onClick={handleAutoGenerateMissing}
              disabled={isGeneratingMissing}
              className="px-4 py-2 bg-lime-400 hover:bg-lime-500 text-slate-950 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isGeneratingMissing
                  ? "Assigning..."
                  : `Assign Barcodes (${catalogMetrics.missingBarcode})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          title="Total Catalog SKUs"
          value={catalogMetrics.total.toString()}
          subtitle="Inventory database"
          icon={<Tag className="w-5 h-5 text-slate-900" />}
          iconBg="bg-slate-100 text-slate-900 border border-slate-200/80"
          badge="Catalog"
          badgeColor="bg-slate-100 text-slate-700 border border-slate-200/80"
        />

        <StatCard
          title="With Barcode Assigned"
          value={catalogMetrics.withBarcode.toString()}
          subtitle="Ready for scanner"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
          badge="Scanner Ready"
          badgeColor="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
        />

        <StatCard
          title="Missing Barcodes"
          value={catalogMetrics.missingBarcode.toString()}
          subtitle={catalogMetrics.missingBarcode > 0 ? "Click Assign Barcodes above" : "All SKUs assigned!"}
          icon={<AlertTriangle className="w-5 h-5 text-amber-700" />}
          iconBg="bg-amber-50 text-amber-800 border border-amber-200/80"
          badge={catalogMetrics.missingBarcode > 0 ? "Action Required" : "100% Complete"}
          badgeColor={catalogMetrics.missingBarcode > 0 ? "bg-amber-50 text-amber-800 border border-amber-200/80" : "bg-emerald-50 text-emerald-800 border border-emerald-200/80"}
        />
      </div>

      {/* HIGH-SPEED QUICK-ADD BAR (Top Bar for Scanner Gun & Fast Search) */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Type Product Name, SKU, or Scan Barcode with Gun (Press Enter to Add)..."
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 rounded-2xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500">Qty:</span>
            <input
              type="number"
              min="1"
              max="999"
              value={quickQty}
              onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value)))}
              className="w-12 bg-transparent text-center font-bold text-xs focus:outline-none"
            />
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={!quickInput.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-lime-400" />
            <span>Quick Queue</span>
          </button>
        </div>
      </div>

      {/* DEDICATED SIDE-BY-SIDE WORKFLOW: Left Catalog Browser (62%), Right Print Studio & Queue (38%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================ */}
        {/* LEFT 7-8 COLS: PRODUCT CATALOG WITH MULTI-SELECT & INSTANT QUEUE */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            {/* Catalog Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-lime-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Product Catalog ({filteredProducts.length})
                </h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search in table */}
                <div className="relative w-44">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-lime-400"
                  />
                </div>

                {/* Category Dropdown */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 font-medium"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Stock Filter Pills */}
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-[11px] font-bold">
                  <button
                    onClick={() => setStockFilter("ALL")}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-all",
                      stockFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStockFilter("IN_STOCK")}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-all",
                      stockFilter === "IN_STOCK" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    In Stock
                  </button>
                  <button
                    onClick={() => setStockFilter("MISSING_BARCODE")}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-all",
                      stockFilter === "MISSING_BARCODE" ? "bg-white text-amber-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    No Barcode
                  </button>
                </div>
              </div>
            </div>

            {/* Multi-Select Floating / Sticky Action Bar */}
            {selectedProductIds.size > 0 ? (
              <div className="p-3 bg-lime-50 rounded-2xl border border-lime-300 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-lime-800" />
                  <span className="text-xs font-black text-lime-950">
                    {selectedProductIds.size} product(s) selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addSelectedToQueue(false)}
                    className="px-3 py-1.5 bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Queue Selected</span>
                  </button>

                  <button
                    onClick={() => addSelectedToQueue(true)}
                    title="Add each selected item with copies matching its in-stock warehouse quantity"
                    className="px-3 py-1.5 bg-white border border-lime-300 hover:bg-lime-100 text-lime-900 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Queue with Stock Qty</span>
                  </button>

                  <button
                    onClick={() => setSelectedProductIds(new Set())}
                    className="text-xs font-semibold text-slate-500 hover:text-rose-600 px-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Quick Batch Helper Bar */
              <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="rounded text-lime-500 focus:ring-lime-400"
                  />
                  <span>Select All Filtered ({filteredProducts.length})</span>
                </label>

                {filteredProducts.length > 0 && (
                  <button
                    onClick={addAllFilteredToQueue}
                    className="text-xs font-bold text-lime-700 hover:text-lime-800 flex items-center gap-1 hover:underline"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Queue All {filteredProducts.length} Items</span>
                  </button>
                )}
              </div>
            )}

            {/* Product Table */}
            <div className="border border-slate-100 rounded-2xl overflow-x-auto max-h-[580px] overflow-y-auto custom-scrollbar">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-3 w-8">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="rounded text-lime-500 focus:ring-lime-400"
                      />
                    </th>
                    <th className="p-3">Product / SKU</th>
                    <th className="p-3">Barcode</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Stock</th>
                    <th className="p-3 text-right pr-3">Quick Queue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        No products match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = selectedProductIds.has(p.id);
                      const rowQty = getRowQty(p.id);
                      const isStockPositive = (p.currentStock || 0) > 0;

                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            "transition-colors",
                            isSelected ? "bg-lime-50/50" : "hover:bg-slate-50/60"
                          )}
                        >
                          <td className="p-3 pl-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectProduct(p.id)}
                              className="rounded text-lime-500 focus:ring-lime-400"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 truncate max-w-[200px]">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                              <span>{p.skuCode}</span>
                              {p.categoryName && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500 font-sans">{p.categoryName}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            {p.barcode ? (
                              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                {p.barcode}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md text-[10px]">
                                No Barcode
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {formatCurrency(p.sellingPrice)}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={cn(
                                "font-bold text-xs px-1.5 py-0.5 rounded-md",
                                isStockPositive
                                  ? "text-emerald-700 bg-emerald-50"
                                  : "text-slate-400 bg-slate-100"
                              )}
                            >
                              {p.currentStock || 0}
                            </span>
                          </td>
                          <td className="p-3 text-right pr-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quantity Stepper */}
                              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shrink-0">
                                <button
                                  onClick={() => setRowQty(p.id, rowQty - 1)}
                                  className="px-1.5 py-1 text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="w-7 text-center font-bold text-xs select-none">
                                  {rowQty}
                                </span>
                                <button
                                  onClick={() => setRowQty(p.id, rowQty + 1)}
                                  className="px-1.5 py-1 text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              {/* Add Button */}
                              <button
                                onClick={() => addToQueue(p, rowQty)}
                                className="px-2.5 py-1 bg-lime-400 hover:bg-lime-500 text-slate-950 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-xs flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>

                              {/* Shortcut: 1-click add full stock */}
                              {isStockPositive && (
                                <button
                                  onClick={() => addToQueue(p, Math.round(p.currentStock))}
                                  title={`Add all ${p.currentStock} in-stock copies to print queue`}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[10px] transition-colors"
                                >
                                  +{Math.round(p.currentStock)}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT 4-5 COLS: ACTIVE PRINT QUEUE & TEMPLATE STUDIO */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Card 1: Active Print Queue */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  Print Queue
                  <span className="px-2 py-0.5 bg-lime-100 text-lime-900 rounded-full text-xs font-bold">
                    {totalQueuedStickers} Sticker{totalQueuedStickers === 1 ? "" : "s"}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {queue.length} product(s) selected
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {queue.length > 0 && (
                  <>
                    <button
                      onClick={matchStockQuantities}
                      title="Set stickers quantity equal to warehouse stock count"
                      className="px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-colors"
                    >
                      Match Stock
                    </button>
                    <button
                      onClick={() => setQueue([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline px-1.5"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Active Output Format Badge & Multi-Sticker Guidance */}
            <div
              className={cn(
                "p-3 rounded-2xl border text-xs space-y-1.5 transition-all",
                templateCategoryTab === "thermal"
                  ? "bg-amber-50/70 border-amber-200/80 text-amber-950"
                  : "bg-emerald-50/70 border-emerald-200/80 text-emerald-950"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      templateCategoryTab === "thermal" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                    )}
                  />
                  Format: {activeTemplateDef.title}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                    templateCategoryTab === "thermal"
                      ? "bg-amber-200/80 text-amber-900"
                      : "bg-emerald-200/80 text-emerald-900"
                  )}
                >
                  {templateCategoryTab === "thermal" ? "1 Label / Cut" : "Multi-Sticker Sheet"}
                </span>
              </div>

              {templateCategoryTab === "thermal" ? (
                <div className="space-y-1.5 text-[10.5px]">
                  <p className="text-amber-800 leading-tight">
                    Each sticker prints on an individual roll label ({activeTemplateDef.widthMm} × {activeTemplateDef.heightMm}mm) for TVS, TSC, Zebra roll printers.
                  </p>
                  <div className="pt-1.5 border-t border-amber-200/60 flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-600 font-semibold">Printing on regular paper / PDF?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateCategoryTab("sheet");
                        setTemplate("A4_144_UP");
                        toast.success("Switched to A4 Sheet Mode: All stickers tile on 1 single page!");
                      }}
                      className="font-black text-amber-950 hover:text-amber-700 underline flex items-center gap-1"
                    >
                      <span>Fit on A4 Sheet →</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[10.5px] text-emerald-800 leading-tight">
                  Tiled stickers across standard A4 paper. Perfect for desktop laser/inkjet printers &amp; Save as PDF.
                </div>
              )}
            </div>

            {/* Primary Print Button */}
            <button
              onClick={handlePrint}
              disabled={queue.length === 0}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-40 active:scale-98"
            >
              <Printer className="w-4 h-4 text-lime-400" />
              <span>
                {queue.length === 0
                  ? "Print Queue Empty"
                  : `Print ${totalQueuedStickers} Label${totalQueuedStickers === 1 ? "" : "s"} (${activeTemplateDef.widthMm}×${activeTemplateDef.heightMm}mm)`}
              </span>
            </button>

            {/* Queued Items List */}
            {queue.length === 0 ? (
              <div className="py-7 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs px-4">
                Click <span className="font-bold text-slate-600">+ Add</span> or check products in the catalog table on the left to add stickers here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 flex items-center justify-between gap-2 text-xs bg-white hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">
                        {item.product.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.product.barcode || item.product.skuCode} • {formatCurrency(item.product.sellingPrice)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={item.quantity}
                        onChange={(e) => updateQueueQty(item.id, Number(e.target.value))}
                        className="w-14 px-1 py-1 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-xs"
                      />
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Label Template Selector & Settings */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Select Label Template
                </h3>

                {/* Thermal vs Sheet Tabs */}
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-[10px] font-bold">
                  <button
                    onClick={() => {
                      setTemplateCategoryTab("thermal");
                      setTemplateSubFilter("ALL");
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      templateCategoryTab === "thermal"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Thermal Roll ({TEMPLATES.filter((t) => t.category === "thermal").length})
                  </button>
                  <button
                    onClick={() => {
                      setTemplateCategoryTab("sheet");
                      setTemplateSubFilter("ALL");
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      templateCategoryTab === "sheet"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    A4 Sheets ({TEMPLATES.filter((t) => t.category === "sheet").length})
                  </button>
                </div>
              </div>

              {/* Quick Sub-Filter Pills for Thermal Rolls */}
              {templateCategoryTab === "thermal" && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5">
                  <button
                    onClick={() => setTemplateSubFilter("ALL")}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all shrink-0",
                      templateSubFilter === "ALL"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    All Sizes ({TEMPLATES.filter((t) => t.category === "thermal").length})
                  </button>
                  <button
                    onClick={() => setTemplateSubFilter("PEN")}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1 shrink-0 border",
                      templateSubFilter === "PEN"
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                    )}
                  >
                    <span>🖊️ Pens & Micro ({TEMPLATES.filter((t) => t.category === "thermal" && t.subCategory === "pen").length})</span>
                  </button>
                  <button
                    onClick={() => setTemplateSubFilter("STANDARD")}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all shrink-0",
                      templateSubFilter === "STANDARD"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Standard & Shipping ({TEMPLATES.filter((t) => t.category === "thermal" && t.subCategory !== "pen").length})
                  </button>
                </div>
              )}
            </div>

            {/* Template List */}
            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {TEMPLATES.filter((t) => {
                if (t.category !== templateCategoryTab) return false;
                if (templateCategoryTab === "thermal") {
                  if (templateSubFilter === "PEN") return t.subCategory === "pen";
                  if (templateSubFilter === "STANDARD") return t.subCategory !== "pen";
                }
                return true;
              }).map((tpl) => {
                const isSelected = template === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setTemplate(tpl.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-2xl border transition-all text-xs flex items-center justify-between gap-2",
                      isSelected
                        ? "bg-lime-50 border-lime-400/80 shadow-xs"
                        : tpl.isPenSpecial
                        ? "bg-amber-50/40 border-amber-200/60 hover:bg-amber-50/80"
                        : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-50"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900">{tpl.title}</span>
                        <span
                          className={cn(
                            "text-[9px] font-bold px-1.5 py-0.2 rounded-md",
                            tpl.isPenSpecial
                              ? "bg-amber-100 text-amber-900 font-extrabold"
                              : "bg-slate-200/70 text-slate-700"
                          )}
                        >
                          {tpl.badge}
                        </span>
                        {tpl.isPenSpecial && (
                          <span className="text-[8px] font-black px-1.5 py-0.2 bg-amber-200/80 text-amber-950 rounded-full">
                            🖊️ Pen Fit
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{tpl.desc}</div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-lime-700 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Visible Sticker Elements Checkboxes */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Visible Elements
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <label className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showShopName}
                    onChange={(e) => setShowShopName(e.target.checked)}
                    className="rounded text-lime-500 focus:ring-lime-400"
                  />
                  <span className="font-medium text-slate-700 text-[11px]">Shop Header</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={(e) => setShowProductName(e.target.checked)}
                    className="rounded text-lime-500 focus:ring-lime-400"
                  />
                  <span className="font-medium text-slate-700 text-[11px]">Product Title</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHumanReadable}
                    onChange={(e) => setShowHumanReadable(e.target.checked)}
                    className="rounded text-lime-500 focus:ring-lime-400"
                  />
                  <span className="font-medium text-slate-700 text-[11px]">SKU / Code</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-lime-500 focus:ring-lime-400"
                  />
                  <span className="font-medium text-slate-700 text-[11px]">MRP Price</span>
                </label>
              </div>
            </div>

            {/* Live Sticker Preview Box */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Live Preview ({TEMPLATES.find((t) => t.id === template)?.title})
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                  {TEMPLATES.find((t) => t.id === template)?.widthMm} x {TEMPLATES.find((t) => t.id === template)?.heightMm}mm
                </span>
              </div>

              <div className="p-4 bg-slate-100 rounded-2xl flex items-center justify-center min-h-[130px] border border-slate-200/70 overflow-hidden">
                {/* PREVIEW VARIANT 1: Long Pen Strip with Split Layout (40x10mm, 45x10mm, A4 84-up) */}
                {(template === "THERMAL_40x10" || template === "THERMAL_45x10" || template === "A4_84_UP") ? (
                  <div
                    className="bg-white shadow-md rounded-md p-1.5 flex flex-row items-center justify-between border border-slate-200 transition-all text-left"
                    style={{
                      width: template === "THERMAL_45x10" ? "260px" : "240px",
                      height: "68px",
                    }}
                  >
                    <div className="w-[38%] pr-1 flex flex-col justify-between h-full overflow-hidden">
                      {showProductName && (
                        <div className="text-[8px] font-black text-slate-900 truncate leading-tight">
                          {previewProduct.name}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[7px] font-extrabold mt-auto">
                        {showPrice && (
                          <span className="text-slate-900 font-black">
                            {formatCurrency(previewProduct.sellingPrice)}
                          </span>
                        )}
                        {showShopName && (
                          <span className="text-[6px] font-bold uppercase text-slate-400 truncate max-w-[45px]">
                            {shopName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-[62%] flex flex-col items-center justify-center h-full">
                      <div
                        className="w-full flex items-center justify-center overflow-hidden"
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvgString(
                            previewProduct.barcode || previewProduct.skuCode,
                            {
                              height: 18,
                              moduleWidth: 0.82,
                              quietZone: 3,
                            }
                          ),
                        }}
                      />
                      {showHumanReadable && (
                        <div className="text-[6.5px] font-mono text-slate-600 mt-0.5">
                          {previewProduct.barcode || previewProduct.skuCode}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (template === "THERMAL_20x10" || template === "THERMAL_25x10" || template === "THERMAL_30x10") ? (
                  /* PREVIEW VARIANT 2: Ultra-Micro Pen & Small Sticker (20x10mm, 25x10mm, 30x10mm) */
                  <div
                    className="bg-white shadow-md rounded-md p-1 text-center flex flex-col justify-between border border-slate-200 transition-all"
                    style={{
                      width:
                        template === "THERMAL_20x10"
                          ? "135px"
                          : template === "THERMAL_25x10"
                          ? "155px"
                          : "175px",
                      height: "68px",
                    }}
                  >
                    <div className="flex items-center justify-between text-[7px] font-extrabold leading-tight">
                      {showProductName && (
                        <span className="truncate max-w-[70%] text-slate-900">
                          {previewProduct.name}
                        </span>
                      )}
                      {showPrice && (
                        <span className="text-slate-900 shrink-0 font-black">
                          ₹{Number(previewProduct.sellingPrice).toFixed(0)}
                        </span>
                      )}
                    </div>

                    <div
                      className="my-0.5 flex items-center justify-center overflow-hidden"
                      dangerouslySetInnerHTML={{
                        __html: generateBarcodeSvgString(
                          previewProduct.barcode || previewProduct.skuCode,
                          {
                            height: 14,
                            moduleWidth: 0.72,
                            quietZone: 2,
                          }
                        ),
                      }}
                    />

                    <div className="flex items-center justify-between text-[6.5px] font-bold border-t border-slate-100 pt-0.5">
                      {showHumanReadable ? (
                        <span className="font-mono text-slate-600 truncate">
                          {previewProduct.barcode || previewProduct.skuCode}
                        </span>
                      ) : (
                        <span />
                      )}
                      {showShopName && (
                        <span className="text-[6px] uppercase text-slate-400 truncate max-w-[45px]">
                          {shopName}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* PREVIEW VARIANT 3: Standard & Shipping Stickers */
                  <div
                    className={cn(
                      "bg-white shadow-md rounded-md p-2 text-center flex flex-col justify-between border border-slate-200 transition-all",
                      (template === "THERMAL_25x15" || template === "THERMAL_30x15") && "text-[9px]"
                    )}
                    style={{
                      width:
                        template === "THERMAL_25x15"
                          ? "140px"
                          : template === "THERMAL_30x15"
                          ? "165px"
                          : template === "THERMAL_38x25"
                          ? "185px"
                          : template === "THERMAL_100x50"
                          ? "280px"
                          : "210px",
                      height:
                        template === "THERMAL_25x15" || template === "THERMAL_30x15"
                          ? "85px"
                          : template === "THERMAL_100x50"
                          ? "140px"
                          : "105px",
                    }}
                  >
                    {showShopName && (
                      <div className="text-[7.5px] font-extrabold uppercase text-slate-500 tracking-wider truncate">
                        {shopName}
                      </div>
                    )}
                    {showProductName && (
                      <div className="text-[9px] font-black text-slate-900 truncate leading-tight">
                        {previewProduct.name}
                      </div>
                    )}

                    <div
                      className="my-0.5 flex items-center justify-center overflow-hidden"
                      dangerouslySetInnerHTML={{
                        __html: generateBarcodeSvgString(
                          previewProduct.barcode || previewProduct.skuCode,
                          {
                            height:
                              template === "THERMAL_25x15"
                                ? 16
                                : template === "THERMAL_30x15"
                                ? 18
                                : template === "THERMAL_38x25"
                                ? 24
                                : template === "THERMAL_100x50"
                                ? 45
                                : 28,
                            moduleWidth:
                              template === "THERMAL_25x15" || template === "THERMAL_30x15"
                                ? 0.85
                                : 1.1,
                            quietZone:
                              template === "THERMAL_25x15"
                                ? 3
                                : template === "THERMAL_30x15"
                                ? 4
                                : 6,
                          }
                        ),
                      }}
                    />

                    <div className="flex items-center justify-between text-[8px] font-bold border-t border-slate-100 pt-0.5">
                      {showHumanReadable ? (
                        <span className="font-mono text-slate-600 truncate max-w-[80px]">
                          {previewProduct.barcode || previewProduct.skuCode}
                        </span>
                      ) : (
                        <span />
                      )}
                      {showPrice ? (
                        <span className="text-slate-900 font-extrabold">
                          {formatCurrency(previewProduct.sellingPrice)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Isolated Iframe for Clean Label Printing */}
      <iframe
        ref={printFrameRef}
        title="Print Barcode Labels"
        style={{ position: "absolute", width: "0px", height: "0px", border: "none", opacity: 0 }}
      />

      {/* Camera Barcode Scanner Modal */}
      <BarcodeCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onDetected={(code, prod) => {
          if (prod) {
            addToQueue(prod, 1);
          } else {
            setQuickInput(code);
            toast.info(`Scanned barcode: ${code}`);
          }
        }}
      />
    </div>
  );
}
