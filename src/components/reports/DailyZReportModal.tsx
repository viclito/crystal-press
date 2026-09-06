"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Building2,
  Layers,
  Sparkles,
} from "lucide-react";
import { generateDailyZReport, DailyZReportData } from "@/actions/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";

interface DailyZReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  shopAddress?: string;
  shopGstin?: string;
}

export function DailyZReportModal({
  isOpen,
  onClose,
  shopName = "Crystal Press",
  shopAddress = "12 Market Complex, Main Road",
  shopGstin = "36AAAAA0000A1Z5",
}: DailyZReportModalProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [openingCash, setOpeningCash] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<DailyZReportData | null>(null);

  const loadZReport = async () => {
    setLoading(true);
    try {
      const res = await generateDailyZReport(selectedDate, Number(openingCash) || 0);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        toast.error(res.error || "Failed to generate Daily Z-Report");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadZReport();
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!reportData) return;

    try {
      const expensesList =
        reportData.pettyCashExpenses && reportData.pettyCashExpenses.totalCashExpenses > 0
          ? `
            <div class="divider"></div>
            <div style="margin-bottom: 4px;">
              <div style="font-weight: bold; font-size: 10px; color: #b91c1c;">PETTY CASH & EXPENSES PAID: -₹${reportData.pettyCashExpenses.totalCashExpenses.toFixed(2)}</div>
              ${reportData.pettyCashExpenses.items
                .map(
                  (item: any) => `
                <div class="row" style="font-size: 9px; color: #555;">
                  <span>• ${item.title}</span>
                  <span>₹${Number(item.amount).toFixed(2)}</span>
                </div>
              `
                )
                .join("")}
            </div>
          `
          : "";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Daily Shift Z-Report #${reportData.reportNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm 4mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
            body { width: 72mm; font-size: 11px; line-height: 1.3; color: #000; padding: 2px; }
            .center { text-align: center; }
            .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center" style="padding-bottom: 4px;">
            <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${shopName}</div>
            <div style="font-size: 9px; color: #444;">${shopAddress}</div>
            ${shopGstin ? `<div style="font-size: 9px;">GSTIN: ${shopGstin}</div>` : ""}
            <div class="divider"></div>
            <div style="font-weight: bold; font-size: 11px; text-transform: uppercase;">*** DAILY SHIFT Z-REPORT ***</div>
          </div>

          <div style="font-size: 10px; line-height: 1.4;">
            <div class="row"><span>Report No:</span><span class="bold">${reportData.reportNumber}</span></div>
            <div class="row"><span>Shift Date:</span><span class="bold">${formatDate(reportData.date)}</span></div>
            <div class="row"><span>Generated:</span><span>${new Date(reportData.generatedAt).toLocaleTimeString("en-IN")}</span></div>
            <div class="row"><span>Total Orders:</span><span class="bold">${reportData.invoicesCount} orders</span></div>
          </div>

          <div class="divider"></div>
          <div style="font-weight: bold; font-size: 10px; margin-bottom: 3px;">SALES REVENUE SUMMARY</div>
          <div class="row"><span>Gross Sales:</span><span class="bold">₹${Number(reportData.totalSales).toFixed(2)}</span></div>
          <div class="row"><span>(-) Discounts:</span><span>₹${Number(reportData.discountGiven).toFixed(2)}</span></div>
          <div class="row"><span>(+) GST Tax:</span><span>₹${Number(reportData.taxCollected).toFixed(2)}</span></div>

          <div class="divider"></div>
          <div style="font-weight: bold; font-size: 10px; margin-bottom: 3px;">PAYMENT BREAKDOWN</div>
          <div class="row"><span>Cash Sales:</span><span class="bold">₹${Number(reportData.paymentBreakdown.cashSales).toFixed(2)}</span></div>
          <div class="row"><span>UPI / QR:</span><span class="bold">₹${Number(reportData.paymentBreakdown.upiSales).toFixed(2)}</span></div>
          <div class="row"><span>Card Sales:</span><span class="bold">₹${Number(reportData.paymentBreakdown.cardSales).toFixed(2)}</span></div>
          <div class="row" style="color: #b91c1c;"><span>Udhaar Credit:</span><span class="bold">₹${Number(reportData.paymentBreakdown.udhaarGiven).toFixed(2)}</span></div>

          <div class="divider"></div>
          <div style="font-weight: bold; font-size: 10px; margin-bottom: 3px;">UDHAAR RECOVERIES</div>
          <div class="row"><span>Cash Collected:</span><span class="bold">₹${Number(reportData.customerPaymentsCollected.cashCollected).toFixed(2)}</span></div>
          <div class="row"><span>UPI Collected:</span><span class="bold">₹${Number(reportData.customerPaymentsCollected.upiCollected).toFixed(2)}</span></div>

          ${expensesList}

          <div class="divider"></div>
          <div style="border: 1px solid #000; padding: 4px; margin-top: 4px;">
            <div style="font-weight: bold; font-size: 10px; margin-bottom: 3px;">💵 DRAWER RECONCILIATION</div>
            <div class="row"><span>(+) Morning Opening:</span><span>₹${Number(reportData.cashDrawerReconciliation.openingCash).toFixed(2)}</span></div>
            <div class="row"><span>(+) Cash Sales:</span><span>₹${Number(reportData.cashDrawerReconciliation.cashFromSales).toFixed(2)}</span></div>
            <div class="row"><span>(+) Cash Recoveries:</span><span>₹${Number(reportData.cashDrawerReconciliation.cashFromUdhaarRecoveries).toFixed(2)}</span></div>
            ${
              reportData.cashDrawerReconciliation.cashPettyExpensesPaid > 0
                ? `<div class="row" style="color: #b91c1c;"><span>(-) Petty Expenses:</span><span>-₹${Number(reportData.cashDrawerReconciliation.cashPettyExpensesPaid).toFixed(2)}</span></div>`
                : ""
            }
            <div class="row bold" style="font-size: 12px; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px;">
              <span>EXPECTED CASH:</span>
              <span>₹${Number(reportData.cashDrawerReconciliation.expectedCashInDrawer).toFixed(2)}</span>
            </div>
          </div>

          <div class="divider"></div>
          <div class="center" style="font-size: 8px; color: #555; padding-top: 2px;">
            <div>* DAILY SHIFT CLOSE TILL RECEIPT *</div>
            <div style="margin-top: 2px;">CRYSTAL PRESS POS RECONCILIATION</div>
          </div>
        </body>
        </html>
      `;

      let iframe = document.getElementById("zreport-print-iframe") as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "zreport-print-iframe";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        iframe.style.zIndex = "-1000";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        toast.info("Printing Daily Shift Z-Report Thermal Slip", "Print Dialog Opened");
      }, 150);
    } catch (err: any) {
      console.error("Print failed, falling back:", err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Daily Shift Close (Z-Report)
              </h3>
              <p className="text-xs text-slate-400">
                Cash drawer reconciliation & shift handover
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!reportData}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-lime-400" />
              <span>Print Thermal Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shift Date & Opening Float Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs print:hidden">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Shift Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Morning Opening Cash Float (₹)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="50"
                value={openingCash || ""}
                onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                placeholder="1000"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
              <button
                type="button"
                onClick={loadZReport}
                className="px-3 py-1.5 bg-lime-300 text-slate-900 rounded-xl font-bold shrink-0 hover:bg-lime-400 transition-colors"
              >
                Recalculate
              </button>
            </div>
          </div>
        </div>

        {/* Printable 80mm Thermal Receipt Canvas */}
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-lime-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Reconciling shift registers...</p>
          </div>
        ) : reportData ? (
          <div
            id="printable-z-report"
            className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 space-y-4 print:bg-white print:p-0 print:border-none print:m-0 print:text-black"
          >
            {/* Store Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h2 className="text-base font-black uppercase tracking-wider">{shopName}</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">{shopAddress}</p>
              {shopGstin && (
                <p className="text-[10px] text-slate-500">GSTIN: {shopGstin}</p>
              )}
              <div className="mt-2 inline-block px-3 py-0.5 bg-slate-900 text-white rounded font-sans text-[10px] font-extrabold uppercase tracking-wider print:bg-black print:text-white">
                DAILY SHIFT Z-REPORT
              </div>
            </div>

            {/* Meta Details */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Report No:</span>
                <span className="font-bold">{reportData.reportNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shift Date:</span>
                <span className="font-bold">{formatDate(reportData.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Generated At:</span>
                <span>{new Date(reportData.generatedAt).toLocaleTimeString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Invoices:</span>
                <span className="font-bold">{reportData.invoicesCount} orders</span>
              </div>
            </div>

            {/* Sales Breakdown */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
              <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400 block mb-1">
                SALES REVENUE SUMMARY
              </span>
              <div className="flex justify-between">
                <span>Gross Invoice Sales:</span>
                <span className="font-bold">{formatCurrency(reportData.totalSales)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>(-) Total Discounts Given:</span>
                <span>{formatCurrency(reportData.discountGiven)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>(+) GST Tax Collected:</span>
                <span>{formatCurrency(reportData.taxCollected)}</span>
              </div>
            </div>

            {/* Payment Method Split */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
              <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400 block mb-1">
                PAYMENT METHODS RECEIVED
              </span>
              <div className="flex justify-between">
                <span>Cash Sales:</span>
                <span className="font-bold">{formatCurrency(reportData.paymentBreakdown.cashSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>UPI / QR Sales:</span>
                <span className="font-bold">{formatCurrency(reportData.paymentBreakdown.upiSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Card Sales:</span>
                <span className="font-bold">{formatCurrency(reportData.paymentBreakdown.cardSales)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Udhaar Credit Extended:</span>
                <span className="font-bold">{formatCurrency(reportData.paymentBreakdown.udhaarGiven)}</span>
              </div>
            </div>

            {/* Customer Udhaar Recoveries */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
              <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400 block mb-1">
                UDHAAR DEBT RECOVERIES
              </span>
              <div className="flex justify-between">
                <span>Recovered in Cash:</span>
                <span className="font-bold">{formatCurrency(reportData.customerPaymentsCollected.cashCollected)}</span>
              </div>
              <div className="flex justify-between">
                <span>Recovered via UPI:</span>
                <span className="font-bold">{formatCurrency(reportData.customerPaymentsCollected.upiCollected)}</span>
              </div>
            </div>

            {/* Petty Cash Outflows */}
            {reportData.pettyCashExpenses && reportData.pettyCashExpenses.totalCashExpenses > 0 && (
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold uppercase text-[10px] tracking-wider text-rose-500">
                    PETTY CASH & EXPENSES PAID
                  </span>
                  <span className="font-extrabold text-rose-600">
                    -{formatCurrency(reportData.pettyCashExpenses.totalCashExpenses)}
                  </span>
                </div>
                {reportData.pettyCashExpenses.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] text-slate-600">
                    <span className="truncate max-w-[200px]">
                      • {item.title} ({item.categoryName})
                    </span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CASH DRAWER RECONCILIATION (CRITICAL BOX) */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-300 space-y-1.5 text-xs print:border-black">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-900 block mb-1">
                💵 CASH DRAWER RECONCILIATION
              </span>
              <div className="flex justify-between text-slate-600">
                <span>(+) Morning Opening Float:</span>
                <span>{formatCurrency(reportData.cashDrawerReconciliation.openingCash)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>(+) Cash from Direct Sales:</span>
                <span>{formatCurrency(reportData.cashDrawerReconciliation.cashFromSales)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>(+) Udhaar Cash Collected:</span>
                <span>{formatCurrency(reportData.cashDrawerReconciliation.cashFromUdhaarRecoveries)}</span>
              </div>
              {reportData.cashDrawerReconciliation.cashPettyExpensesPaid > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>(-) Petty Cash / Overheads Paid:</span>
                  <span>-{formatCurrency(reportData.cashDrawerReconciliation.cashPettyExpensesPaid)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-sm text-slate-900 print:border-black">
                <span>EXPECTED IN DRAWER:</span>
                <span className="text-emerald-700 font-black">
                  {formatCurrency(reportData.cashDrawerReconciliation.expectedCashInDrawer)}
                </span>
              </div>
            </div>

            {/* Spoilage Loss */}
            {reportData.spoilageWastageCost > 0 && (
              <div className="flex justify-between text-[11px] text-amber-800">
                <span>Print Spoilage / Wastage Loss:</span>
                <span className="font-bold">{formatCurrency(reportData.spoilageWastageCost)}</span>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
              <div className="border-t border-slate-300 pt-1">
                <span>Cashier / Shift In-charge</span>
              </div>
              <div className="border-t border-slate-300 pt-1">
                <span>Store Owner / Manager</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
          >
            Close Shift Window
          </button>
        </div>
      </div>
    </div>
  );
}
