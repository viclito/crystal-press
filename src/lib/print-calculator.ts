// ====================================================
// CRYSTAL PRESS — PRINT ESTIMATION & IMPOSITION ENGINE
// ====================================================

export interface PaperSheetPreset {
  id: string;
  name: string;
  width: number; // in inches
  height: number; // in inches
  category: "DIGITAL" | "OFFSET" | "LARGE_FORMAT" | "CUSTOM";
  description?: string;
}

export interface JobSizePreset {
  id: string;
  name: string;
  width: number; // in inches
  height: number; // in inches
  category: "STATIONERY" | "MARKETING" | "BOOKS" | "OUTDOOR" | "CUSTOM";
  defaultGsm?: number;
  defaultFinish?: string;
  bleed?: number; // in inches
}

export const PAPER_SHEET_PRESETS: PaperSheetPreset[] = [
  { id: "12x18", name: "12″ × 18″ (Digital SRA3-)", width: 12, height: 18, category: "DIGITAL", description: "Standard digital color press sheet (Konica / Xerox / Canon)" },
  { id: "13x19", name: "13″ × 19″ (Super Digital A3+)", width: 13, height: 19, category: "DIGITAL", description: "Extended digital sheet with full bleed margin" },
  { id: "18x23", name: "18″ × 23″ (Full Demy)", width: 18, height: 23, category: "OFFSET", description: "Standard offset printing master sheet" },
  { id: "23x36", name: "23″ × 36″ (Double Demy)", width: 23, height: 36, category: "OFFSET", description: "Large offset sheet for books & packaging" },
  { id: "20x30", name: "20″ × 30″ (Double Crown)", width: 20, height: 30, category: "OFFSET", description: "Ideal for posters, jackets, large folders" },
  { id: "20x26", name: "20″ × 26″ (Royal)", width: 20, height: 26, category: "OFFSET", description: "Premium board & packaging master sheet" },
  { id: "22x28", name: "22″ × 28″ (Half Imperial)", width: 22, height: 28, category: "OFFSET", description: "Cardboard, calendar & heavy cover stocks" },
  { id: "15x20", name: "15″ × 20″ (Crown)", width: 15, height: 20, category: "OFFSET", description: "Small offset & bill book master sheet" },
  { id: "custom", name: "Custom Sheet Dimensions", width: 18, height: 23, category: "CUSTOM", description: "Enter custom master sheet width and height" },
];

export const JOB_SIZE_PRESETS: JobSizePreset[] = [
  { id: "visiting_card", name: "Visiting Cards (3.5″ × 2″)", width: 3.5, height: 2, category: "STATIONERY", defaultGsm: 350, defaultFinish: "Matte Lamination", bleed: 0.1 },
  { id: "a4_flyer", name: "A4 Letterhead / Flyer (8.27″ × 11.69″)", width: 8.27, height: 11.69, category: "MARKETING", defaultGsm: 100, defaultFinish: "None", bleed: 0.125 },
  { id: "a5_pamphlet", name: "A5 Pamphlet / Leaflet (5.83″ × 8.27″)", width: 5.83, height: 8.27, category: "MARKETING", defaultGsm: 130, defaultFinish: "Gloss Lamination", bleed: 0.125 },
  { id: "a3_poster", name: "A3 Poster (11.69″ × 16.54″)", width: 11.69, height: 16.54, category: "MARKETING", defaultGsm: 170, defaultFinish: "Thermal Gloss", bleed: 0.125 },
  { id: "a6_card", name: "A6 Postcard / Invite (4.13″ × 5.83″)", width: 4.13, height: 5.83, category: "STATIONERY", defaultGsm: 300, defaultFinish: "Matte Lamination", bleed: 0.1 },
  { id: "bill_book_1_5", name: "Bill Book 1/5 Demy (7″ × 8.5″)", width: 7.0, height: 8.5, category: "BOOKS", defaultGsm: 55, defaultFinish: "Binding & Numbering", bleed: 0 },
  { id: "bill_book_1_4", name: "Bill Book 1/4 Demy (8.5″ × 11″)", width: 8.5, height: 11.0, category: "BOOKS", defaultGsm: 55, defaultFinish: "Binding & Numbering", bleed: 0 },
  { id: "envelope_9x4", name: "Office Envelope #10 (9.25″ × 4.25″)", width: 9.25, height: 4.25, category: "STATIONERY", defaultGsm: 100, defaultFinish: "Die-Cutting", bleed: 0.1 },
  { id: "hang_tag", name: "Product Hang Tag (2″ × 3.5″)", width: 2.0, height: 3.5, category: "STATIONERY", defaultGsm: 350, defaultFinish: "Hole Punch & Lamination", bleed: 0.1 },
  { id: "custom_job", name: "Custom Cut Dimensions", width: 6.0, height: 4.0, category: "CUSTOM", defaultGsm: 250, defaultFinish: "None", bleed: 0.1 },
];

