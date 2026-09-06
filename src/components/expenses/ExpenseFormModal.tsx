"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Receipt,
  DollarSign,
  Calendar,
  User,
  FileText,
  Loader2,
  Tag,
  CreditCard,
  Smartphone,
  Banknote,
  Settings,
} from "lucide-react";
import { PaymentMethod } from "@prisma/client";
import { createExpense } from "@/actions/expenses";
import { toast } from "@/stores/useSnackbarStore";
import { ExpenseCategoryModal } from "./ExpenseCategoryModal";
import { SearchableSelect, SearchableOption } from "@/components/ui/SearchableSelect";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{
    id: string;
    name: string;
    color: string | null;
    isActive: boolean;
    _count?: { expenses: number };
  }>;
  onExpenseCreated: () => void;
  onCategoriesUpdated: () => void;
}

const QUICK_AMOUNT_PRESETS = [50, 100, 150, 200, 500, 1000];

export function ExpenseFormModal({
  isOpen,
  onClose,
  categories,
  onExpenseCreated,
  onCategoriesUpdated,
}: ExpenseFormModalProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Set default category
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount);
    if (!title.trim()) {
      toast.error("Please enter an expense title or purpose");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    try {
      const res = await createExpense({
        title: title.trim(),
        categoryId,
        amount: numericAmount,
        paymentMethod,
        expenseDate,
        recipient: recipient.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          `Logged ₹${numericAmount.toLocaleString("en-IN")} (${res.expense.categoryName})`,
          "Expense Recorded"
        );
        // Reset form
        setTitle("");
        setAmount("");
        setRecipient("");
        setNotes("");
        setPaymentMethod(PaymentMethod.CASH);
        onExpenseCreated();
        onClose();
      } else {
        toast.error(res.error || "Failed to record expense");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Record Shop Expense
                </h3>
                <p className="text-xs text-slate-400">
                  Log petty cash outlays & operational overheads
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 my-4">
            {/* Expense Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expense Description / Purpose <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Staff Tea & Snacks, Auto courier delivery, Shop cleaning"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white transition-all"
              />
            </div>

            {/* Category Select + Manage Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Category <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] font-bold text-lime-700 hover:text-lime-800 flex items-center gap-1 hover:underline"
                >
                  <Settings className="w-3 h-3" />
                  <span>Manage Categories</span>
                </button>
              </div>

              <SearchableSelect
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                  badge: "Category",
                }))}
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                placeholder="-- Type or choose category --"
                searchPlaceholder="Search expense category..."
              />
            </div>

            {/* Amount (₹) + Quick Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.5"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-extrabold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white transition-all"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Quick:
                </span>
                {QUICK_AMOUNT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-lime-200 hover:text-slate-900 text-slate-600 rounded-lg text-[11px] font-bold transition-colors"
                  >
                    ₹{p}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Paid Via (Payment Mode) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === PaymentMethod.CASH
                      ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm ring-1 ring-emerald-400"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Cash Drawer</span>
                  <span className="text-[9px] text-emerald-700 font-medium">Petty Cash Outflow</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.UPI)}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === PaymentMethod.UPI
                      ? "bg-lime-50 border-lime-400 text-slate-900 shadow-sm ring-1 ring-lime-400"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-lime-700" />
                  <span>UPI / QR</span>
                  <span className="text-[9px] text-slate-500 font-medium">GPay / PhonePe</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.CARD)}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === PaymentMethod.CARD
                      ? "bg-blue-50 border-blue-400 text-blue-900 shadow-sm ring-1 ring-blue-400"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Card / Bank</span>
                  <span className="text-[9px] text-slate-500 font-medium">NetBanking / Card</span>
                </button>
              </div>

              {paymentMethod === PaymentMethod.CASH && (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 bg-emerald-50/60 p-2 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Will be deducted from the Shift Z-Report Cash Drawer calculation.</span>
                </p>
              )}
            </div>

            {/* Date & Recipient Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paid To / Recipient
                </label>
                <input
                  type="text"
                  placeholder="e.g. Raju Tea Stall, Courier Boy"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notes / Reference Memo
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes or receipt invoice number..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || !amount}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                ) : (
                  <Plus className="w-4 h-4 text-lime-400" />
                )}
                <span>Record Expense</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Management Sub-Modal */}
      <ExpenseCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCategoriesUpdated={() => {
          onCategoriesUpdated();
        }}
      />
    </>
  );
}
