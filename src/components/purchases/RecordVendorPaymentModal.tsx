"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { recordVendorPayment } from "@/actions/purchases";
import { formatCurrency } from "@/lib/utils";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";
import { PaymentMethod } from "@prisma/client";

interface VendorItem {
  id: string;
  name: string;
  outstandingBalance: any;
}

interface RecordVendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorItem | null;
  onSuccess?: () => void;
}

export function RecordVendorPaymentModal({
  isOpen,
  onClose,
  vendor,
  onSuccess,
}: RecordVendorPaymentModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.UPI
  );
  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendor) {
      setAmount(Number(vendor.outstandingBalance) || 0);
      setTransactionRef("");
    }
  }, [vendor, isOpen]);

  if (!isOpen || !vendor) return null;

  const currentBalance = Number(vendor.outstandingBalance) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      await modal.alert("Please enter an amount greater than ₹0", "Validation Error");
      return;
    }

    setLoading(true);
    try {
      const res = await recordVendorPayment({
        vendorId: vendor.id,
        amount: Number(amount),
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          `Recorded payment of ${formatCurrency(amount)} to ${vendor.name}`,
          "Payment Recorded"
        );
        onSuccess?.();
        onClose();
      } else {
        await modal.error(res.error || "Failed to record payment", "Payment Error");
      }
    } catch (err: any) {
      await modal.error(err.message || "An unexpected error occurred", "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Settle Vendor Due</h3>
              <p className="text-xs text-slate-400">Pay supplier balance & update ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vendor Outstanding Banner */}
        <div className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Supplier
            </span>
            <span className="text-xs font-bold text-slate-900">{vendor.name}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Due
            </span>
            <span className="text-sm font-black text-rose-600">
              {formatCurrency(currentBalance)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Payment Amount (₹)</label>
              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(currentBalance)}
                  className="text-[10px] font-bold text-lime-700 hover:text-lime-800"
                >
                  Pay Full ({formatCurrency(currentBalance)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
            >
              <option value={PaymentMethod.UPI}>UPI / Online Transfer</option>
              <option value={PaymentMethod.CASH}>Cash</option>
              <option value={PaymentMethod.CARD}>Card / NetBanking</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Reference / Cheque / UTR No.
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UTR-98721498124 or Cheque #49201"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-lime-400" />
              )}
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
