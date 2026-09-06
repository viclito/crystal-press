"use client";

import React, { useState, useTransition } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  DollarSign,
  TrendingDown,
  Building2,
  Tag,
  Settings,
  Banknote,
  Smartphone,
  CreditCard,
  User,
  ArrowUpRight,
  Layers,
  Loader2,
  PieChart,
} from "lucide-react";
import { PaymentMethod } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { ExpenseCategoryModal } from "@/components/expenses/ExpenseCategoryModal";
import { getExpenses, getExpenseCategories, deleteExpense } from "@/actions/expenses";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface ExpenseItem {
  id: string;
  expenseNumber: string;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  recipient: string | null;
  notes: string | null;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  createdByName: string;
  createdAt: string;
}

interface ExpenseSummary {
  totalExpenseAmount: number;
  cashExpenseAmount: number;
  upiExpenseAmount: number;
  cardExpenseAmount: number;
  totalCount: number;
  categoryBreakdown: Array<{ name: string; color: string; amount: number; count: number }>;
}

interface ExpenseCategory {
  id: string;
  name: string;
  color: string | null;
  isActive: boolean;
  _count?: { expenses: number };
}

interface ExpensesClientProps {
  initialExpenses: ExpenseItem[];
  initialSummary: ExpenseSummary;
  initialCategories: ExpenseCategory[];
}

