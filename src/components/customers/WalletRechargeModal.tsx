"use client";

import React, { useState } from "react";
import { X, Wallet, Check, Sparkles, MessageSquare, ArrowRight } from "lucide-react";
import { PaymentMethod } from "@prisma/client";
import { rechargeCustomerWallet, generateWhatsAppLoyaltyUrl } from "@/actions/wallet";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";
import confetti from "canvas-confetti";

interface CustomerData {
  id: string;
  name: string;
  phone?: string | null;
  walletBalance: number;
  loyaltyPoints?: number;
}

interface WalletRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerData | null;
  onSuccess?: (newBalance: number) => void;
}

export function WalletRechargeModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: WalletRechargeModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedInfo, setCompletedInfo] = useState<{
    rechargeAmount: number;
    newBalance: number;
    whatsappUrl?: string;
  } | null>(null);

  if (!isOpen || !customer) return null;

  const currentBal = Number(customer.walletBalance) || 0;
  const rechargeNum = Math.max(0, Number(amount) || 0);
  const projectedBal = currentBal + rechargeNum;

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rechargeNum <= 0) {
      toast.error("Please enter a valid top-up amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await rechargeCustomerWallet({
        customerId: customer.id,
        amount: rechargeNum,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.newBalance !== undefined) {
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch {}

        let waUrl = "";
        try {
          waUrl = await generateWhatsAppLoyaltyUrl(customer.id);
        } catch {}

        setCompletedInfo({
          rechargeAmount: rechargeNum,
          newBalance: res.newBalance,
          whatsappUrl: waUrl,
        });

        toast.success(`Successfully added ₹${rechargeNum.toFixed(2)} to ${customer.name}'s wallet!`);
        if (onSuccess) onSuccess(res.newBalance);
      } else {
        toast.error(res.error || "Failed to recharge wallet");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setNotes("");
    setCompletedInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Success View */}
        {completedInfo ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-3xl mx-auto flex items-center justify-center shadow-emerald">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                Wallet Top-Up Completed
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                +{formatCurrency(completedInfo.rechargeAmount)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                New Store Credit Balance for <strong>{customer.name}</strong>:{" "}
                <strong className="text-emerald-700">{formatCurrency(completedInfo.newBalance)}</strong>
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {completedInfo.whatsappUrl && (
                <a
                  href={completedInfo.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Confirmation</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 shadow-md transition-transform active:scale-98"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Top-Up Store Credit</h3>
                  <p className="text-xs text-slate-400">{customer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="my-4 space-y-4">
              {/* Balance Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Current Wallet</span>
                  <div className="text-sm font-black text-slate-800">{formatCurrency(currentBal)}</div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-300" />

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Projected Balance</span>
                  <div className="text-sm font-black text-emerald-700">
                    {formatCurrency(projectedBal)}
                  </div>
                </div>
              </div>

              {/* Recharge Amount */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Recharge Deposit Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                  autoFocus
                />

                {/* Quick denomination buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAmount(String(q))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      +₹{q.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Received Via *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: PaymentMethod.UPI, label: "UPI" },
                    { id: PaymentMethod.CASH, label: "Cash" },
                    { id: PaymentMethod.CARD, label: "Card" },
                  ].map((m) => {
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={cn(
                          "py-2 px-3 rounded-xl border text-xs font-bold transition-all",
                          active
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reference / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Advance retainer for catalog printing"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rechargeNum <= 0}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 shadow-md transition-transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Top-Up</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
