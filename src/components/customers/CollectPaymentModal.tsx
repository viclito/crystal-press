"use client";

import React, { useState } from "react";
import { X, Check, Banknote, QrCode, CreditCard } from "lucide-react";
import { recordCustomerPayment } from "@/actions/customers";
import { PaymentMethod } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import confetti from "canvas-confetti";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
}

export function CollectPaymentModal({ isOpen, onClose, customer }: CollectPaymentModalProps) {
  const [amount, setAmount] = useState<number>(customer ? Number(customer.currentBalance) || 0 : 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !customer) return null;

  const currentBalance = Number(customer.currentBalance) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setIsSubmitting(true);
    const res = await recordCustomerPayment({
      customerId: customer.id,
      amount: Number(amount),
      paymentMethod,
      transactionRef: transactionRef || undefined,
      notes: notes || `Payment collected against Udhaar`,
    });

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        `Recorded ₹${Number(amount).toFixed(2)} payment from ${customer.name}`,
        "Udhaar Payment Collected"
      );
      try {
        confetti({ particleCount: 60, spread: 50 });
      } catch (e) {}
      onClose();
    } else {
      modal.error((res as any).error || "Failed to record payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Collect Udhaar Payment</h3>
            <p className="text-xs text-slate-400">{customer.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
            <span className="font-semibold">Total Outstanding Balance:</span>
            <span className="text-base font-black">{formatCurrency(currentBalance)}</span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Amount Receiving (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "CASH", label: "Cash", icon: Banknote },
                { id: "UPI", label: "UPI", icon: QrCode },
                { id: "CARD", label: "Card", icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {paymentMethod === "UPI" && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">UPI UTR / Reference No.</label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="12-digit UTR number"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Remarks / Receipt Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared half balance for March bills"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-center justify-between text-xs text-emerald-900">
            <span className="font-semibold">Remaining Balance:</span>
            <span className="text-sm font-black">
              {formatCurrency(Math.max(0, currentBalance - amount))}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 text-lime-400" />
              <span>{isSubmitting ? "Recording..." : "Confirm Collection"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