export interface ImpositionResult {
  orientation: "STANDARD" | "ROTATED";
  cols: number;
  rows: number;
  ups: number;
  wastePercent: number;
  sheetWidth: number;
  sheetHeight: number;
  itemWidthWithBleed: number;
  itemHeightWithBleed: number;
  gripperMargin: number;
  usableWidth: number;
  usableHeight: number;
}

/**
 * Calculates optimal 2D cutting / imposition layout of items on a parent sheet.
 */
export function calculateImposition(
  sheetWidth: number,
  sheetHeight: number,
  itemWidth: number,
  itemHeight: number,
  bleed: number = 0.05,
  gripperMargin: number = 0.35
): {
  optimal: ImpositionResult;
  standard: ImpositionResult;
  rotated: ImpositionResult;
} {
  const itemW = itemWidth + bleed * 2;
  const itemH = itemHeight + bleed * 2;

  // Usable sheet area after reserving gripper & edges
  const usableW = Math.max(0.5, sheetWidth - gripperMargin);
  const usableH = Math.max(0.5, sheetHeight - gripperMargin);

  const totalSheetArea = sheetWidth * sheetHeight;

  // 1. Standard Orientation (Item upright)
  const stdCols = Math.floor(usableW / itemW);
  const stdRows = Math.floor(usableH / itemH);
  const stdUps = Math.max(0, stdCols * stdRows);
  const stdUsedArea = stdUps * (itemWidth * itemHeight);
  const stdWaste = totalSheetArea > 0 ? Math.max(0, ((totalSheetArea - stdUsedArea) / totalSheetArea) * 100) : 0;

  const standard: ImpositionResult = {
    orientation: "STANDARD",
    cols: stdCols,
    rows: stdRows,
    ups: stdUps,
    wastePercent: Number(stdWaste.toFixed(1)),
    sheetWidth,
    sheetHeight,
    itemWidthWithBleed: itemW,
    itemHeightWithBleed: itemH,
    gripperMargin,
    usableWidth: usableW,
    usableHeight: usableH,
  };

  // 2. Rotated Orientation (Item turned 90 degrees)
  const rotCols = Math.floor(usableW / itemH);
  const rotRows = Math.floor(usableH / itemW);
  const rotUps = Math.max(0, rotCols * rotRows);
  const rotUsedArea = rotUps * (itemWidth * itemHeight);
  const rotWaste = totalSheetArea > 0 ? Math.max(0, ((totalSheetArea - rotUsedArea) / totalSheetArea) * 100) : 0;

  const rotated: ImpositionResult = {
    orientation: "ROTATED",
    cols: rotCols,
    rows: rotRows,
    ups: rotUps,
    wastePercent: Number(rotWaste.toFixed(1)),
    sheetWidth,
    sheetHeight,
    itemWidthWithBleed: itemH,
    itemHeightWithBleed: itemW,
    gripperMargin,
    usableWidth: usableW,
    usableHeight: usableH,
  };

  const optimal = rotUps > stdUps ? rotated : standard;

  return { optimal, standard, rotated };
}

export interface PrintCostCalculationParams {
  // Quantities & Dimensions
  quantity: number;
  sheetWidth: number;
  sheetHeight: number;
  itemWidth: number;
  itemHeight: number;
  bleed?: number;
  pressType: "OFFSET" | "DIGITAL";
  
  // Paper Specs & Pricing
  gsm: number;
  paperPricingMode: "PER_SHEET" | "PER_KG" | "PER_REAM";
  paperRatePerUnit: number; // e.g., ₹3.50/sheet, or ₹120/kg, or ₹1,400/ream (500 sheets)
  pressWastagePercent: number; // e.g. 5%

  // Offset Pre-Press (Plates)
  plateType: "CTP_THERMAL" | "PS_CONVENTIONAL" | "POLY_MASTER" | "NONE";
  plateRate: number; // e.g. ₹200/plate
  colorsFront: number; // 1, 2, 4
  colorsBack: number; // 0, 1, 2, 4

