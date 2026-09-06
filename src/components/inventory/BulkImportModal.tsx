"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { bulkImportProducts, BulkProductRow } from "@/actions/bulkImport";
import { toast } from "@/stores/useSnackbarStore";
import confetti from "canvas-confetti";
import { formatCurrency } from "@/lib/utils";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkProductRow[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip">("update");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-normalize column keys from any Excel / CSV header variation
  const normalizeRow = (raw: Record<string, any>): BulkProductRow => {
    const keys = Object.keys(raw);
    const findVal = (regex: RegExp) => {
      const matchedKey = keys.find((k) => regex.test(k.trim()));
      return matchedKey !== undefined ? raw[matchedKey] : undefined;
    };

    const name = findVal(/name|product|item|title/i) || "";
    const skuCode = findVal(/sku|code|item_code|itemcode/i);
    const barcode = findVal(/barcode|ean|upc/i);
    const categoryName = findVal(/category|cat/i);
    const subCategoryName = findVal(/subcategory|sub_category|type/i);
    const unitCode = findVal(/unit|uom/i);
    const sellingPrice = Number(findVal(/selling_price|price|rate|mrp|sale_price/i)) || 0;
    const costPrice = Number(findVal(/cost|cost_price|buy_price|purchase_rate/i)) || 0;
    const currentStock = Number(findVal(/stock|qty|quantity|current_stock|opening_stock/i)) || 0;
    const minStockAlert = Number(findVal(/min_stock|alert|min_alert/i)) || 10;
    const taxPercent = Number(findVal(/tax|gst|tax_percent/i)) || 0;

    return {
      name: String(name).trim(),
      skuCode: skuCode ? String(skuCode).trim() : undefined,
      barcode: barcode ? String(barcode).trim() : undefined,
      categoryName: categoryName ? String(categoryName).trim() : undefined,
      subCategoryName: subCategoryName ? String(subCategoryName).trim() : undefined,
      unitCode: unitCode ? String(unitCode).trim() : undefined,
      sellingPrice,
      costPrice,
      currentStock,
      minStockAlert,
      taxPercent,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processFile(selected);
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg("");
    setImportResult(null);

    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = (results.data as any[])
            .map(normalizeRow)
            .filter((r) => r.name && r.name.length > 0);
          setParsedRows(rows);
        },
        error: (err) => {
          setErrorMsg(`CSV Parse Error: ${err.message}`);
        },
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

          const rows = (data as any[])
            .map(normalizeRow)
            .filter((r) => r.name && r.name.length > 0);
          setParsedRows(rows);
        } catch (err: any) {
          setErrorMsg(`Excel Parse Error: ${err.message}`);
        }
      };
      reader.readAsBinaryString(selectedFile);
    } else {
      setErrorMsg("Unsupported file format. Please upload a .csv or .xlsx file.");
    }
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "Product Name": "JK Copier Paper 75 GSM A4 Ream",
        "SKU Code": "PAP-JK-75A4",
        Barcode: "890123450001",
        Category: "Paper & Boards",
        "Sub Category": "A4 Copier Paper",
        Unit: "ream",
        "Cost Price": "280.00",
        "Selling Price": "340.00",
        "Opening Stock": "100",
        "Min Stock Alert": "20",
        "Tax Percent": "0",
      },
      {
        "Product Name": "Reynolds 045 Fine Ballpoint Pen (Blue, Box of 20)",
        "SKU Code": "PEN-REY-045B",
        Barcode: "890123450010",
        Category: "Stationery & Writing",
        "Sub Category": "Pens",
        Unit: "box",
        "Cost Price": "150.00",
        "Selling Price": "200.00",
        "Opening Stock": "50",
        "Min Stock Alert": "10",
        "Tax Percent": "0",
      },
      {
        "Product Name": "Thermal Billing Paper Roll 80mm x 50m (Pack of 10)",
        "SKU Code": "CON-TH-8050",
        Barcode: "890123450030",
        Category: "Printing Consumables",
        "Sub Category": "Thermal Paper Rolls",
        Unit: "pkt",
        "Cost Price": "320.00",
        "Selling Price": "420.00",
        "Opening Stock": "40",
        "Min Stock Alert": "10",
        "Tax Percent": "0",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Template");
    XLSX.writeFile(wb, "CrystalPress_Inventory_Template.xlsx");
    toast.info("Sample Excel template downloaded", "Template Ready");
  };

  const handleStartImport = async () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);
    setErrorMsg("");

    const res = await bulkImportProducts(parsedRows, { duplicateStrategy });

    setIsProcessing(false);
    if (res.success) {
      setImportResult(res);
      toast.success(
        `Imported ${res.createdCount} products, updated ${res.updatedCount} products successfully!`,
        "Bulk Import Complete"
      );
      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    } else {
      setErrorMsg((res as any).error || "Failed to process import");
      toast.error((res as any).error || "Failed to process import", "Import Failed");
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setImportResult(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bulk Product Import (Excel / CSV)</h3>
              <p className="text-xs text-slate-400">Import 1,500+ stationery items and prices in seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Screen */}
        {importResult ? (
          <div className="py-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-lime-100 text-lime-800 rounded-3xl mx-auto flex items-center justify-center shadow-lime">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-900">Import Completed!</h4>
              <p className="text-xs text-slate-500 mt-1">Your inventory master has been updated.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-800">New Added</span>
                <div className="text-xl font-black text-emerald-900 mt-0.5">{importResult.createdCount}</div>
              </div>
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100">
                <span className="text-[10px] uppercase font-bold text-sky-800">Updated</span>
                <div className="text-xl font-black text-sky-900 mt-0.5">{importResult.updatedCount}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-600">Total Rows</span>
                <div className="text-xl font-black text-slate-900 mt-0.5">{importResult.totalProcessed}</div>
              </div>
            </div>

            <div className="pt-4 flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload Another File</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md"
              >
                Done & View Catalog
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-4 custom-scrollbar">
            {errorMsg && (
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Template Download Prompt */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Need a starting spreadsheet format?</span>
                <span className="text-[11px] text-slate-400">
                  Download our pre-formatted Excel template with sample stationery & paper items.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-lime-600" />
                <span>Download Sample Template (.xlsx)</span>
              </button>
            </div>

            {/* Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-lime-400 hover:bg-lime-50/20 rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-lime-100 flex items-center justify-center text-slate-600 group-hover:text-lime-800 transition-colors mb-2">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {file ? file.name : "Click or drag & drop your Excel / CSV sheet here"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Supports .xlsx, .xls, and .csv files up to 1,500+ items</p>
            </div>

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Parsed Items: <strong className="text-lime-700">{parsedRows.length} SKUs detected</strong>
                    </span>
                  </div>

                  {/* Duplicate Strategy Option */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 text-[11px]">If SKU/Barcode exists:</span>
                    <select
                      value={duplicateStrategy}
                      onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="update">Update Prices & Stock</option>
                      <option value="skip">Skip Existing</option>
                    </select>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-52 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Product Name</th>
                        <th className="p-2.5">SKU</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-right">Price (₹)</th>
                        <th className="p-2.5 text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {parsedRows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-2 text-slate-400 text-[10px]">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-800 truncate max-w-[200px]">{row.name}</td>
                          <td className="p-2 font-mono text-[10px] text-slate-500">{row.skuCode || "Auto"}</td>
                          <td className="p-2 text-slate-500">{row.categoryName || "General"}</td>
                          <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(row.sellingPrice)}</td>
                          <td className="p-2 text-center text-slate-700 font-semibold">{row.currentStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 15 && (
                  <p className="text-[10px] text-slate-400 text-center">
                    + Showing first 15 of {parsedRows.length} total rows
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!importResult && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0 || isProcessing}
              onClick={handleStartImport}
              className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md flex items-center gap-1.5 disabled:opacity-50 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-lime-400" />
              <span>{isProcessing ? `Importing ${parsedRows.length} SKUs...` : `Import ${parsedRows.length} Items`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
