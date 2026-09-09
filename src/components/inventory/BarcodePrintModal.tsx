"use client";

import React, { useState, useMemo } from "react";
import { X, Printer, Barcode, Layers, ExternalLink, Minus, Plus } from "lucide-react";
import { generateBarcodeSvgString } from "@/utils/barcodeSvg";
import { printBarcodeSticker } from "./BarcodeStickerPrint";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    skuCode: string;
    barcode?: string | null;
    sellingPrice: number | string;
    currentStock?: number | string;
    unit?: { code: string; name: string } | null;
  } | null;
}

export function BarcodePrintModal({ isOpen, onClose, product }: BarcodePrintModalProps) {
  const [quantity, setQuantity] = useState<number>(24);
  const [template, setTemplate] = useState<"A4_24_UP" | "THERMAL_50x25">("A4_24_UP");

  const barcodeText = product?.barcode?.trim() || product?.skuCode?.trim() || "CP-000000";

  // Generate live preview SVG
  const previewSvg = useMemo(() => {
    return generateBarcodeSvgString(barcodeText, {
      height: template === "THERMAL_50x25" ? 28 : 32,
      moduleWidth: 1.15,
      quietZone: 4,
      showText: false,
    });
  }, [barcodeText, template]);

  React.useEffect(() => {
    if (product) {
      const stock = Math.max(1, Math.round(Number(product.currentStock) || 0));
      const def = stock > 0 && stock <= 48 ? stock : 24;
      setQuantity(def);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleQuantityChange = (val: number) => {
    const clamped = Math.max(1, Math.min(500, val));
    setQuantity(clamped);
  };

  const handlePrint = () => {
    printBarcodeSticker(product, {
      count: quantity,
      template,
      shopName: "CRYSTAL PRESS",
    });
    onClose();
  };

  const a4Pages = Math.ceil(quantity / 24);
  const remainingOnLastPage = a4Pages * 24 - quantity;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[95vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Print Barcode Stickers
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Sticker Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Live Label Preview (100% Vector SVG)
            </label>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
              Laser / Camera Crisp
            </span>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 flex justify-center">
            {template === "THERMAL_50x25" ? (
              /* Thermal 50x25mm Preview */
              <div className="w-[190px] h-[105px] bg-white border border-slate-300 rounded-lg p-2.5 flex flex-col justify-between items-center text-center shadow-sm">
                <span className="text-[7px] font-extrabold uppercase tracking-wider text-slate-500">
                  CRYSTAL PRESS
                </span>
                <span className="text-[9px] font-bold text-slate-900 truncate w-full">
                  {product.name}
                </span>
                <div
                  className="w-full h-[38px] flex items-center justify-center my-0.5"
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
                <div className="w-full flex items-center justify-between text-[8px] font-bold px-1 text-slate-900">
                  <span className="font-mono text-slate-600">{barcodeText}</span>
                  <span>MRP: ₹{Number(product.sellingPrice).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              /* A4 24-Up Sticker Preview */
              <div className="w-[220px] h-[115px] bg-white border border-slate-300 rounded-lg p-2.5 flex flex-col justify-between items-center text-center shadow-sm">
                <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-500">
                  CRYSTAL PRESS
                </span>
                <span className="text-[9.5px] font-bold text-slate-900 line-clamp-2 max-h-[26px] leading-tight">
                  {product.name}
                </span>
                <div
                  className="w-full h-[40px] flex items-center justify-center my-0.5"
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
                <div className="w-full flex items-center justify-between text-[8.5px] font-bold px-1 text-slate-900">
                  <span className="font-mono text-slate-600">{barcodeText}</span>
                  <span>MRP: ₹{Number(product.sellingPrice).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paper & Template Selection */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Print Format & Layout
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setTemplate("A4_24_UP")}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all",
                template === "A4_24_UP"
                  ? "border-lime-500 bg-lime-50/50 ring-2 ring-lime-400/20 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">A4 Sticker Sheet</span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  24-Up
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Standard 3×8 grid on A4 label paper. Fits cleanly on 1 page.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTemplate("THERMAL_50x25")}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all",
                template === "THERMAL_50x25"
                  ? "border-lime-500 bg-lime-50/50 ring-2 ring-lime-400/20 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Thermal Roll</span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  50×25mm
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Single label continuous roll for TVS, TSC, Zebra printers.
              </p>
            </button>
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Number of Stickers to Print
            </label>
            <span className="text-xs font-semibold text-slate-500">
              Current Stock: <strong className="text-slate-900">{product.currentStock || 0} {product.unit?.code || "pcs"}</strong>
            </span>
          </div>

          {/* Stepper Input */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-slate-200 rounded-2xl p-1 bg-white flex-1">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="flex-1 text-center font-black text-lg text-slate-900 focus:outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Number(product.currentStock) > 0 && (
              <button
                type="button"
                onClick={() => handleQuantityChange(Number(product.currentStock))}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-bold transition-all border",
                  quantity === Number(product.currentStock)
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                Current Stock ({product.currentStock})
              </button>
            )}

            <button
              type="button"
              onClick={() => handleQuantityChange(24)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-bold transition-all border",
                quantity === 24
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              1 Sheet (24)
            </button>

            <button
              type="button"
              onClick={() => handleQuantityChange(48)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-bold transition-all border",
                quantity === 48
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              2 Sheets (48)
            </button>

            <button
              type="button"
              onClick={() => handleQuantityChange(1)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-bold transition-all border",
                quantity === 1
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              1 Label
            </button>

            <button
              type="button"
              onClick={() => handleQuantityChange(10)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-bold transition-all border",
                quantity === 10
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              10 Labels
            </button>
          </div>
        </div>

        {/* Dynamic Calculation Info Banner */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
          {template === "A4_24_UP" ? (
            <div className="flex items-center gap-2 text-slate-700">
              <Layers className="w-4 h-4 text-lime-800 shrink-0" />
              <span>
                Printing <strong>{quantity} stickers</strong> across{" "}
                <strong>{a4Pages} A4 {a4Pages === 1 ? "page" : "pages"}</strong>
                {a4Pages === 1 && remainingOnLastPage > 0 ? (
                  <span className="text-slate-400"> ({remainingOnLastPage} blank slots remaining)</span>
                ) : null}
                {a4Pages === 1 && remainingOnLastPage === 0 ? (
                  <span className="text-emerald-700 font-semibold"> (Full 1-page sheet)</span>
                ) : null}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-700">
              <Printer className="w-4 h-4 text-lime-800 shrink-0" />
              <span>
                Printing <strong>{quantity} continuous labels</strong> on 50×25mm thermal roll.
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
          <Link
            href="/barcodes"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-800 flex items-center gap-1 font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Barcode Studio
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-lime-400" />
              Print {quantity} {quantity === 1 ? "Label" : "Labels"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
