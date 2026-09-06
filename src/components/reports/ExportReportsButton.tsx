"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, ChevronDown, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { FilteredReportData } from "@/actions/reports";
import { toast } from "@/stores/useSnackbarStore";
import { formatDate } from "@/lib/utils";

interface ExportReportsButtonProps {
  reportData: FilteredReportData;
}

export function ExportReportsButton({ reportData }: ExportReportsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const exportGSTR1 = () => {
    try {
      const dataRows = reportData.invoicesList.map((inv) => ({
        "Invoice Number": inv.invoiceNumber,
        "Invoice Date": formatDate(inv.createdAt),
        "Invoice Type": inv.invoiceType,
        "Customer Name": inv.customerName || "Walk-in Customer",
        "Customer Phone": inv.customerPhone || "N/A",
        "Payment Mode": inv.paymentMethod,
        "Taxable Subtotal (INR)": inv.subtotal,
        "GST Tax Amount (INR)": inv.taxAmount,
        "Discount (INR)": inv.discountAmount,
        "Net Total (INR)": inv.netTotal,
      }));

      const ws = XLSX.utils.json_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "GSTR-1 Sales");

      // Auto column widths
      const colWidths = [
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 20 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
      ];
      ws["!cols"] = colWidths;

      const fileName = `GSTR1_Sales_${reportData.dateRange.startDate}_to_${reportData.dateRange.endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.info(`Downloaded GSTR-1 Sales Report (${dataRows.length} rows)`, "Excel Exported");
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to export Excel report");
    }
  };

  const exportItemizedSales = () => {
    try {
      const productRows = reportData.topProducts.map((p) => ({
        "SKU Code": p.skuCode,
        "Product Name": p.name,
        "Quantity Sold": p.quantitySold,
        "Total Sales (INR)": p.totalRevenue,
        "Estimated Profit (INR)": p.totalProfit,
      }));

      const ws = XLSX.utils.json_to_sheet(productRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Itemized Products");

      const fileName = `Product_Sales_Register_${reportData.dateRange.startDate}_to_${reportData.dateRange.endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.info(`Downloaded Product Sales Register`, "Excel Exported");
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to export product sales");
    }
  };

  const exportDailyTimeline = () => {
    try {
      const timelineRows = reportData.dailyTimeline.map((d) => ({
        "Date": d.date,
        "Invoices Count": d.invoicesCount,
        "Total Revenue (INR)": d.revenue,
        "Estimated COGS (INR)": d.cost,
        "Gross Profit (INR)": d.profit,
      }));

      const ws = XLSX.utils.json_to_sheet(timelineRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daily Sales");

      const fileName = `Daily_Sales_Timeline_${reportData.dateRange.startDate}_to_${reportData.dateRange.endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.info(`Downloaded Daily Revenue Timeline`, "Excel Exported");
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to export timeline");
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        <span>Export Reports (Excel)</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Export to .XLSX
              </span>
            </div>

            <button
              onClick={exportGSTR1}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900">GSTR-1 Sales Report</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  All invoices, tax & GST breakdown
                </div>
              </div>
            </button>

            <button
              onClick={exportItemizedSales}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors mt-1"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900">Product Sales Register</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  Itemized quantities and margins
                </div>
              </div>
            </button>

            <button
              onClick={exportDailyTimeline}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors mt-1"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900">Daily Sales Timeline</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  Day-by-day revenue and invoice count
                </div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
