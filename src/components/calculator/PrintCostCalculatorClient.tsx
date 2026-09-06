"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  Scissors,
  Layers,
  Printer,
  Sparkles,
  FileText,
  Boxes,
  Plus,
  ArrowRight,
  Send,
  DollarSign,
  Percent,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Settings,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User,
  Phone,
  Building2,
  Calendar,
} from "lucide-react";
import {
  PAPER_SHEET_PRESETS,
  JOB_SIZE_PRESETS,
  calculatePrintCost,
  PrintCostCalculationParams,
  PrintCostCalculationResult,
  PaperSheetPreset,
  JobSizePreset,
} from "@/lib/print-calculator";
import { PaperCutVisualizer } from "@/components/calculator/PaperCutVisualizer";
import {
  createQuotationFromCalculator,
  createJobOrderFromCalculator,
} from "@/actions/calculator";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";
import { SearchableSelect, SearchableOption } from "@/components/ui/SearchableSelect";

interface PrintCostCalculatorClientProps {
  products: any[];
  customers: any[];
  shopSettings?: any;
}

export function PrintCostCalculatorClient({
  products = [],
  customers = [],
  shopSettings,
}: PrintCostCalculatorClientProps) {
  // Job Presets & Basic Specs
  const [selectedJobPreset, setSelectedJobPreset] = useState<string>("visiting_card");
  const [jobTitle, setJobTitle] = useState<string>("Visiting Cards (Premium 350 GSM)");
  const [quantity, setQuantity] = useState<number>(1000);

  // Sheet Dimensions & Preset
  const [selectedSheetPreset, setSelectedSheetPreset] = useState<string>("12x18");
  const [sheetWidth, setSheetWidth] = useState<number>(12);
  const [sheetHeight, setSheetHeight] = useState<number>(18);

  // Item Dimensions
  const [itemWidth, setItemWidth] = useState<number>(3.5);
  const [itemHeight, setItemHeight] = useState<number>(2.0);
  const [bleed, setBleed] = useState<number>(0.05);

  // Press Type
  const [pressType, setPressType] = useState<"OFFSET" | "DIGITAL">("DIGITAL");

  // Paper & GSM
  const [selectedPaperProductId, setSelectedPaperProductId] = useState<string>("");
  const [gsm, setGsm] = useState<number>(350);
  const [paperPricingMode, setPaperPricingMode] = useState<"PER_SHEET" | "PER_KG" | "PER_REAM">("PER_SHEET");
  const [paperRatePerUnit, setPaperRatePerUnit] = useState<number>(3.8);
  const [pressWastagePercent, setPressWastagePercent] = useState<number>(5);

  // Offset Pre-Press / Plates
  const [plateType, setPlateType] = useState<"CTP_THERMAL" | "PS_CONVENTIONAL" | "POLY_MASTER" | "NONE">("CTP_THERMAL");
  const [plateRate, setPlateRate] = useState<number>(200);
  const [colorsFront, setColorsFront] = useState<number>(4);
  const [colorsBack, setColorsBack] = useState<number>(4);

  // Machine Run / Impressions
  const [impressionRatePer1000, setImpressionRatePer1000] = useState<number>(150);
  const [minMachineCharge, setMinMachineCharge] = useState<number>(400);
  const [digitalClickRateFront, setDigitalClickRateFront] = useState<number>(6.0);
  const [digitalClickRateBack, setDigitalClickRateBack] = useState<number>(5.5);

  // Post-Press Finishing
  const [lamination, setLamination] = useState<"NONE" | "THERMAL_MATTE" | "THERMAL_GLOSS" | "VELVET_TOUCH" | "COLD_GLOSS">("THERMAL_MATTE");
  const [laminationSides, setLaminationSides] = useState<0 | 1 | 2>(2);
  const [laminationRatePerSqInch, setLaminationRatePerSqInch] = useState<number>(0.0018);

  const [uvVarnish, setUvVarnish] = useState<"NONE" | "FULL_UV" | "SPOT_UV" | "DRIP_OFF">("NONE");
  const [uvCost, setUvCost] = useState<number>(0);

  const [foilStamping, setFoilStamping] = useState<boolean>(false);
  const [foilCost, setFoilCost] = useState<number>(350);

  const [dieCutting, setDieCutting] = useState<boolean>(false);
  const [dieCost, setDieCost] = useState<number>(400);

  const [creasingFolding, setCreasingFolding] = useState<boolean>(false);
  const [creasingCost, setCreasingCost] = useState<number>(150);

  const [numbering, setNumbering] = useState<boolean>(false);
  const [numberingCost, setNumberingCost] = useState<number>(200);

  const [bindingType, setBindingType] = useState<"NONE" | "PAD_GUMMING" | "SADDLE_STITCH" | "PERFECT_BIND" | "SPIRAL_WOL_BIND">("NONE");
  const [bindingUnitCost, setBindingUnitCost] = useState<number>(2.0);

  // Profit Margin & Tax
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(35);
  const [taxPercent, setTaxPercent] = useState<number>(shopSettings?.defaultTaxRate || 0);

  // Export Modal State
  const [isExportQuotationOpen, setIsExportQuotationOpen] = useState(false);
  const [isExportJobOpen, setIsExportJobOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Preset Handlers
  const handleApplyJobPreset = (presetId: string) => {
    setSelectedJobPreset(presetId);
    const found = JOB_SIZE_PRESETS.find((p) => p.id === presetId);
    if (!found) return;

    setItemWidth(found.width);
    setItemHeight(found.height);
    if (found.defaultGsm) setGsm(found.defaultGsm);
    if (found.bleed !== undefined) setBleed(found.bleed);

    if (presetId === "visiting_card") {
      setJobTitle("Visiting Cards (1,000 Pcs)");
      setQuantity(1000);
      setSelectedSheetPreset("12x18");
      setSheetWidth(12);
      setSheetHeight(18);
      setPressType("DIGITAL");
      setLamination("THERMAL_MATTE");
      setLaminationSides(2);
      setColorsFront(4);
      setColorsBack(4);
    } else if (presetId === "a4_flyer") {
      setJobTitle("A4 Promotional Flyers (4+4 Color)");
      setQuantity(2000);
      setSelectedSheetPreset("18x23");
      setSheetWidth(18);
      setSheetHeight(23);
      setPressType("OFFSET");
      setLamination("NONE");
      setLaminationSides(0);
      setColorsFront(4);
      setColorsBack(4);
    } else if (presetId === "a5_pamphlet") {
      setJobTitle("A5 Marketing Leaflets (130 GSM Gloss)");
      setQuantity(4000);
      setSelectedSheetPreset("18x23");
      setSheetWidth(18);
      setSheetHeight(23);
      setPressType("OFFSET");
      setLamination("NONE");
      setColorsFront(4);
      setColorsBack(0);
    } else if (presetId === "bill_book_1_5") {
      setJobTitle("Duplicate NCR Bill Books (50 Sets/Book)");
      setQuantity(20);
      setSelectedSheetPreset("18x23");
      setSheetWidth(18);
      setSheetHeight(23);
      setPressType("OFFSET");
      setColorsFront(1);
      setColorsBack(0);
      setBindingType("PAD_GUMMING");
      setNumbering(true);
    }
  };

  const handleApplySheetPreset = (presetId: string) => {
    setSelectedSheetPreset(presetId);
    const found = PAPER_SHEET_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setSheetWidth(found.width);
    setSheetHeight(found.height);
    if (found.category === "DIGITAL") {
      setPressType("DIGITAL");
    } else if (found.category === "OFFSET") {
      setPressType("OFFSET");
    }
  };

  // Select Paper from Inventory
  const handleSelectInventoryPaper = (productId: string) => {
    setSelectedPaperProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setPaperRatePerUnit(product.sellingPrice || product.costPrice || 3.5);
      if (product.taxPercent) setTaxPercent(product.taxPercent);
    }
  };

  // Perform Real-Time Print Cost Calculation
  const calculationResult: PrintCostCalculationResult = useMemo(() => {
    const params: PrintCostCalculationParams = {
      quantity,
      sheetWidth,
      sheetHeight,
      itemWidth,
      itemHeight,
      bleed,
      pressType,
      gsm,
      paperPricingMode,
      paperRatePerUnit,
      pressWastagePercent,
      plateType,
      plateRate,
      colorsFront,
      colorsBack,
      impressionRatePer1000,
      minMachineCharge,
      digitalClickRateFront,
      digitalClickRateBack,
      lamination,
      laminationSides,
      laminationRatePerSqInch,
      uvVarnish,
      uvCost,
      foilStamping,
      foilCost,
      dieCutting,
      dieCost,
      creasingFolding,
      creasingCost,
      numbering,
      numberingCost,
      bindingType,
      bindingUnitCost,
      profitMarginPercent,
      taxPercent,
    };
    return calculatePrintCost(params);
  }, [
    quantity,
    sheetWidth,
    sheetHeight,
    itemWidth,
    itemHeight,
    bleed,
    pressType,
    gsm,
    paperPricingMode,
    paperRatePerUnit,
    pressWastagePercent,
    plateType,
    plateRate,
    colorsFront,
    colorsBack,
    impressionRatePer1000,
    minMachineCharge,
    digitalClickRateFront,
    digitalClickRateBack,
    lamination,
    laminationSides,
    laminationRatePerSqInch,
    uvVarnish,
    uvCost,
    foilStamping,
    foilCost,
    dieCutting,
    dieCost,
    creasingFolding,
    creasingCost,
    numbering,
    numberingCost,
    bindingType,
    bindingUnitCost,
    profitMarginPercent,
    taxPercent,
  ]);

  // Handle Export to Quotation
  const handleExportQuotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      modal.alert("Please provide the customer name for the quotation.", "Customer Name Required");
      return;
    }

    setIsSubmitting(true);
    const res = await createQuotationFromCalculator({
      customerId: selectedCustomerId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      itemTitle: jobTitle.trim(),
      specifications: {
        itemSize: `${itemWidth}″ × ${itemHeight}″`,
        sheetSize: `${sheetWidth}″ × ${sheetHeight}″`,
        upsPerSheet: calculationResult.ups,
        gsm,
        pressType,
        colors: `${colorsFront} + ${colorsBack}`,
        lamination: lamination !== "NONE" ? `${lamination} (${laminationSides} sides)` : "None",
        binding: bindingType !== "NONE" ? bindingType : "None",
        totalSheetsNeeded: calculationResult.totalMasterSheetsRequired,
        totalReams: calculationResult.totalReamsRequired,
      },
      quantity,
      unitPrice: calculationResult.sellingPricePerUnit,
      subTotal: calculationResult.sellingSubTotal,
      taxPercent,
      taxAmount: calculationResult.taxAmount,
      netTotal: calculationResult.grandTotal,
      notes: `Generated via Print Estimator & Imposition Engine. Yield: ${calculationResult.ups} ups on ${sheetWidth}″×${sheetHeight}″ sheet.`,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        `Quotation #${res.quotation.quotationNumber} generated successfully!`,
        "Quotation Created"
      );
      setIsExportQuotationOpen(false);
    } else {
      modal.error(res.error || "Failed to create quotation");
    }
  };

  // Handle Export to Job Order
  const handleExportJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      modal.alert("Please provide customer name for this job order.", "Customer Required");
      return;
    }

    setIsSubmitting(true);
    const res = await createJobOrderFromCalculator({
      customerId: selectedCustomerId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      jobType: jobTitle.trim(),
      specifications: {
        itemSize: `${itemWidth}″ × ${itemHeight}″`,
        masterSheet: `${sheetWidth}″ × ${sheetHeight}″`,
        ups: calculationResult.ups,
        paperGSM: gsm,
        pressMode: pressType,
        colors: `${colorsFront} Front + ${colorsBack} Back`,
        lamination: lamination !== "NONE" ? `${lamination} (${laminationSides} sides)` : "None",
        dieCutting,
        creasingFolding,
        numbering,
        binding: bindingType,
        sheetsRequired: calculationResult.totalMasterSheetsRequired,
        reamsRequired: calculationResult.totalReamsRequired,
      },
      quantity,
      totalAmount: calculationResult.grandTotal,
      advancePaid: 0,
      expectedDeliveryDays: 3,
      designNotes: `Calculated with ${calculationResult.ups} Ups on ${sheetWidth}″×${sheetHeight}″. Raw paper required: ${calculationResult.totalMasterSheetsRequired} sheets (${calculationResult.totalReamsRequired} reams).`,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        `Job Order #${res.job.jobOrderNumber} created successfully in Kanban!`,
        "Work Order Active"
      );
      setIsExportJobOpen(false);
    } else {
      modal.error(res.error || "Failed to create job order");
    }
  };

  const productOptions: SearchableOption[] = products.map((p) => ({
    value: p.id,
    label: p.name,
    subLabel: `SKU: ${p.skuCode} • Stock: ${p.currentStock} ${p.unit?.code || "pcs"}`,
    badge: `₹${p.sellingPrice}`,
    badgeColor: "bg-lime-100 text-lime-900 font-bold",
  }));

  const customerOptions: SearchableOption[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
    subLabel: c.phone ? `+91 ${c.phone}` : "No phone",
    badge: c.currentBalance > 0 ? `Udhaar: ₹${c.currentBalance}` : "Clean",
    badgeColor: c.currentBalance > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800",
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center text-slate-900 shadow-sm shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Print Estimator & Paper Cut Planner
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-lime-100 text-lime-900 border border-lime-200/60">
                2D Imposition Engine
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Interactive 2D sheet imposition, raw paper consumption, press run & finishing cost engine
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExportQuotationOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-98"
          >
            <FileText className="w-4 h-4 text-lime-400" />
            <span>Export to Quotation</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportJobOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-lime-500 hover:bg-lime-400 text-slate-950 text-xs font-extrabold shadow-sm flex items-center gap-2 transition-all active:scale-98"
          >
            <Layers className="w-4 h-4 text-slate-950" />
            <span>Send to Job Order</span>
          </button>
        </div>
      </div>

      {/* Quick Job Presets Ribbon */}
      <div className="bg-white p-3 rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-2">
          Quick Templates:
        </span>
        {JOB_SIZE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleApplyJobPreset(preset.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedJobPreset === preset.id
                ? "bg-slate-900 text-white shadow-sm font-extrabold"
                : "bg-slate-100/80 text-slate-700 hover:bg-slate-200/80"
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================================================== */}
        {/* LEFT COLUMN: PARAMETERS & COST CONFIGURATION (7 COLS) */}
        {/* ==================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Job Description & Dimensions */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Scissors className="w-4 h-4 text-lime-700" />
                <span>1. Job Specifications & Master Sheet</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Step 1 of 4</span>
            </div>

            {/* Job Title & Target Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Job Title / Description</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-lime-400"
                  placeholder="e.g. Visiting Cards Premium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quantity (Pcs)</label>
                <input
                  type="number"
                  min="1"
                  step="50"
                  value={quantity || ""}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-lime-400 font-mono"
                />
              </div>
            </div>

            {/* Master Sheet Preset Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Master Paper Sheet Size</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAPER_SHEET_PRESETS.map((sheet) => {
                  const subtitle =
                    sheet.name.match(/\((.*?)\)/)?.[1] ||
                    (sheet.id === "custom" ? "Custom Size" : sheet.name);
                  return (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => handleApplySheetPreset(sheet.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all ${
                        selectedSheetPreset === sheet.id
                          ? "bg-lime-50 border-lime-400 text-slate-950 font-extrabold shadow-sm ring-1 ring-lime-400"
                          : "bg-slate-50/80 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-xs font-black">{sheet.width}″ × {sheet.height}″</div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">{subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Sheet & Item Dimensions */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Sheet Width (″)</label>
                <input
                  type="number"
                  step="0.25"
                  value={sheetWidth}
                  onChange={(e) => setSheetWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Sheet Height (″)</label>
                <input
                  type="number"
                  step="0.25"
                  value={sheetHeight}
                  onChange={(e) => setSheetHeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Item Cut W (″)</label>
                <input
                  type="number"
                  step="0.1"
                  value={itemWidth}
                  onChange={(e) => setItemWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Item Cut H (″)</label>
                <input
                  type="number"
                  step="0.1"
                  value={itemHeight}
                  onChange={(e) => setItemHeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="font-bold text-slate-600 block mb-1">Bleed / Trim (″)</label>
                <input
                  type="number"
                  step="0.025"
                  value={bleed}
                  onChange={(e) => setBleed(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Paper Stock, GSM & Material Pricing */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Boxes className="w-4 h-4 text-lime-700" />
                <span>2. Raw Paper Stock & Material Rates</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Step 2 of 4</span>
            </div>

            {/* Inventory Paper Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Select from Active Paper Inventory (Optional auto-rate)
              </label>
              <SearchableSelect
                options={productOptions}
                value={selectedPaperProductId}
                onChange={handleSelectInventoryPaper}
                placeholder="Type to search paper stocks (e.g. 350 GSM Art Card, 100 GSM Bond)..."
              />
            </div>

            {/* GSM, Pricing Mode & Paper Rates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Paper GSM / Caliper</label>
                <input
                  type="number"
                  step="10"
                  value={gsm}
                  onChange={(e) => setGsm(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                  placeholder="300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pricing Basis</label>
                <select
                  value={paperPricingMode}
                  onChange={(e) => setPaperPricingMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                >
                  <option value="PER_SHEET">₹ Per Master Sheet</option>
                  <option value="PER_KG">₹ Per Kg (Weight formula)</option>
                  <option value="PER_REAM">₹ Per Ream (500s)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Rate ({paperPricingMode === "PER_SHEET" ? "₹/Sheet" : paperPricingMode === "PER_KG" ? "₹/Kg" : "₹/Ream"})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={paperRatePerUnit}
                  onChange={(e) => setPaperRatePerUnit(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Press Wastage Margin */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-800 block">Press & Make-ready Wastage Margin</span>
                <span className="text-[10px] text-slate-500">
                  Accounts for machine registration, ink color matching, and trimming loss
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[3, 5, 8, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPressWastagePercent(pct)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                      pressWastagePercent === pct
                        ? "bg-slate-900 text-white font-black"
                        : "bg-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Press Run & Machine Impressions */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Printer className="w-4 h-4 text-lime-700" />
                <span>3. Printing Press & Machine Run Costs</span>
              </div>

              {/* Press Mode Switch */}
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPressType("DIGITAL")}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    pressType === "DIGITAL" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-500"
                  }`}
                >
                  Digital Color Press
                </button>
                <button
                  type="button"
                  onClick={() => setPressType("OFFSET")}
                  className={`px-3 py-1 rounded-xl transition-all ${
                    pressType === "OFFSET" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-500"
                  }`}
                >
                  Offset Press
                </button>
              </div>
            </div>

            {/* Colors Front & Back */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Front Colors</label>
                <select
                  value={colorsFront}
                  onChange={(e) => setColorsFront(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                >
                  <option value={4}>4-Color (CMYK Multi)</option>
                  <option value={2}>2-Color</option>
                  <option value={1}>Single Color (1+0)</option>
                  <option value={0}>Blank (0)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Back Colors</label>
                <select
                  value={colorsBack}
                  onChange={(e) => setColorsBack(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                >
                  <option value={4}>4-Color (CMYK Multi)</option>
                  <option value={2}>2-Color</option>
                  <option value={1}>Single Color (Black)</option>
                  <option value={0}>Blank / Single Side (0)</option>
                </select>
              </div>

              {pressType === "OFFSET" ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">CTP Plate Rate (₹)</label>
                    <input
                      type="number"
                      value={plateRate}
                      onChange={(e) => setPlateRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Rate / 1k Imp (₹)</label>
                    <input
                      type="number"
                      value={impressionRatePer1000}
                      onChange={(e) => setImpressionRatePer1000(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Front Click Rate (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={digitalClickRateFront}
                      onChange={(e) => setDigitalClickRateFront(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Back Click Rate (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={digitalClickRateBack}
                      onChange={(e) => setDigitalClickRateBack(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 4: Post-Press Finishing, Binding & Profit Margin */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <Sparkles className="w-4 h-4 text-lime-700" />
                <span>4. Post-Press Finishing, Binding & Profit</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Step 4 of 4</span>
            </div>

            {/* Lamination Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Lamination Type</label>
                <select
                  value={lamination}
                  onChange={(e) => setLamination(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                >
                  <option value="NONE">None</option>
                  <option value="THERMAL_MATTE">Thermal Matte Lamination</option>
                  <option value="THERMAL_GLOSS">Thermal Gloss Lamination</option>
                  <option value="VELVET_TOUCH">Velvet / Soft Touch</option>
                  <option value="COLD_GLOSS">Cold Gloss Varnish</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Lamination Sides</label>
                <select
                  value={laminationSides}
                  onChange={(e) => setLaminationSides(parseInt(e.target.value) as any)}
                  disabled={lamination === "NONE"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 disabled:opacity-50"
                >
                  <option value={0}>0 (No Lamination)</option>
                  <option value={1}>Single Side (1 Side)</option>
                  <option value={2}>Both Sides (2 Sides)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Binding Method</label>
                <select
                  value={bindingType}
                  onChange={(e) => setBindingType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                >
                  <option value="NONE">None</option>
                  <option value="PAD_GUMMING">Pad Gumming / Bill Book</option>
                  <option value="SADDLE_STITCH">Saddle Stitching (Center Pin)</option>
                  <option value="PERFECT_BIND">Perfect Binding (Hot Melt)</option>
                  <option value="SPIRAL_WOL_BIND">Spiral / Wire-O Binding</option>
                </select>
              </div>
            </div>

            {/* Special Finishing Checkbox Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <label
                className={`p-2.5 rounded-2xl border flex items-center gap-2 cursor-pointer transition-all ${
                  foilStamping
                    ? "bg-amber-50 border-amber-300 text-amber-950 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={foilStamping}
                  onChange={(e) => setFoilStamping(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Gold/Silver Foil (+₹{foilCost})</span>
              </label>

              <label
                className={`p-2.5 rounded-2xl border flex items-center gap-2 cursor-pointer transition-all ${
                  dieCutting
                    ? "bg-lime-50 border-lime-300 text-slate-950 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={dieCutting}
                  onChange={(e) => setDieCutting(e.target.checked)}
                  className="rounded text-lime-600 focus:ring-lime-500"
                />
                <span>Die Punching (+₹{dieCost})</span>
              </label>

              <label
                className={`p-2.5 rounded-2xl border flex items-center gap-2 cursor-pointer transition-all ${
                  creasingFolding
                    ? "bg-sky-50 border-sky-300 text-sky-950 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={creasingFolding}
                  onChange={(e) => setCreasingFolding(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Creasing/Fold (+₹{creasingCost})</span>
              </label>

              <label
                className={`p-2.5 rounded-2xl border flex items-center gap-2 cursor-pointer transition-all ${
                  numbering
                    ? "bg-purple-50 border-purple-300 text-purple-950 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={numbering}
                  onChange={(e) => setNumbering(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Sequential No. (+₹{numberingCost})</span>
              </label>
            </div>

            {/* Profit Margin Slider */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-extrabold text-slate-800">Target Profit Margin Markup</span>
                <span className="font-mono font-black text-lime-700 text-sm">{profitMarginPercent}% Margin</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={profitMarginPercent}
                onChange={(e) => setProfitMarginPercent(parseInt(e.target.value) || 0)}
                className="w-full accent-lime-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                <span>0% (At Cost)</span>
                <span>25% (Standard)</span>
                <span>35% (Recommended)</span>
                <span>50%+ (Retail)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: 2D VISUALIZER & DETAILED SUMMARY (5 COLS) */}
        {/* ==================================================== */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4">
          {/* 2D Cut Visualizer */}
          <PaperCutVisualizer
            sheetWidth={sheetWidth}
            sheetHeight={sheetHeight}
            itemWidth={itemWidth}
            itemHeight={itemHeight}
            bleed={bleed}
            sheetName={
              PAPER_SHEET_PRESETS.find((p) => p.id === selectedSheetPreset)?.name || "Master Sheet"
            }
            itemName={jobTitle}
          />

          {/* Raw Material Requirements Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <span className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Boxes className="w-4 h-4 text-slate-500" />
                Raw Paper Material Consumption
              </span>
              <span className="font-mono font-extrabold text-lime-700 bg-lime-50 px-2.5 py-0.5 rounded-full border border-lime-200/50">
                {calculationResult.ups} Ups / Sheet
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Gross Sheets Required:</span>
                <span className="font-mono font-extrabold text-slate-900">
                  {calculationResult.totalMasterSheetsRequired} sheets <span className="text-[10px] text-slate-400 font-normal">({pressWastagePercent}% waste)</span>
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Reams Required (500s):</span>
                <span className="font-mono font-bold text-slate-900">
                  {calculationResult.totalReamsRequired} reams
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Total Paper Weight:</span>
                <span className="font-mono font-bold text-slate-900">
                  {calculationResult.totalPaperWeightKg} kg <span className="text-[10px] text-slate-400 font-normal">({gsm} GSM)</span>
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Total Press Impressions:</span>
                <span className="font-mono font-bold text-slate-900">
                  {calculationResult.totalImpressions} passes
                </span>
              </div>
            </div>
          </div>

          {/* Costing Breakdown & Final Estimate Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <span className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Costing Breakdown & Estimate
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Net Cost + Margin</span>
            </div>

            {/* Individual Cost Lines */}
            <div className="space-y-2 font-medium text-slate-600">
              <div className="flex justify-between">
                <span>1. Raw Paper Cost:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(calculationResult.paperCost)}
                </span>
              </div>

              {pressType === "OFFSET" && (
                <div className="flex justify-between">
                  <span>2. Pre-Press CTP Plates:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(calculationResult.plateCost)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>3. Machine Printing Run:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(calculationResult.printingCost)}
                </span>
              </div>

              {calculationResult.laminationCost > 0 && (
                <div className="flex justify-between">
                  <span>4. Lamination ({laminationSides} sides):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(calculationResult.laminationCost)}
                  </span>
                </div>
              )}

              {(calculationResult.foilCost > 0 ||
                calculationResult.dieCost > 0 ||
                calculationResult.creasingCost > 0 ||
                calculationResult.numberingCost > 0 ||
                calculationResult.bindingCost > 0) && (
                <div className="flex justify-between">
                  <span>5. Finishing, Foiling & Binding:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(
                      calculationResult.foilCost +
                        calculationResult.dieCost +
                        calculationResult.creasingCost +
                        calculationResult.numberingCost +
                        calculationResult.bindingCost
                    )}
                  </span>
                </div>
              )}

              {/* Total Production Cost */}
              <div className="flex justify-between pt-2.5 border-t border-dashed border-slate-200 font-extrabold text-slate-900">
                <span>TOTAL PRODUCTION COST:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {formatCurrency(calculationResult.totalProductionCost)}
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Cost Per Unit:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(calculationResult.costPerUnit)} / pc
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-bold">
                <span>(+) Profit Margin ({profitMarginPercent}%):</span>
                <span className="font-mono">+{formatCurrency(calculationResult.profitMarginAmount)}</span>
              </div>

              {calculationResult.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>(+) GST ({taxPercent}%):</span>
                  <span className="font-mono">+{formatCurrency(calculationResult.taxAmount)}</span>
                </div>
              )}
            </div>

            {/* GRAND TOTAL HIGHLIGHT BOX */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  SUGGESTED SELLING PRICE:
                </span>
                <span className="text-2xl font-black text-lime-400 font-mono">
                  {formatCurrency(calculationResult.grandTotal)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400">Unit Price for {quantity} pcs:</span>
                <span className="font-mono font-extrabold text-white text-sm">
                  {formatCurrency(calculationResult.sellingPricePerUnit)} / pc
                </span>
              </div>
            </div>

            {/* Quick Export Action Triggers */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsExportQuotationOpen(true)}
                className="py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
              >
                <FileText className="w-3.5 h-3.5 text-lime-400" />
                <span>Export Quotation</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportJobOpen(true)}
                className="py-2.5 px-3 rounded-2xl bg-lime-500 hover:bg-lime-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
              >
                <Layers className="w-3.5 h-3.5 text-slate-950" />
                <span>Create Job Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: EXPORT TO QUOTATION DIALOG                  */}
      {/* ==================================================== */}
      {isExportQuotationOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Export to Customer Quotation</h3>
                  <p className="text-xs text-slate-400">Generate proforma estimate from calculation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportQuotationOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExportQuotationSubmit} className="space-y-4 my-4">
              {/* Customer Autocomplete */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Existing Customer (Optional)</label>
                <SearchableSelect
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={(val) => {
                    setSelectedCustomerId(val);
                    const c = customers.find((cust) => cust.id === val);
                    if (c) {
                      setCustomerName(c.name);
                      setCustomerPhone(c.phone || "");
                    }
                  }}
                  placeholder="Search customer by name or phone..."
                />
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Phone (+91)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Summary Preview */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Item:</span>
                  <span className="font-bold text-slate-900">{jobTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity & Rate:</span>
                  <span className="font-bold text-slate-900">
                    {quantity} pcs @ {formatCurrency(calculationResult.sellingPricePerUnit)}
                  </span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-lime-700">{formatCurrency(calculationResult.grandTotal)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportQuotationOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-lime-400" />
                  <span>{isSubmitting ? "Generating..." : "Create Quotation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: EXPORT TO JOB ORDER DIALOG                  */}
      {/* ==================================================== */}
      {isExportJobOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4 text-lime-800" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Send to Live Job Order</h3>
                  <p className="text-xs text-slate-400">Create work order ticket with cutting layout attached</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportJobOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExportJobSubmit} className="space-y-4 my-4">
              {/* Customer Autocomplete */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Customer</label>
                <SearchableSelect
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={(val) => {
                    setSelectedCustomerId(val);
                    const c = customers.find((cust) => cust.id === val);
                    if (c) {
                      setCustomerName(c.name);
                      setCustomerPhone(c.phone || "");
                    }
                  }}
                  placeholder="Search customer by name or phone..."
                />
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone (+91)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Job Specs Attached */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1 text-slate-900">
                <div className="flex justify-between font-bold">
                  <span>Job:</span>
                  <span>{jobTitle}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paper Cutting Specs:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {calculationResult.ups} ups on {sheetWidth}″×{sheetHeight}″ ({calculationResult.totalMasterSheetsRequired} sheets)
                  </span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200 text-slate-900">
                  <span>Order Total:</span>
                  <span className="text-lime-700">{formatCurrency(calculationResult.grandTotal)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportJobOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Layers className="w-3.5 h-3.5 text-lime-400" />
                  <span>{isSubmitting ? "Creating..." : "Create Job Order"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
