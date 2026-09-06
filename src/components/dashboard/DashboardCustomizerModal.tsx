"use client";

import React from "react";
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  DollarSign,
  Printer,
  Boxes,
  Truck,
  FileText,
  Users2,
  TrendingUp,
  Receipt,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/useSnackbarStore";

export interface DashboardWidgetConfig {
  // Financial KPIs
  kpiRevenue: boolean;
  kpiCashDrawer: boolean;
  kpiDigitalUpi: boolean;
  kpiUdhaar: boolean;
  kpiMonthRevenue: boolean;
  kpiExpenses: boolean;

  // Operations KPIs
  kpiActiveJobs: boolean;
  kpiChallans: boolean;
  kpiQuotations: boolean;

  // Inventory
  kpiInventory: boolean;
  widgetStockBar: boolean;

  // Actions & Charts
  quickActions: boolean;
  chartRevenue: boolean;
  chartPaymentModes: boolean;

  // Data Tables
  tableActiveJobs: boolean;
  tableRecentSales: boolean;
  tableLowStock: boolean;
  tableCreditWatch: boolean;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardWidgetConfig = {
  kpiRevenue: true,
  kpiCashDrawer: true,
  kpiDigitalUpi: true,
  kpiUdhaar: true,
  kpiMonthRevenue: true,
  kpiExpenses: true,
  kpiActiveJobs: true,
  kpiChallans: true,
  kpiQuotations: true,
  kpiInventory: true,
  widgetStockBar: true,
  quickActions: true,
  chartRevenue: true,
  chartPaymentModes: true,
  tableActiveJobs: true,
  tableRecentSales: true,
  tableLowStock: true,
  tableCreditWatch: true,
};

export const PRESETS: {
  id: string;
  name: string;
  desc: string;
  config: Partial<DashboardWidgetConfig>;
}[] = [
  {
    id: "all",
    name: "Full ERP View",
    desc: "All financial, production, and warehouse widgets enabled",
    config: DEFAULT_DASHBOARD_CONFIG,
  },
  {
    id: "financial",
    name: "Financial & Billing",
    desc: "Focus on Revenue, Cash Drawer, UPI, Customer Udhaar, and Sales",
    config: {
      kpiRevenue: true,
      kpiCashDrawer: true,
      kpiDigitalUpi: true,
      kpiUdhaar: true,
      kpiMonthRevenue: true,
      kpiExpenses: true,
      kpiActiveJobs: false,
      kpiChallans: false,
      kpiQuotations: true,
      kpiInventory: false,
      widgetStockBar: false,
      quickActions: true,
      chartRevenue: true,
      chartPaymentModes: true,
      tableActiveJobs: false,
      tableRecentSales: true,
      tableLowStock: false,
      tableCreditWatch: true,
    },
  },
  {
    id: "workshop",
    name: "Press & Workshop",
    desc: "Focus on Active Job Orders, Challans, Reams, and Stock alerts",
    config: {
      kpiRevenue: false,
      kpiCashDrawer: false,
      kpiDigitalUpi: false,
      kpiUdhaar: false,
      kpiMonthRevenue: false,
      kpiExpenses: false,
      kpiActiveJobs: true,
      kpiChallans: true,
      kpiQuotations: true,
      kpiInventory: true,
      widgetStockBar: true,
      quickActions: true,
      chartRevenue: false,
      chartPaymentModes: false,
      tableActiveJobs: true,
      tableRecentSales: false,
      tableLowStock: true,
      tableCreditWatch: false,
    },
  },
  {
    id: "compact",
    name: "Compact Executive",
    desc: "Clean minimal summary with essential KPIs and revenue trend",
    config: {
      kpiRevenue: true,
      kpiCashDrawer: true,
      kpiDigitalUpi: true,
      kpiUdhaar: true,
      kpiMonthRevenue: false,
      kpiExpenses: false,
      kpiActiveJobs: true,
      kpiChallans: false,
      kpiQuotations: false,
      kpiInventory: false,
      widgetStockBar: true,
      quickActions: true,
      chartRevenue: true,
      chartPaymentModes: false,
      tableActiveJobs: true,
      tableRecentSales: true,
      tableLowStock: false,
      tableCreditWatch: false,
    },
  },
];

interface DashboardCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardWidgetConfig;
  onChange: (newConfig: DashboardWidgetConfig) => void;
}

