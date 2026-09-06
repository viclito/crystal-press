"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Wallet,
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  MessageSquare,
  PlusCircle,
  Clock,
  FileText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  getCustomerWalletPassbook,
  generateWhatsAppLoyaltyUrl,
} from "@/actions/wallet";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";

interface CustomerWalletPassbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  onOpenTopUp?: (customer: any) => void;
}

type TabType = "ALL" | "WALLET" | "POINTS";

export function CustomerWalletPassbookModal({
  isOpen,
  onClose,
  customerId,
  onOpenTopUp,
}: CustomerWalletPassbookModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("ALL");

  const loadPassbook = async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const res = await getCustomerWalletPassbook(customerId);
      if (res.success) {
        setData(res);
      } else {
        toast.error(res.error || "Failed to load wallet passbook");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load wallet passbook");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      loadPassbook();
    } else {
      setData(null);
      setActiveTab("ALL");
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  const transactions = data?.transactions || [];
  const customer = data?.customer;

  const filteredTransactions = transactions.filter((t: any) => {
    if (activeTab === "WALLET") {
      return t.type === "WALLET_TOPUP" || t.type === "WALLET_PAYMENT" || Number(t.amount) !== 0;
    }
    if (activeTab === "POINTS") {
      return t.type === "POINTS_ACCRUED" || t.type === "POINTS_REDEEMED" || t.points !== 0;
    }
    return true;
  });

  const handleWhatsAppDispatch = async () => {
    if (!customerId) return;
    try {
      const url = await generateWhatsAppLoyaltyUrl(customerId);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Could not generate WhatsApp share link");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {customer?.name || "Customer"} — Digital Passbook
              </h3>
              <p className="text-xs text-slate-400">
                {customer?.phone ? `+91 ${customer.phone}` : "Customer Wallet & Loyalty Ledger"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadPassbook}
              disabled={isLoading}
              title="Refresh ledger"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-slate-700")} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Balances Card */}
        {customer && (
          <div className="my-4 p-4 rounded-2xl bg-slate-900 text-white shadow-md shrink-0">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  Store Credit Balance
                </span>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {formatCurrency(customer.walletBalance || 0)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-end gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Loyalty Points
                </span>
                <div className="text-xl font-black text-amber-400 mt-1">
                  {(customer.loyaltyPoints || 0).toLocaleString("en-IN")} pts
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-between pt-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenTopUp) onOpenTopUp(customer);
                }}
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Top-Up Wallet</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppDispatch}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Statement</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 shrink-0">
          {[
            { id: "ALL", label: "All Transactions" },
            { id: "WALLET", label: "Store Credit (₹)" },
            { id: "POINTS", label: "Loyalty Points (⭐)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-colors",
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transactions Ledger List */}
        <div className="flex-1 overflow-y-auto my-2 space-y-2 pr-1 custom-scrollbar min-h-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
              <span>Loading ledger entries...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-bold text-slate-700">No passbook transactions yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Top-ups, checkout debits, and loyalty points accrual will appear here.
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx: any) => {
              const isTopUp = tx.type === "WALLET_TOPUP";
              const isWalletSpend = tx.type === "WALLET_PAYMENT";
              const isPointsEarned = tx.type === "POINTS_ACCRUED";
              const isPointsRedeemed = tx.type === "POINTS_REDEEMED";

              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold",
                        isTopUp && "bg-emerald-100 text-emerald-800",
                        isWalletSpend && "bg-rose-100 text-rose-800",
                        isPointsEarned && "bg-amber-100 text-amber-800",
                        isPointsRedeemed && "bg-indigo-100 text-indigo-800"
                      )}
                    >
                      {isTopUp && <ArrowDownLeft className="w-4 h-4 text-emerald-700" />}
                      {isWalletSpend && <ArrowUpRight className="w-4 h-4 text-rose-700" />}
                      {isPointsEarned && <Star className="w-4 h-4 text-amber-700 fill-amber-500" />}
                      {isPointsRedeemed && <Coins className="w-4 h-4 text-indigo-700" />}
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {isTopUp && "Wallet Recharge Deposit"}
                        {isWalletSpend && "Store Credit Payment"}
                        {isPointsEarned && "Loyalty Points Earned"}
                        {isPointsRedeemed && "Loyalty Points Redeemed"}
                        {!isTopUp && !isWalletSpend && !isPointsEarned && !isPointsRedeemed && tx.type}
                      </div>

                      <div className="text-[10px] text-slate-500 line-clamp-1">
                        {tx.notes || (tx.paymentMethod ? `Via ${tx.paymentMethod}` : "")}
                      </div>

                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {/* Amount delta */}
                    {Number(tx.amount) !== 0 && (
                      <div
                        className={cn(
                          "font-black text-xs",
                          Number(tx.amount) > 0 ? "text-emerald-700" : "text-rose-700"
                        )}
                      >
                        {Number(tx.amount) > 0 ? "+" : ""}
                        {formatCurrency(Number(tx.amount))}
                      </div>
                    )}

                    {/* Points delta */}
                    {tx.points !== 0 && (
                      <div
                        className={cn(
                          "font-black text-xs",
                          tx.points > 0 ? "text-amber-700" : "text-indigo-700"
                        )}
                      >
                        {tx.points > 0 ? "+" : ""}
                        {tx.points} pts
                      </div>
                    )}

                    {/* Running balances */}
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Bal: ₹{Number(tx.runningWalletBalance || 0).toFixed(2)} • {tx.runningPointsBalance || 0} pts
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
