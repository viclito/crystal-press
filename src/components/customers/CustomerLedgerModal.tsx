"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Printer,
  Share2,
  Banknote,
} from "lucide-react";
import { getCustomerLedger } from "@/actions/customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CustomerStatementModal } from "./CustomerStatementModal";

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  onOpenCollectPayment?: (customer: any) => void;
}

export function CustomerLedgerModal({
  isOpen,
  onClose,
  customer,
  onOpenCollectPayment,
}: CustomerLedgerModalProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [shopSettings, setShopSettings] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      setLoading(true);
      getCustomerLedger(customer.id).then((res) => {
        if (res.success) {
          setEntries(res.entries || []);
          setShopSettings(res.shopSettings);
        }
        setLoading(false);
      });
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handleShareWhatsApp = () => {
    const shopName = shopSettings?.shopName || "Crystal Press";
    const shopPhones = [shopSettings?.phone1, shopSettings?.phone2].filter(Boolean).join(" / ");
    const upiId = shopSettings?.upiId || "crystalpress@upi";

    const message = `*ACCOUNT BALANCE - ${shopName}*\n\n` +
      `Dear *${customer.name}*,\n\n` +
      `Your current outstanding balance (Udhaar) is: *${formatCurrency(customer.currentBalance)}*.\n\n` +
      (customer.currentBalance > 0
        ? `Kindly settle this via UPI:\n` +
          `🔹 *UPI ID:* \`${upiId}\`\n\n`
        : `Your account is fully clear.\n\n`) +
      `Thank you,\n*${shopName}*\n${shopPhones || ""}`;

    const cleanPhone = customer.phone?.replace(/\D/g, "") || "";
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Customer Account Statement</h3>
              <p className="text-xs text-slate-500">
                {customer.name} {customer.phone ? `(+91 ${customer.phone})` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Balance Overview */}
          <div className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current Outstanding (Udhaar)
              </span>
              <div className="text-2xl font-black text-rose-600 mt-0.5">
                {formatCurrency(customer.currentBalance)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Credit Limit
              </span>
              <div className="text-sm font-bold text-slate-700 mt-0.5">
                {formatCurrency(customer.creditLimit || 0)}
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-end gap-2 pb-3 mb-2 border-b border-slate-100">
            {customer.currentBalance > 0 && onOpenCollectPayment && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCollectPayment(customer);
                }}
                className="px-3 py-1.5 bg-lime-400 hover:bg-lime-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Collect Pay</span>
              </button>
            )}

            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Due Reminder</span>
            </button>

            <button
              onClick={() => setIsStatementOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-lime-400" />
              <span>A4 Statement & UPI QR</span>
            </button>
          </div>

          {/* Statement Entries List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading ledger...</div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No transactions recorded yet
              </div>
            ) : (
              entries.map((entry) => {
                const isDebit = entry.debitAmount > 0; // Bill added
                return (
                  <div
                    key={entry.id}
                    className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isDebit ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{entry.notes || entry.referenceType}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold ${isDebit ? "text-rose-700" : "text-emerald-700"}`}>
                        {isDebit ? `+${formatCurrency(entry.debitAmount)}` : `-${formatCurrency(entry.creditAmount)}`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Bal: {formatCurrency(entry.runningBalance)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* A4 Statement Modal */}
      <CustomerStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        customerId={customer.id}
        onOpenCollectPayment={onOpenCollectPayment}
      />
    </>
  );
}
