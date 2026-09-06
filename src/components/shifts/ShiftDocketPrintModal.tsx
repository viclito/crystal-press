"use client";

import React from "react";
import { X, Printer, CheckCircle2, AlertCircle, Building2, Coins, Layers } from "lucide-react";

interface ShiftDocketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  docket: {
    shopName: string;
    shopAddress: string;
    shopPhone: string;
    shiftNumber: string;
    openedAt: Date | string;
    closedAt?: Date | string;
    openedBy: string;
    closedBy: string;
    nextCashierName: string;
    openingFloat: number;
    expectedCash: number;
    actualCash: number;
    discrepancy: number;
    totalSales: number;
    cashSales: number;
    upiSales: number;
    cardSales: number;
    udhaarSales: number;
    pettyCashExpenses: number;
    closingFloatKept: number;
    cashBanked: number;
    denominations: Record<string, number>;
    handoverNotes?: string | null;
  } | null;
}

export function ShiftDocketPrintModal({
  isOpen,
  onClose,
  docket,
}: ShiftDocketPrintModalProps) {
  if (!isOpen || !docket) return null;

  const handlePrint = () => {
    window.print();
  };

  const isBalanced = Math.abs(docket.discrepancy) < 0.01;
  const isShortage = docket.discrepancy < -0.01;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col justify-between">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Print Shift Handover Docket
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 80mm Thermal Receipt Preview Container */}
        <div
          id="shift-docket-printable"
          className="my-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 font-mono text-[11px] text-slate-800 leading-tight space-y-3"
        >
          {/* Shop Header */}
          <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
            <h2 className="text-sm font-black tracking-wider uppercase">
              {docket.shopName}
            </h2>
            <p className="text-[10px] text-slate-600">{docket.shopAddress}</p>
            <p className="text-[10px] text-slate-600">Ph: {docket.shopPhone}</p>
            <div className="pt-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-900">
              *** SHIFT HANDOVER DOCKET ***
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              Docket #{docket.shiftNumber}
            </div>
          </div>

          {/* Time & Cashier Info */}
          <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Opened:</span>
              <span className="font-bold">
                {new Date(docket.openedAt).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Closed:</span>
              <span className="font-bold">
                {docket.closedAt
                  ? new Date(docket.closedAt).toLocaleString("en-IN")
                  : "Active"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Outgoing Cashier:</span>
              <span className="font-bold text-slate-900">{docket.closedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Incoming Handover To:</span>
              <span className="font-bold text-slate-900">{docket.nextCashierName}</span>
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="space-y-1 pb-2 border-b border-dashed border-slate-400">
            <div className="font-bold text-slate-900 uppercase text-[10px]">
              Revenue By Channel
            </div>
            <div className="flex justify-between">
              <span>POS Cash Sales:</span>
              <span className="font-bold">₹{docket.cashSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>UPI / QR Sales:</span>
              <span className="font-bold">₹{docket.upiSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Card Sales:</span>
              <span className="font-bold">₹{docket.cardSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Udhaar / Credit Sales:</span>
              <span className="font-bold">₹{docket.udhaarSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-dotted border-slate-300 font-bold">
              <span>Total Shift Revenue:</span>
              <span>₹{docket.totalSales.toFixed(2)}</span>
            </div>
          </div>

          {/* Cash Drawer Reconciliation */}
          <div className="space-y-1 pb-2 border-b border-dashed border-slate-400">
            <div className="font-bold text-slate-900 uppercase text-[10px]">
              Cash Drawer Audit
            </div>
            <div className="flex justify-between">
              <span>Opening Float:</span>
              <span>₹{docket.openingFloat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Inflows (POS/Adv):</span>
              <span>+₹{docket.cashSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>Petty Cash Outflows:</span>
              <span>-₹{docket.pettyCashExpenses.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-dotted border-slate-300 font-bold">
              <span>Expected Drawer Cash:</span>
              <span>₹{docket.expectedCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 text-xs pt-0.5">
              <span>Physical Cash Counted:</span>
              <span>₹{docket.actualCash.toFixed(2)}</span>
            </div>

            <div
              className={`flex justify-between font-bold p-1 rounded mt-1 text-[11px] ${
                isBalanced
                  ? "bg-emerald-100 text-emerald-900"
                  : isShortage
                  ? "bg-rose-100 text-rose-900"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              <span>Discrepancy:</span>
              <span>
                {isBalanced
                  ? "BALANCED (₹0.00)"
                  : isShortage
                  ? `SHORTAGE (-₹${Math.abs(docket.discrepancy).toFixed(2)})`
                  : `OVERAGE (+₹${docket.discrepancy.toFixed(2)})`}
              </span>
            </div>
          </div>

          {/* Denomination Details */}
          {docket.denominations && Object.keys(docket.denominations).length > 0 && (
            <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 text-[10px]">
              <div className="font-bold text-slate-900 uppercase">
                Physical Notes Counted
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {Object.entries(docket.denominations)
                  .filter(([_, count]) => count > 0)
                  .map(([val, count]) => (
                    <div key={val} className="flex justify-between">
                      <span>₹{val} × {count}:</span>
                      <span className="font-bold">₹{(Number(val) * count).toFixed(0)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Cash Allocation */}
          <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 text-[10px]">
            <div className="font-bold text-slate-900 uppercase">
              Till Allocation
            </div>
            <div className="flex justify-between">
              <span>Float Retained in Drawer:</span>
              <span className="font-bold">₹{docket.closingFloatKept.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Deposited in Safe/Bank:</span>
              <span className="font-bold">₹{docket.cashBanked.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          {docket.handoverNotes && (
            <div className="text-[10px] pb-2 border-b border-dashed border-slate-400">
              <span className="font-bold text-slate-500">Handover Notes: </span>
              <span>{docket.handoverNotes}</span>
            </div>
          )}

          {/* Signature Lines */}
          <div className="pt-3 space-y-6 text-[10px] text-slate-600">
            <div>
              <div className="border-t border-slate-400 pt-1 flex justify-between">
                <span>Outgoing Cashier Signature</span>
                <span className="font-semibold">{docket.closedBy}</span>
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 flex justify-between">
                <span>Incoming Cashier / Manager Signature</span>
                <span className="font-semibold">{docket.nextCashierName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print 80mm Docket</span>
          </button>
        </div>
      </div>
    </div>
  );
}
