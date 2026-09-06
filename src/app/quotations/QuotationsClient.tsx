"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Printer,
  Calendar,
  Layers,
  Receipt,
  Trash2,
  Edit,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Percent,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { QuotationStatus } from "@prisma/client";
import { useSession } from "next-auth/react";
import { getQuotations, deleteQuotation, updateQuotationStatus } from "@/actions/quotations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { QuotationFormModal } from "@/components/quotations/QuotationFormModal";
import { QuotationPrintModal } from "@/components/quotations/QuotationPrintModal";
import { toast } from "@/stores/useSnackbarStore";
import { modal } from "@/stores/useDialogStore";

interface QuotationsClientProps {
  initialQuotations: any[];
  initialKpis: any;
  customers: any[];
  products: any[];
  shopSettings?: any;
}

export function QuotationsClient({
  initialQuotations,
  initialKpis,
  customers,
  products,
  shopSettings,
}: QuotationsClientProps) {
  const { data: session } = useSession();
  const isOwner = ((session?.user as any)?.role as string) === "ADMIN";

  const [quotations, setQuotations] = useState<any[]>(initialQuotations || []);
  const [kpis, setKpis] = useState<any>(initialKpis || {});
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("ALL");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [quoteToEdit, setQuoteToEdit] = useState<any | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [quoteToPrint, setQuoteToPrint] = useState<any | null>(null);

  // Fetch updated data
  const refreshData = async () => {
    setLoading(true);
    const res = await getQuotations({
      status: selectedStatus,
      search: searchQuery,
      dateRange: selectedDateRange,
    });
    if (res.success) {
      setQuotations(res.quotations || []);
      setKpis(res.kpis || {});
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [selectedStatus, selectedDateRange]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refreshData();
  };

  const handleDelete = async (id: string, quoteNum: string) => {
    const confirmed = await modal.confirm({
      title: "Delete Quotation?",
      message: `Are you sure you want to permanently delete Quotation ${quoteNum}?`,
      confirmText: "Delete Quotation",
      type: "danger",
    });

    if (!confirmed) return;

    const res = await deleteQuotation(id);
    if (res.success) {
      toast.success(`Quotation ${quoteNum} deleted`, "Quotation Removed");
      refreshData();
    } else {
      modal.error(res.error || "Failed to delete quotation");
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: QuotationStatus) => {
    const res = await updateQuotationStatus(id, newStatus);
    if (res.success) {
      toast.success(`Status updated to ${newStatus}`, "Status Updated");
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & New Quotation Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center text-slate-900 shadow-lime">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Quotations & Estimates
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Generate proforma estimates, send via WhatsApp, and convert to live work orders
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setQuoteToEdit(null);
            setIsFormOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation / Estimate</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotes */}
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quotations</span>
            <div className="w-9 h-9 rounded-xl bg-lime-50 text-lime-800 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{kpis.totalQuotes || 0}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Valued at <span className="font-bold text-slate-800">{formatCurrency(kpis.totalValue || 0)}</span>
            </p>
          </div>
        </div>

        {/* Pending & Sent Value */}
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open / Pending</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-sky-900">{kpis.openQuotesCount || 0} Quotes</div>
            <p className="text-xs font-semibold text-sky-700 mt-0.5">
              Pipeline Value: <span className="font-bold">{formatCurrency(kpis.openQuotesValue || 0)}</span>
            </p>
          </div>
        </div>

        {/* Converted & Accepted */}
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Converted to Live</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-900">{kpis.convertedCount || 0} Orders</div>
            <p className="text-xs font-semibold text-emerald-700 mt-0.5">
              Realized: <span className="font-bold">{formatCurrency(kpis.convertedValue || 0)}</span>
            </p>
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-900">
              {(Number(kpis.conversionRate) || 0).toFixed(1)}%
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Number(kpis.conversionRate) || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold w-fit">
            {[
              { id: "ALL", label: "All Quotes" },
              { id: "DRAFT", label: "📝 Draft" },
              { id: "SENT", label: "📤 Sent" },
              { id: "ACCEPTED", label: "✅ Accepted" },
              { id: "CONVERTED", label: "🔄 Converted" },
              { id: "REJECTED", label: "❌ Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  selectedStatus === tab.id
                    ? "bg-white text-slate-900 shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Date:</span>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by quote number (QT-2026-0001), customer name, phone, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-lime-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Quotations Data Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Quote Ref</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Issue & Validity</th>
                <th className="py-3.5 px-4">Items Summary</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.map((q) => {
                const isExpired = q.validUntil && new Date(q.validUntil) < new Date() && q.status !== QuotationStatus.CONVERTED;
                const itemsCount = q.items?.length || 0;
                const firstItemDesc = q.items?.[0]?.itemDescription || "Printing Work";

                return (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Quotation Number */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-extrabold text-slate-900 text-xs">{q.quotationNumber}</div>
                      <div className="text-[10px] text-slate-400">By {q.createdBy?.fullName || "Staff"}</div>
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{q.customerName}</div>
                      {q.customerPhone && (
                        <div className="text-[10px] text-slate-500 font-mono">+91 {q.customerPhone}</div>
                      )}
                    </td>

                    {/* Issue Date & Validity */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 font-medium">
                        {new Date(q.quotationDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      {q.validUntil && (
                        <div className={`text-[10px] font-bold ${isExpired ? "text-rose-600" : "text-slate-400"}`}>
                          {isExpired ? "⚠️ Expired: " : "Valid till: "}
                          {new Date(q.validUntil).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      )}
                    </td>

                    {/* Items Summary */}
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div className="font-semibold text-slate-800 truncate" title={firstItemDesc}>
                        {firstItemDesc}
                      </div>
                      {itemsCount > 1 && (
                        <span className="text-[10px] text-lime-700 font-bold">
                          +{itemsCount - 1} more item{itemsCount > 2 ? "s" : ""}
                        </span>
                      )}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                      {formatCurrency(q.netTotal)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          q.status === QuotationStatus.CONVERTED
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : q.status === QuotationStatus.ACCEPTED
                            ? "bg-lime-100 text-lime-900 border border-lime-200"
                            : q.status === QuotationStatus.SENT
                            ? "bg-sky-100 text-sky-800 border border-sky-200"
                            : q.status === QuotationStatus.REJECTED
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteToPrint(q);
                            setIsPrintOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 transition-colors"
                          title="Print / View / WhatsApp"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuoteToEdit(q);
                              setIsFormOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Edit Quotation (Owner / Admin Only)"
                          >
                            <Edit className="w-3 h-3 text-amber-700" />
                            <span>Edit</span>
                          </button>
                        )}

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDelete(q.id, q.quotationNumber)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Quotation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {quotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No quotations found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Create your first customer estimate or adjust the filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quotation Form Modal (Add / Edit) */}
      {isFormOpen && (
        <QuotationFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setQuoteToEdit(null);
            refreshData();
          }}
          quotationToEdit={quoteToEdit}
          customers={customers}
          products={products}
          defaultTaxRate={shopSettings?.defaultTaxRate || 0}
        />
      )}

      {/* Quotation Print & Share Modal */}
      {isPrintOpen && quoteToPrint && (
        <QuotationPrintModal
          isOpen={isPrintOpen}
          onClose={() => {
            setIsPrintOpen(false);
            setQuoteToPrint(null);
            refreshData();
          }}
          quotation={quoteToPrint}
          shopSettings={shopSettings}
          onRefresh={refreshData}
          isOwner={isOwner}
          onEdit={() => {
            setQuoteToEdit(quoteToPrint);
            setIsPrintOpen(false);
            setIsFormOpen(true);
          }}
        />
      )}
    </div>
  );
}