export function ExpensesClient({
  initialExpenses,
  initialSummary,
  initialCategories,
}: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [summary, setSummary] = useState<ExpenseSummary>(initialSummary);
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshExpenses = async (
    cat = selectedCategory,
    pay = selectedPaymentMethod,
    q = searchQuery,
    start = startDate,
    end = endDate
  ) => {
    setLoading(true);
    try {
      const res = await getExpenses({
        categoryId: cat !== "ALL" ? cat : undefined,
        paymentMethod: pay !== "ALL" ? (pay as PaymentMethod) : undefined,
        search: q || undefined,
        startDate: start || undefined,
        endDate: end || undefined,
      });

      if (res.success && res.data) {
        setExpenses(res.data.expenses);
        setSummary(res.data.summary);
      } else {
        toast.error(res.error || "Failed to load expenses");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to filter expenses");
    } finally {
      setLoading(false);
    }
  };

  const refreshCategories = async () => {
    try {
      const res = await getExpenseCategories();
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error("Failed to refresh categories", err);
    }
  };

  const handleDeleteExpense = async (expense: ExpenseItem) => {
    const confirmed = await modal.confirm({
      title: `Delete Expense #${expense.expenseNumber}?`,
      message: `Are you sure you want to delete "${expense.title}" of ${formatCurrency(expense.amount)}? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await deleteExpense(expense.id);
      if (res.success) {
        toast.success(`Expense ${expense.expenseNumber} deleted`);
        refreshExpenses();
      } else {
        toast.error(res.error || "Failed to delete expense");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete expense");
    }
  };

  // Date range preset handlers
  const handleDatePreset = (preset: "today" | "week" | "month" | "all") => {
    const today = new Date();
    let s = "";
    let e = today.toISOString().split("T")[0];

    if (preset === "today") {
      s = e;
    } else if (preset === "week") {
      const startOfWeek = new Date(today);
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      s = startOfWeek.toISOString().split("T")[0];
    } else if (preset === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      s = startOfMonth.toISOString().split("T")[0];
    } else {
      s = "";
      e = "";
    }

    setStartDate(s);
    setEndDate(e);
    refreshExpenses(selectedCategory, selectedPaymentMethod, searchQuery, s, e);
  };

  const topCategory = summary.categoryBreakdown[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime text-slate-900">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Expense & Petty Cash Tracker
            </h1>
            <p className="text-xs text-slate-400">
              Record shop overheads, staff tea, delivery costs & cash drawer outlays
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setIsFormModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98"
          >
            <Plus className="w-4 h-4 text-lime-400" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Period Spend"
          value={formatCurrency(summary.totalExpenseAmount)}
          subtitle={`${summary.totalCount} logged expenses`}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-rose-50 text-rose-800 border border-rose-200/80"
          changeText="Operating Overheads"
          changeType="neutral"
        />

        <StatCard
          title="Petty Cash Drawer Outflow"
          value={formatCurrency(summary.cashExpenseAmount)}
          subtitle="Deducted from Cash Drawer"
          icon={<Banknote className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
          changeText="Cash Outflow"
          changeType="neutral"
        />

        <StatCard
          title="Top Overhead Category"
          value={topCategory ? topCategory.name : "N/A"}
          subtitle={topCategory ? formatCurrency(topCategory.amount) : "No expenses"}
          icon={<Tag className="w-5 h-5" />}
          iconBg="bg-amber-50 text-amber-800 border border-amber-200/80"
          changeText={
            topCategory && summary.totalExpenseAmount > 0
              ? `${((topCategory.amount / summary.totalExpenseAmount) * 100).toFixed(0)}% of total`
              : "0%"
          }
          changeType="neutral"
        />

        <StatCard
          title="Bank / UPI Payments"
          value={formatCurrency(summary.upiExpenseAmount + summary.cardExpenseAmount)}
          subtitle={`UPI: ${formatCurrency(summary.upiExpenseAmount)} | Card: ${formatCurrency(summary.cardExpenseAmount)}`}
          icon={<Smartphone className="w-5 h-5" />}
          iconBg="bg-blue-50 text-blue-800 border border-blue-200/80"
          changeText="Online/Bank Paid"
          changeType="neutral"
        />
      </div>

      {/* Category Breakdown Progress Grid */}
      {summary.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-900">
                Overheads Breakdown by Category
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {summary.categoryBreakdown.length} Categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.categoryBreakdown.map((cat) => {
              const pct =
                summary.totalExpenseAmount > 0
                  ? (cat.amount / summary.totalExpenseAmount) * 100
                  : 0;

              return (
                <div
                  key={cat.name}
                  onClick={() => {
                    const match = categories.find((c) => c.name === cat.name);
                    if (match) {
                      setSelectedCategory(match.id);
                      refreshExpenses(match.id, selectedPaymentMethod, searchQuery, startDate, endDate);
                    }
                  }}
                  className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 shrink-0 ml-1">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.color,
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{cat.count} expenses</span>
                    <span className="font-semibold">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Date presets & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => handleDatePreset("today")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                startDate && startDate === endDate && startDate === new Date().toISOString().split("T")[0]
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDatePreset("week")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors whitespace-nowrap"
            >
              This Week
            </button>
            <button
              onClick={() => handleDatePreset("month")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors whitespace-nowrap"
            >
              This Month
            </button>
            <button
              onClick={() => handleDatePreset("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                !startDate && !endDate ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-auto sm:min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses, recipient, EXP#..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                refreshExpenses(selectedCategory, selectedPaymentMethod, e.target.value, startDate, endDate);
              }}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Category & Payment Method Pills */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2 border-t border-slate-100 text-xs">
          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              Category:
            </span>
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                refreshExpenses("ALL", selectedPaymentMethod, searchQuery, startDate, endDate);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0 ${
                selectedCategory === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCategory(c.id);
                  refreshExpenses(c.id, selectedPaymentMethod, searchQuery, startDate, endDate);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === c.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.color || "#64748B" }}
                />
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          {/* Payment Method Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Mode:
            </span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => {
                setSelectedPaymentMethod(e.target.value);
                refreshExpenses(selectedCategory, e.target.value, searchQuery, startDate, endDate);
              }}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="CASH">💵 Cash Drawer</option>
              <option value="UPI">📱 UPI / QR</option>
              <option value="CARD">💳 Card / Bank</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Audit Table */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Expenses & Outlays Register
            </h3>
            <p className="text-xs text-slate-400">
              Detailed chronological record of all recorded expenses
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {expenses.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Expense #</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Description / Purpose</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Paid To / Recipient</th>
                <th className="pb-3">Payment Mode</th>
                <th className="pb-3">Logged By</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-lime-600 mx-auto mb-2" />
                    <span>Filtering expenses...</span>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No expenses found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click "+ Record Expense" to log your first petty cash or shop expense.
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 pl-2 font-mono font-bold text-slate-900">
                      {exp.expenseNumber}
                    </td>
                    <td className="py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="py-3.5">
                      <span className="font-bold text-slate-900 block">{exp.title}</span>
                      {exp.notes && (
                        <span className="text-[10px] text-slate-400 line-clamp-1">
                          {exp.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          backgroundColor: `${exp.categoryColor}15`,
                          color: exp.categoryColor,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: exp.categoryColor }}
                        />
                        {exp.categoryName}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-700">
                      {exp.recipient || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-3.5">
                      {exp.paymentMethod === "CASH" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Banknote className="w-3 h-3" />
                          Cash Drawer
                        </span>
                      ) : exp.paymentMethod === "UPI" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-100 text-slate-900">
                          <Smartphone className="w-3 h-3" />
                          UPI / QR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          <CreditCard className="w-3 h-3" />
                          Card / Bank
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-500 text-[11px]">
                      {exp.createdByName}
                    </td>
                    <td className="py-3.5 text-right font-black text-rose-600 text-sm whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => handleDeleteExpense(exp)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Form Modal */}
      <ExpenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        categories={categories}
        onExpenseCreated={() => {
          refreshExpenses();
          refreshCategories();
        }}
        onCategoriesUpdated={() => {
          refreshCategories();
        }}
      />

      {/* Category Management Modal */}
      <ExpenseCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCategoriesUpdated={() => {
          refreshCategories();
          refreshExpenses();
        }}
      />
    </div>
  );
}