  // Machine Run / Impressions
  impressionRatePer1000: number; // e.g. ₹150 / 1,000 impressions
  minMachineCharge: number; // e.g. ₹400 base setup
  digitalClickRateFront: number; // e.g. ₹6.00 / A3 click
  digitalClickRateBack: number; // e.g. ₹5.50 / A3 click

  // Post-Press / Finishing Options
  lamination: "NONE" | "THERMAL_MATTE" | "THERMAL_GLOSS" | "VELVET_TOUCH" | "COLD_GLOSS";
  laminationSides: 0 | 1 | 2;
  laminationRatePerSqInch: number; // e.g. ₹0.0018 / sq inch

  uvVarnish: "NONE" | "FULL_UV" | "SPOT_UV" | "DRIP_OFF";
  uvCost: number; // Fixed setup + per sheet cost

  foilStamping: boolean;
  foilCost: number;

  dieCutting: boolean;
  dieCost: number;

  creasingFolding: boolean;
  creasingCost: number;

  numbering: boolean;
  numberingCost: number;

  bindingType: "NONE" | "PAD_GUMMING" | "SADDLE_STITCH" | "PERFECT_BIND" | "SPIRAL_WOL_BIND";
  bindingUnitCost: number; // e.g. ₹5 per book / ₹2 per pad

  // Profit Margin
  profitMarginPercent: number; // e.g. 30%
  taxPercent: number; // e.g. 18% GST
}

export interface PrintCostCalculationResult {
  // Imposition Stats
  ups: number;
  orientation: "STANDARD" | "ROTATED";
  wastePercent: number;
  totalMasterSheetsRequired: number;
  totalPrintSheetsRequired: number;
  totalReamsRequired: number;
  totalPaperWeightKg: number;
  totalImpressions: number;

  // Cost Breakdown
  paperCost: number;
  plateCost: number;
  printingCost: number;
  laminationCost: number;
  uvCost: number;
  foilCost: number;
  dieCost: number;
  creasingCost: number;
  numberingCost: number;
  bindingCost: number;

  // Financial Totals
  totalProductionCost: number;
  costPerUnit: number;
  profitMarginAmount: number;
  sellingSubTotal: number;
  taxAmount: number;
  grandTotal: number;
  sellingPricePerUnit: number;
}

/**
 * Calculates complete end-to-end commercial print job costing.
 */
