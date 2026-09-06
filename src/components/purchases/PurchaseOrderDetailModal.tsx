"use client";

import React from "react";
import { X, Truck, FileText, Calendar, Building2, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PurchaseOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: {
    id: string;
    poNumber: string;
    vendorBillNo?: string | null;
    purchaseDate: any;
    totalAmount: any;
    paidAmount: any;
    notes?: string | null;
    vendor: {
      name: string;
      phone?: string | null;
      contactPerson?: string | null;
    };
    items: Array<{
      id: string;
      quantity: any;
      unitCostPrice: any;
      lineTotal: any;
      product?: {
        name: string;
        skuCode: string;
      } | null;
    }>;
  } | null;
}

export function PurchaseOrderDetailModal({
  isOpen,
  onClose,
  po,
}: PurchaseOrderDetailModalProps) {
  if (!isOpen || !po) return null;

  const total = Number(po.totalAmount) || 0;
  const paid = Number(po.paidAmount) || 0;
  const due = Math.max(0, total - paid);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-900 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">{po.poNumber}</h3>
                {due === 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Fully Paid
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    Due: {formatCurrency(due)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Supplier Restock Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PO Meta Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Supplier / Vendor
            </span>
            <span className="font-bold text-slate-900">{po.vendor.name}</span>
            {po.vendor.phone && (
              <span className="text-[10px] text-slate-400 block">{po.vendor.phone}</span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Supplier Bill / Challan
            </span>
            <span className="font-bold text-slate-900">{po.vendorBillNo || "N/A"}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Received Date
            </span>
            <span className="font-bold text-slate-900">{formatDate(po.purchaseDate)}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 flex justify-between">
            <span>Product Item</span>
            <div className="flex gap-6">
              <span>Qty x Rate</span>
              <span>Total</span>
            </div>
          </div>

          {po.items.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 block">
                  {item.product?.name || "Product"}
                </span>
                <span className="text-[10px] text-slate-400">
                  SKU: {item.product?.skuCode || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-6 text-right">
                <span className="text-slate-500 font-medium">
                  {Number(item.quantity)} × {formatCurrency(Number(item.unitCostPrice))}
                </span>
                <span className="font-extrabold text-slate-900 w-20">
                  {formatCurrency(Number(item.lineTotal))}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Total Shipment Value:</span>
            <span className="text-sm font-bold text-white">{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Paid Upfront:</span>
            <span className="font-bold text-emerald-400">{formatCurrency(paid)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold">Outstanding Payable Balance:</span>
            <span
              className={`text-sm font-black ${
                due > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {formatCurrency(due)}
            </span>
          </div>
        </div>

        {po.notes && (
          <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-900">
            <strong>Notes:</strong> {po.notes}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
