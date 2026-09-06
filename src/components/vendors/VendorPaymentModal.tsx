"use client";

import React, { useState } from "react";
import {
  X,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  CheckCircle2,
  Calendar,
  Building2,
  Receipt,
  FileText,
} from "lucide-react";
import { PaymentMethod } from "@prisma/client";
import { recordVendorPayment } from "@/actions/vendors";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: any;
  onSuccess?: () => void;
}

export function VendorPaymentModal({
  isOpen,
  onClose,
  vendor,
  onSuccess,
}: VendorPaymentModalProps) {
  const [amount, setAmount] = useState<number>(Number(vendor?.outstandingBalance) || 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [paidAt, setPaidAt] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !vendor) return null;

  const currentBalance = Number(vendor.outstandingBalance) || 0;

  const handlePayFull = () => {
    setAmount(currentBalance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      modal.alert("Payment amount must be greater than zero.", "Invalid Amount");
      return;
    }

    setIsSubmitting(true);

    const res = await recordVendorPayment({
      vendorId: vendor.id,
      amount: Number(amount),
      paymentMethod,
      transactionRef: transactionRef.trim() || undefined,
      notes: notes.trim() || undefined,
      paidAt: paidAt || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        `Recorded payment of ${formatCurrency(amount)} to ${vendor.name}`,
        "Payment Voucher Saved"
      );
      if (onSuccess) onSuccess();
      onClose();
    } else {
      modal.error(res.error || "Failed to record payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Record Supplier Payment
              </h3>
              <p className="text-xs text-slate-400">
                Pay to <span className="font-bold text-slate-700">{vendor.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="my-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
              Current Outstanding Balance
            </span>
            <span className="text-xl font-black text-rose-700 font-mono">
              {formatCurrency(currentBalance)}
            </span>
          </div>

          {currentBalance > 0 && (
            <button
              type="button"
              onClick={handlePayFull}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              Pay Full
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Payment Amount (₹) *
            </label>
            <div className="relative">
              <span className="text-sm font-black text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 font-mono">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="0.5"
                required
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: PaymentMethod.UPI, label: "UPI / QR Transfer", icon: Smartphone },
                { id: PaymentMethod.CARD, label: "NEFT / RTGS Bank", icon: Building2 },
                { id: PaymentMethod.CASH, label: "Cash Voucher", icon: Banknote },
                { id: PaymentMethod.CREDIT_UDHAAR, label: "Bank Cheque", icon: FileText },
              ].map((pm) => {
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`p-2.5 rounded-2xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                      paymentMethod === pm.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference # and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                UTR / Cheque / Ref #
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UTR-98765432"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Payment Remarks / Bill Details
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Advance for 50 reams 300 GSM art board"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* New Balance Preview */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex justify-between items-center text-emerald-950">
            <span>Remaining Balance after payment:</span>
            <span className="font-mono font-black text-sm text-emerald-900">
              {formatCurrency(Math.max(0, currentBalance - amount))}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
              <span>{isSubmitting ? "Recording..." : "Save Payment Voucher"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
