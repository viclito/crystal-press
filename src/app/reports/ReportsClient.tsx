"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  BarChart2,
  PieChart,
  Calendar,
  FileText,
  Printer,
  ShoppingBag,
  CreditCard,
  Building2,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Package,
  Layers,
  Receipt,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { DailyZReportModal } from "@/components/reports/DailyZReportModal";
import { GSTTaxSummaryCard } from "@/components/reports/GSTTaxSummaryCard";
import { ExportReportsButton } from "@/components/reports/ExportReportsButton";
import { getFilteredReportData, FilteredReportData } from "@/actions/reports";
import { toast } from "@/stores/useSnackbarStore";

interface ReportsClientProps {
  initialData: FilteredReportData;
  shopSettings?: {
    shopName?: string;
    address?: string;
    gstin?: string;
  };
}

export function ReportsClient({ initialData, shopSettings }: ReportsClientProps) {
  const [data, setData] = useState<FilteredReportData>(initialData);
  const [loading, setLoading] = useState(false);
  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);

  const handleDateRangeChange = async (
    start: string,
    end: string,
    presetName: string
  ) => {
    setLoading(true);
    try {
      const res = await getFilteredReportData(start, end);
      if (res.success && res.data) {
        setData(res.data);
        toast.info(`Updated report for ${presetName}`, "Report Filtered");
      } else {
        toast.error(res.error || "Failed to load report data");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to filter data");
    } finally {
      setLoading(false);
    }
  };

  const { metrics, expenseBreakdown, paymentBreakdown, gstSlabs, topProducts, topJobTypes, dailyTimeline, invoicesList } = data;

  const totalPayments =
    paymentBreakdown.cash +
    paymentBreakdown.upi +
    paymentBreakdown.card +
    paymentBreakdown.udhaar +
    paymentBreakdown.split;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime">
            <BarChart2 className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Reports & Financial Intelligence
            </h1>
            <p className="text-xs text-slate-400">
              Tax reporting, cash drawer Z-reports, expenses & net profit analytics
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExportReportsButton reportData={data} />

          <button
            onClick={() => setIsZReportModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98"
          >
            <Printer className="w-4 h-4 text-lime-400" />
            <span>Daily Shift Z-Report</span>
          </button>
        </div>
      </div>

      {/* Date Range Presets and Pickers */}
      <DateRangeFilter
        startDate={data.dateRange.startDate}
        endDate={data.dateRange.endDate}
        onRangeChange={handleDateRangeChange}
        loading={loading}
      />

      {/* Primary KPI Overview Cards */}
      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Period Net Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          subtitle={`${metrics.totalInvoicesCount} sales orders`}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-lime-50 text-lime-800 border border-lime-200/80"
          changeText={`${metrics.totalCustomJobsCount} custom jobs`}
          changeType="positive"
        />

        <StatCard
          title="Gross Profit Margin"
          value={formatCurrency(metrics.grossProfit)}
          subtitle={`${metrics.grossProfitMarginPct.toFixed(1)}% gross margin`}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-800 border border-emerald-200/80"
          changeText="After COGS"
          changeType="positive"
        />

        <StatCard
          title="Operating Expenses"
          value={formatCurrency(metrics.totalExpenses || 0)}
          subtitle={`Petty Cash: ${formatCurrency(expenseBreakdown?.cashPettyTotal || 0)}`}
          icon={<Receipt className="w-5 h-5" />}
          iconBg="bg-rose-50 text-rose-800 border border-rose-200/80"
          changeText="Shop overheads"
          changeType="neutral"
        />

        <StatCard
          title="Net Operating Profit"
          value={formatCurrency(metrics.netOperatingProfit ?? (metrics.grossProfit - (metrics.totalExpenses || 0)))}
          subtitle="Gross Profit - Overheads"
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-sky-50 text-sky-800 border border-sky-200/80"
          changeText="Bottom line"
          changeType="positive"
        />

        <StatCard
          title="Total GST Collected"
          value={formatCurrency(metrics.totalTaxCollected)}
          subtitle="CGST + SGST pooled"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBg="bg-blue-50 text-blue-800 border border-blue-200/80"
          changeText="GSTR-1 Ready"
          changeType="neutral"
        />
      </div>

      {/* Payment Modes & Revenue Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Payment Channel Inflow
              </h3>
              <p className="text-xs text-slate-400">Cash vs UPI vs Card vs Udhaar breakdown</p>
            </div>
            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60 font-mono">
              {formatCurrency(totalPayments)}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Cash */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Cash Received
                </span>
                <span className="font-mono text-slate-900">
                  {formatCurrency(paymentBreakdown.cash)}{" "}
                  <span className="text-slate-400 font-sans text-[11px] font-semibold">
                    ({totalPayments > 0 ? ((paymentBreakdown.cash / totalPayments) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${
                      totalPayments > 0
                        ? (paymentBreakdown.cash / totalPayments) * 100
                        : 0
                    }%`,
                  }}
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>

            {/* UPI */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-500" />
                  UPI / QR Code
                </span>
                <span className="font-mono text-slate-900">
                  {formatCurrency(paymentBreakdown.upi)}{" "}
                  <span className="text-slate-400 font-sans text-[11px] font-semibold">
                    ({totalPayments > 0 ? ((paymentBreakdown.upi / totalPayments) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${
                      totalPayments > 0
                        ? (paymentBreakdown.upi / totalPayments) * 100
                        : 0
                    }%`,
                  }}
                  className="h-full bg-lime-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>

            {/* Card */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Card / NetBanking
                </span>
                <span className="font-mono text-slate-900">
                  {formatCurrency(paymentBreakdown.card)}{" "}
                  <span className="text-slate-400 font-sans text-[11px] font-semibold">
                    ({totalPayments > 0 ? ((paymentBreakdown.card / totalPayments) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${
                      totalPayments > 0
                        ? (paymentBreakdown.card / totalPayments) * 100
                        : 0
                    }%`,
                  }}
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>

            {/* Udhaar */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Credit (Udhaar Ledger)
                </span>
                <span className="font-mono text-rose-600 font-bold">
                  {formatCurrency(paymentBreakdown.udhaar)}{" "}
                  <span className="text-slate-400 font-sans text-[11px] font-semibold">
                    ({totalPayments > 0 ? ((paymentBreakdown.udhaar / totalPayments) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${
                      totalPayments > 0
                        ? (paymentBreakdown.udhaar / totalPayments) * 100
                        : 0
                    }%`,
                  }}
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Sales Timeline Chart */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daily Revenue Timeline
              </h3>
              <p className="text-xs text-slate-400">Day-by-day sales & orders trend</p>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {dailyTimeline.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No transactions recorded in this date range.
              </div>
            ) : (
              dailyTimeline.map((item) => (
                <div
                  key={item.date}
                  className="p-2.5 sm:p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-2xs">
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block leading-tight">
                        {formatDate(item.date)}
                      </span>
                      <span className="text-[10.5px] text-slate-400">
                        {item.invoicesCount} invoice{item.invoicesCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="text-right leading-tight">
                    <span className="font-black text-slate-900 block font-mono">
                      {formatCurrency(item.revenue)}
                    </span>
                    <span className="text-[10.5px] font-bold text-emerald-700">
                      Profit: {formatCurrency(item.profit)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* GST Tax Summary Card */}
      <GSTTaxSummaryCard
        gstSlabs={gstSlabs}
        totalTax={metrics.totalTaxCollected}
        totalRevenue={metrics.totalRevenue}
      />

      {/* Top Stationery Products & Custom Jobs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stationery Products */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Top Revenue Products
              </h3>
              <p className="text-xs text-slate-400">Highest grossing stationery items</p>
            </div>
            <Package className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No product sales recorded yet.
              </div>
            ) : (
              topProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors"
                >
                  <div className="truncate max-w-[240px]">
                    <div className="font-bold text-slate-900 truncate">{p.name}</div>
                    <span className="text-[10px] text-slate-400 font-mono">{p.skuCode}</span>
                  </div>
                  <div className="text-right leading-tight">
                    <div className="font-extrabold text-slate-900 font-mono">
                      {formatCurrency(p.totalRevenue)}
                    </div>
                    <span className="text-[10.5px] text-emerald-700 font-bold">
                      {p.quantitySold} units sold
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Custom Job Categories */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Printing Job Orders Breakdown
              </h3>
              <p className="text-xs text-slate-400">By custom work order category</p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2">
            {topJobTypes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No custom printing job orders in this period.
              </div>
            ) : (
              topJobTypes.map((job) => (
                <div
                  key={job.jobType}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-900">{job.jobType}</div>
                    <span className="text-[10.5px] text-slate-400">
                      {job.count} work order{job.count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-right leading-tight">
                    <div className="font-extrabold text-slate-900 font-mono">
                      {formatCurrency(job.totalAmount)}
                    </div>
                    <span className="text-[10.5px] text-lime-800 font-bold">
                      Job Volume
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Period Invoices Audit Table */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Period Invoices Register
            </h3>
            <p className="text-xs text-slate-400">
              Detailed list of all bills issued between {data.dateRange.startDate} and {data.dateRange.endDate}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
            {invoicesList.length} Invoices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Invoice #</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Payment Mode</th>
                <th className="pb-3 text-right">Taxable</th>
                <th className="pb-3 text-right">GST Tax</th>
                <th className="pb-3 text-right pr-2">Net Bill Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {invoicesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No invoices generated in this period.
                  </td>
                </tr>
              ) : (
                invoicesList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-2 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-slate-800 block">
                        {inv.customerName || "Walk-in Customer"}
                      </span>
                      {inv.customerPhone && (
                        <span className="text-[10px] text-slate-400">{inv.customerPhone}</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-400">{formatDate(inv.createdAt)}</td>
                    <td className="py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-600">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="py-3 text-right text-slate-600">
                      {formatCurrency(inv.taxAmount)}
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 pr-2">
                      {formatCurrency(inv.netTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Shift Z-Report Modal */}
      <DailyZReportModal
        isOpen={isZReportModalOpen}
        onClose={() => setIsZReportModalOpen(false)}
        shopName={shopSettings?.shopName}
        shopAddress={shopSettings?.address}
        shopGstin={shopSettings?.gstin}
      />
    </div>
  );
}