export function DashboardCustomizerModal({
  isOpen,
  onClose,
  config,
  onChange,
}: DashboardCustomizerModalProps) {
  if (!isOpen) return null;

  const toggleWidget = (key: keyof DashboardWidgetConfig) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
  };

  const applyPreset = (presetConfig: Partial<DashboardWidgetConfig>) => {
    onChange({
      ...config,
      ...presetConfig,
    });
    toast.success("Applied dashboard layout preset");
  };

  const resetToDefault = () => {
    onChange(DEFAULT_DASHBOARD_CONFIG);
    toast.info("Reset dashboard to default view");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime">
              <Sliders className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                Customize Dashboard Widgets
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-lime-400">
                  Admin Only
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose which metrics, charts, and lists appear on the main dashboard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {/* 1. Quick Presets */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
              ⚡ Quick Layout Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.config)}
                  className="p-3 text-left rounded-2xl border border-slate-200 hover:border-lime-400 hover:bg-lime-50/30 transition-all group"
                >
                  <div className="text-xs font-black text-slate-900 group-hover:text-lime-900">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Financial & Revenue KPIs */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Financial & Revenue Metrics
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  key: "kpiRevenue" as const,
                  title: "Today's Total Revenue",
                  desc: "Sales sum & total bills completed today",
                },
                {
                  key: "kpiCashDrawer" as const,
                  title: "Physical Cash Drawer",
                  desc: "Physical cash collected minus cash expenses",
                },
                {
                  key: "kpiDigitalUpi" as const,
                  title: "Digital UPI Payments",
                  desc: "PhonePe / GPay / QR collections",
                },
                {
                  key: "kpiUdhaar" as const,
                  title: "Customer Market Udhaar",
                  desc: "Total outstanding credit & overdue accounts",
                },
                {
                  key: "kpiMonthRevenue" as const,
                  title: "Month's Total Revenue",
                  desc: "Cumulative sales for current calendar month",
                },
                {
                  key: "kpiExpenses" as const,
                  title: "Today's Expenses",
                  desc: "Petty cash & daily store expenses total",
                },
              ].map((w) => (
                <label
                  key={w.key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all select-none",
                    config[w.key]
                      ? "bg-emerald-50/40 border-emerald-300 shadow-2xs"
                      : "bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={config[w.key]}
                    onChange={() => toggleWidget(w.key)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-400"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">{w.title}</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">{w.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 3. Operations & Workshop */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-purple-600" />
              Press Workshop & Operations
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  key: "kpiActiveJobs" as const,
                  title: "Active Print Orders Card",
                  desc: "Work orders currently in production workshop",
                },
                {
                  key: "kpiChallans" as const,
                  title: "Pending Delivery Challans",
                  desc: "Dispatch orders in transit / prepared",
                },
                {
                  key: "kpiQuotations" as const,
                  title: "Open Quotations Pipeline",
                  desc: "Pending customer estimates awaiting approval",
                },
                {
                  key: "tableActiveJobs" as const,
                  title: "Press Work Orders List",
                  desc: "Interactive jobs table with status tags",
                },
              ].map((w) => (
                <label
                  key={w.key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all select-none",
                    config[w.key]
                      ? "bg-purple-50/40 border-purple-300 shadow-2xs"
                      : "bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={config[w.key]}
                    onChange={() => toggleWidget(w.key)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-400"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">{w.title}</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">{w.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Charts & Visualizations */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-lime-600" />
              Analytics & Visual Charts
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  key: "quickActions" as const,
                  title: "Quick Speed Launcher Bar",
                  desc: "1-Click action shortcuts at the top of the page",
                },
                {
                  key: "chartRevenue" as const,
                  title: "Revenue Velocity SVG Chart",
                  desc: "Interactive 7D / 30D / 6M sales curve with tooltip",
                },
                {
                  key: "chartPaymentModes" as const,
                  title: "Payment Methods Share",
                  desc: "Cash vs. UPI vs. Credit distribution breakdown",
                },
                {
                  key: "widgetStockBar" as const,
                  title: "Stock Availability Meter",
                  desc: "Progress bar of In-Stock vs Low-Stock SKUs",
                },
              ].map((w) => (
                <label
                  key={w.key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all select-none",
                    config[w.key]
                      ? "bg-lime-50/40 border-lime-300 shadow-2xs"
                      : "bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={config[w.key]}
                    onChange={() => toggleWidget(w.key)}
                    className="mt-0.5 rounded text-lime-600 focus:ring-lime-400"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">{w.title}</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">{w.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Data Tables & Watchlists */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-blue-600" />
              Data Tables & Watchlists
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  key: "tableRecentSales" as const,
                  title: "Recent Sales & Bills Table",
                  desc: "Itemized counter invoice audit log",
                },
                {
                  key: "tableLowStock" as const,
                  title: "Low Stock Alert Reorders",
                  desc: "SKUs falling below safety reorder threshold",
                },
                {
                  key: "tableCreditWatch" as const,
                  title: "Customer Credit Watchlist",
                  desc: "Top clients with pending balances & WhatsApp reminder",
                },
              ].map((w) => (
                <label
                  key={w.key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all select-none",
                    config[w.key]
                      ? "bg-blue-50/40 border-blue-300 shadow-2xs"
                      : "bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={config[w.key]}
                    onChange={() => toggleWidget(w.key)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-400"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">{w.title}</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">{w.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={resetToDefault}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-lime-400" />
            <span>Save & Apply View</span>
          </button>
        </div>
      </div>
    </div>
  );
}