export function calculatePrintCost(params: PrintCostCalculationParams): PrintCostCalculationResult {
  const {
    quantity = 1000,
    sheetWidth = 18,
    sheetHeight = 23,
    itemWidth = 3.5,
    itemHeight = 2,
    bleed = 0.05,
    pressType = "OFFSET",
    gsm = 300,
    paperPricingMode = "PER_SHEET",
    paperRatePerUnit = 3.5,
    pressWastagePercent = 5,
    plateType = "CTP_THERMAL",
    plateRate = 200,
    colorsFront = 4,
    colorsBack = 4,
    impressionRatePer1000 = 150,
    minMachineCharge = 400,
    digitalClickRateFront = 6,
    digitalClickRateBack = 5.5,
    lamination = "NONE",
    laminationSides = 0,
    laminationRatePerSqInch = 0.0018,
    uvVarnish = "NONE",
    uvCost = 0,
    foilStamping = false,
    foilCost = 0,
    dieCutting = false,
    dieCost = 0,
    creasingFolding = false,
    creasingCost = 0,
    numbering = false,
    numberingCost = 0,
    bindingType = "NONE",
    bindingUnitCost = 0,
    profitMarginPercent = 30,
    taxPercent = 0,
  } = params;

  // 1. Calculate Imposition
  const imp = calculateImposition(sheetWidth, sheetHeight, itemWidth, itemHeight, bleed);
  const ups = Math.max(1, imp.optimal.ups);

  // 2. Calculate Sheets Needed
  const netSheets = Math.ceil(quantity / ups);
  const wastageSheets = Math.ceil(netSheets * (pressWastagePercent / 100));
  const totalSheets = netSheets + wastageSheets;
  const totalReams = totalSheets / 500;

  // GSM weight formula: (L * W * GSM * Sheets) / 3,100,000 = kg
  const totalWeightKg = Number(
    ((sheetWidth * sheetHeight * gsm * totalSheets) / 3100000).toFixed(2)
  );

  // 3. Paper Cost
  let paperCost = 0;
  if (paperPricingMode === "PER_SHEET") {
    paperCost = totalSheets * paperRatePerUnit;
  } else if (paperPricingMode === "PER_KG") {
    paperCost = totalWeightKg * paperRatePerUnit;
  } else if (paperPricingMode === "PER_REAM") {
    paperCost = totalReams * paperRatePerUnit;
  }

  // 4. Plate Cost (Pre-Press)
  let plateCost = 0;
  if (pressType === "OFFSET" && plateType !== "NONE") {
    const totalPlates = colorsFront + colorsBack;
    plateCost = totalPlates * plateRate;
  }

  // 5. Machine Run / Impression Cost
  let printingCost = 0;
  const totalImpressions = totalSheets * (colorsBack > 0 ? 2 : 1);

  if (pressType === "OFFSET") {
    const runsThousand = Math.ceil(totalSheets / 1000);
    const frontRunCost = Math.max(minMachineCharge, runsThousand * impressionRatePer1000 * Math.max(1, colorsFront));
    const backRunCost = colorsBack > 0 ? Math.max(minMachineCharge, runsThousand * impressionRatePer1000 * colorsBack) : 0;
    printingCost = frontRunCost + backRunCost;
  } else {
    // Digital Click Charges
    const frontClicks = totalSheets * digitalClickRateFront;
    const backClicks = colorsBack > 0 ? totalSheets * digitalClickRateBack : 0;
    printingCost = frontClicks + backClicks;
  }

  // 6. Finishing Costs
  // Lamination
  let calculatedLaminationCost = 0;
  if (lamination !== "NONE" && laminationSides > 0) {
    const sheetAreaSqInches = sheetWidth * sheetHeight;
    calculatedLaminationCost = totalSheets * sheetAreaSqInches * laminationSides * laminationRatePerSqInch;
  }

  // UV / Varnish
  const calculatedUvCost = uvVarnish !== "NONE" ? uvCost : 0;

  // Foiling, Die Cutting, Creasing, Numbering
  const calculatedFoilCost = foilStamping ? foilCost : 0;
  const calculatedDieCost = dieCutting ? dieCost : 0;
  const calculatedCreasingCost = creasingFolding ? creasingCost : 0;
  const calculatedNumberingCost = numbering ? numberingCost : 0;

  // Binding
  const calculatedBindingCost = bindingType !== "NONE" ? quantity * bindingUnitCost : 0;

  // 7. Aggregate Total Production Cost
  const totalProductionCost =
    paperCost +
    plateCost +
    printingCost +
    calculatedLaminationCost +
    calculatedUvCost +
    calculatedFoilCost +
    calculatedDieCost +
    calculatedCreasingCost +
    calculatedNumberingCost +
    calculatedBindingCost;

  const costPerUnit = quantity > 0 ? totalProductionCost / quantity : 0;

  // 8. Profit & Selling Price
  const marginMultiplier = 1 + profitMarginPercent / 100;
  const sellingSubTotal = totalProductionCost * marginMultiplier;
  const profitMarginAmount = sellingSubTotal - totalProductionCost;

  const taxAmount = (sellingSubTotal * (taxPercent || 0)) / 100;
  const grandTotal = Math.round(sellingSubTotal + taxAmount);
  const sellingPricePerUnit = quantity > 0 ? grandTotal / quantity : 0;

  return {
    ups,
    orientation: imp.optimal.orientation,
    wastePercent: imp.optimal.wastePercent,
    totalMasterSheetsRequired: totalSheets,
    totalPrintSheetsRequired: totalSheets,
    totalReamsRequired: Number(totalReams.toFixed(2)),
    totalPaperWeightKg: totalWeightKg,
    totalImpressions,

    paperCost: Number(paperCost.toFixed(2)),
    plateCost: Number(plateCost.toFixed(2)),
    printingCost: Number(printingCost.toFixed(2)),
    laminationCost: Number(calculatedLaminationCost.toFixed(2)),
    uvCost: Number(calculatedUvCost.toFixed(2)),
    foilCost: Number(calculatedFoilCost.toFixed(2)),
    dieCost: Number(calculatedDieCost.toFixed(2)),
    creasingCost: Number(calculatedCreasingCost.toFixed(2)),
    numberingCost: Number(calculatedNumberingCost.toFixed(2)),
    bindingCost: Number(calculatedBindingCost.toFixed(2)),

    totalProductionCost: Number(totalProductionCost.toFixed(2)),
    costPerUnit: Number(costPerUnit.toFixed(2)),
    profitMarginAmount: Number(profitMarginAmount.toFixed(2)),
    sellingSubTotal: Number(sellingSubTotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    sellingPricePerUnit: Number(sellingPricePerUnit.toFixed(2)),
  };
}
