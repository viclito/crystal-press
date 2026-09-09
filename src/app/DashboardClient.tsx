"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Printer,
  Boxes,
  ArrowUpRight,
  Sparkles,
  QrCode,
  Banknote,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Sliders,
  Plus,
  Scissors,
  Truck,
  FileText,
  Users2,
  Receipt,
  Barcode,
  PackageCheck,
  Send,
  HelpCircle,
  Eye,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StockAvailabilityBar } from "@/components/dashboard/SegmentedMetricBar";
import {
  DashboardCustomizerModal,
  DashboardWidgetConfig,
  DEFAULT_DASHBOARD_CONFIG,
} from "@/components/dashboard/DashboardCustomizerModal";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { generateWhatsAppCustomerStatementUrl } from "@/utils/whatsapp";
import { toast } from "@/stores/useSnackbarStore";
import { saveDashboardWidgetConfig } from "@/actions/dashboard";

interface DataPoint {
  label: string;
  fullDate?: string;
  total: number;
  count?: number;
}

interface DashboardClientProps {
  userRole?: string;
  todaySalesTotal: number;
  todayInvoicesCount: number;
  todayCashTotal: number;
  todayUpiTotal: number;
  todayCreditTotal: number;
  todayExpensesTotal: number;
  cashDrawerBalance: number;
  monthSalesTotal: number;
  totalUdhaar: number;
  overdueAccountsCount: number;
  totalProductsCount: number;
  totalCustomersCount: number;
  pendingChallansCount: number;
  openQuotationsCount: number;
  recentInvoices: any[];
  activeJobs: any[];
  lowStockItems: any[];
  topDebtors: any[];
  shopSettings: any;
  analytics?: {
    last7Days: DataPoint[];
    last30Days: DataPoint[];
    last6Months: DataPoint[];
  };
}

const STORAGE_KEY = "cp_dashboard_widget_config";

export function DashboardClient({
  userRole = "ADMIN",
  todaySalesTotal = 0,
  todayInvoicesCount = 0,
  todayCashTotal = 0,
  todayUpiTotal = 0,
  todayCreditTotal = 0,
  todayExpensesTotal = 0,
  cashDrawerBalance = 0,
  monthSalesTotal = 0,
  totalUdhaar = 0,
  overdueAccountsCount = 0,
  totalProductsCount = 0,
  totalCustomersCount = 0,
  pendingChallansCount = 0,
  openQuotationsCount = 0,
  recentInvoices = [],
  activeJobs = [],
  lowStockItems = [],
  topDebtors = [],
  shopSettings,
  analytics = {
    last7Days: [],
    last30Days: [],
    last6Months: [],
  },
}: DashboardClientProps) {
  const isAdmin = userRole === "ADMIN";

  // Widget visibility configuration with primary database sync and localStorage fallback
  const initialDbConfig = shopSettings?.dashboardConfig;
  const [config, setConfig] = useState<DashboardWidgetConfig>(() => {
    if (initialDbConfig && typeof initialDbConfig === "object") {
      return {
        ...DEFAULT_DASHBOARD_CONFIG,
        ...initialDbConfig,
      };
    }
    return DEFAULT_DASHBOARD_CONFIG;
  });
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [chartRange, setChartRange] = useState<"7D" | "30D" | "6M">("7D");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Load and synchronize configuration: Database -> LocalStorage -> State
  useEffect(() => {
    // 1. If database has saved configuration, use it and update local offline cache
    if (shopSettings?.dashboardConfig && typeof shopSettings.dashboardConfig === "object") {
      setConfig({
        ...DEFAULT_DASHBOARD_CONFIG,
        ...shopSettings.dashboardConfig,
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shopSettings.dashboardConfig));
      } catch (e) {}
      return;
    }

    // 2. If database does not yet have it, check localStorage (e.g. customized yesterday on this browser)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setConfig({
            ...DEFAULT_DASHBOARD_CONFIG,
            ...parsed,
          });
          // Auto-migrate local customization to database cloud storage so it's never lost!
          if (isAdmin) {
            saveDashboardWidgetConfig(parsed).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [shopSettings?.dashboardConfig, isAdmin]);

  // Save configuration change to state, local cache, and cloud database
  const handleConfigChange = async (newConfig: DashboardWidgetConfig) => {
    setConfig(newConfig);

    // Save to local cache immediately
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {}

    // Persist permanently to PostgreSQL database
    if (isAdmin) {
      try {
        const res = await saveDashboardWidgetConfig(newConfig);
        if (res.success) {
          toast.success("Dashboard layout saved across all devices");
        } else {
          toast.warning("Saved locally. Cloud sync: " + (res.error || "offline"));
        }
      } catch (err) {
        console.error("Failed to save dashboard config to cloud:", err);
      }
    }
  };

  // Active chart series
  const currentSeries: DataPoint[] =
    chartRange === "7D"
      ? analytics.last7Days
      : chartRange === "30D"
      ? analytics.last30Days
      : analytics.last6Months;

  // Chart metrics
  const seriesValues = currentSeries.map((d) => d.total);
  const maxVal = Math.max(...seriesValues, 1000);
  const peakIndex = seriesValues.indexOf(Math.max(...seriesValues));
  const peakItem = currentSeries[peakIndex] || { total: 0, label: "", fullDate: "" };

  // SVG Chart Geometry
  const svgWidth = 500;
  const svgHeight = 150;
  const paddingY = 25;
  const graphHeight = svgHeight - paddingY * 2;

  const points = currentSeries.map((item, idx) => {
    const x =
      currentSeries.length > 1 ? (idx / (currentSeries.length - 1)) * svgWidth : svgWidth / 2;
    const y = svgHeight - paddingY - (item.total / maxVal) * graphHeight;
    return { x, y, item, idx };
  });

  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePath = buildSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`
      : "";

  const activeHover = hoveredIdx !== null ? points[hoveredIdx] : points[peakIndex];

  // Payment Breakdown Percentages
  const totalTrackedRevenue = todayCashTotal + todayUpiTotal + todayCreditTotal || 1;
  const cashPct = Math.round((todayCashTotal / totalTrackedRevenue) * 100);
  const upiPct = Math.round((todayUpiTotal / totalTrackedRevenue) * 100);
  const creditPct = Math.max(0, 100 - cashPct - upiPct);

  return (
    <div className="space-y-6">
      {/* 1. Top Bar: Greeting, Mode & Admin Customizer Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 sm:px-5 border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Store Performance Cockpit
            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {userRole} Mode
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time sales velocity, press production pipeline, and credit risk
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Admin Customization Trigger */}
          {isAdmin ? (
            <button
              onClick={() => setIsCustomizerOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs active:scale-98"
            >
              <Sliders className="w-3.5 h-3.5 text-lime-400" />
              <span>Customize Widgets</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Admin-Managed View</span>
            </div>
          )}

          <Link
            href="/pos"
            className="px-4 py-2 bg-lime-400 hover:bg-lime-500 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs active:scale-98"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Open POS (F8)</span>
          </Link>
        </div>
      </div>

      {/* 2. Quick Action Speed Launcher Bar */}
      {config.quickActions && (
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-lime-500" />
              Quick Action Speed Launcher
            </span>
            <span className="text-[10px] text-slate-400">1-Click Fast Navigation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Link
              href="/pos"
              className="p-2.5 bg-lime-50/70 hover:bg-lime-100/80 border border-lime-200/80 rounded-2xl flex items-center gap-2.5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">New POS Bill</div>
                <div className="text-[9.5px] font-bold text-lime-800">Counter (F8)</div>
              </div>
            </Link>

            <Link
              href="/jobs"
              className="p-2.5 bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/80 rounded-2xl flex items-center gap-2.5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-200 text-purple-900 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                <Printer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">Job Orders</div>
                <div className="text-[9.5px] font-bold text-purple-700">Workshop Flow</div>
              </div>
            </Link>

            <Link
              href="/quotations"
              className="p-2.5 bg-sky-50/70 hover:bg-sky-100/80 border border-sky-200/80 rounded-2xl flex items-center gap-2.5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-200 text-sky-900 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">Quotations</div>
                <div className="text-[9.5px] font-bold text-sky-700">Create Estimate</div>
              </div>
            </Link>

            <Link
              href="/calculator"
              className="p-2.5 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                <Scissors className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">Print Estimator</div>
                <div className="text-[9.5px] font-bold text-amber-700">Offset & Paper</div>
              </div>
            </Link>

            <Link
              href="/challans"
              className="p-2.5 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                <PackageCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">Challans</div>
                <div className="text-[9.5px] font-bold text-emerald-700">Gate Pass Dispatch</div>
              </div>
            </Link>

            <Link
              href="/expenses"
              className="p-2.5 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 rounded-2xl flex items-center gap-2.5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-200 text-rose-900 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">Expenses</div>
                <div className="text-[9.5px] font-bold text-rose-700">Daily Petty Cash</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Primary KPI Cards Grid (Rendered Conditionally based on Config) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Revenue */}
        {config.kpiRevenue && (
          <StatCard
            title="Today's Total Revenue"
            value={formatCurrency(todaySalesTotal)}
            subtitle={`${todayInvoicesCount} sale${todayInvoicesCount === 1 ? "" : "s"} completed`}
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-100 text-emerald-700"
            badge="Live Today"
            badgeColor="bg-emerald-50 text-emerald-700"
          />
        )}

        {/* KPI 2: Cash Drawer Balance */}
        {config.kpiCashDrawer && (
          <StatCard
            title="Physical Cash in Drawer"
            value={formatCurrency(cashDrawerBalance)}
            subtitle={`₹${todayCashTotal} sales - ₹${todayExpensesTotal} expenses`}
            icon={<Banknote className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-100 text-emerald-700"
            badge="Register Tender"
            badgeColor="bg-emerald-50 text-emerald-700"
          />
        )}

        {/* KPI 3: Digital UPI Payments */}
        {config.kpiDigitalUpi && (
          <StatCard
            title="Digital UPI & QR Payments"
            value={formatCurrency(todayUpiTotal)}
            subtitle="PhonePe / GPay / Paytm QR"
            icon={<QrCode className="w-5 h-5 text-indigo-600" />}
            iconBg="bg-indigo-100 text-indigo-700"
            badge="Instant Bank"
            badgeColor="bg-indigo-50 text-indigo-700"
          />
        )}

        {/* KPI 4: Customer Market Udhaar */}
        {config.kpiUdhaar && (
          <StatCard
            title="Market Udhaar (Receivables)"
            value={formatCurrency(totalUdhaar)}
            subtitle={`${overdueAccountsCount} customer account(s) due`}
            icon={<Users2 className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-100 text-amber-700"
            badge="Credit Book"
            badgeColor="bg-amber-50 text-amber-700"
          />
        )}

        {/* KPI 5: Active Print Orders */}
        {config.kpiActiveJobs && (
          <StatCard
            title="Active Press Work Orders"
            value={activeJobs.length.toString()}
            subtitle="Production workshop active queue"
            icon={<Printer className="w-5 h-5 text-purple-600" />}
            iconBg="bg-purple-100 text-purple-700"
            badge="In Workshop"
            badgeColor="bg-purple-50 text-purple-700"
          />
        )}

        {/* KPI 6: Month's Cumulative Revenue */}
        {config.kpiMonthRevenue && (
          <StatCard
            title="This Month's Revenue"
            value={formatCurrency(monthSalesTotal)}
            subtitle="Current calendar month total"
            icon={<TrendingUp className="w-5 h-5 text-sky-600" />}
            iconBg="bg-sky-100 text-sky-700"
            badge="MTD Velocity"
            badgeColor="bg-sky-50 text-sky-700"
          />
        )}

        {/* KPI 7: Today's Expenses */}
        {config.kpiExpenses && (
          <StatCard
            title="Today's Store Expenses"
            value={formatCurrency(todayExpensesTotal)}
            subtitle="Petty cash, tea, logistics & utilities"
            icon={<Receipt className="w-5 h-5 text-rose-600" />}
            iconBg="bg-rose-100 text-rose-700"
            badge="Petty Cash"
            badgeColor="bg-rose-50 text-rose-700"
          />
        )}

        {/* KPI 8: Operations Pipeline (Challans & Quotations) */}
        {(config.kpiChallans || config.kpiQuotations) && (
          <StatCard
            title="Operations & Quotes"
            value={`${pendingChallansCount} / ${openQuotationsCount}`}
            subtitle={`${pendingChallansCount} challans • ${openQuotationsCount} open quotes`}
            icon={<Truck className="w-5 h-5 text-slate-700" />}
            iconBg="bg-slate-100 text-slate-700"
            badge="In Transit"
            badgeColor="bg-slate-100 text-slate-700"
          />
        )}
      </div>

      {/* 4. Analytics & Operational Gauges Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Revenue Velocity Trend Chart */}
        {config.chartRevenue ? (
          <div className="lg:col-span-8 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            {/* Chart Header & Range Switchers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Revenue Velocity & Growth
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-100 text-lime-900">
                    Live Database
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Daily billings and transaction volumes across counters
                </p>
              </div>

              {/* Time Range Pills */}
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/60 self-start sm:self-auto text-xs font-bold">
                {(["7D", "30D", "6M"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setChartRange(r);
                      setHoveredIdx(null);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all",
                      chartRange === r
                        ? "bg-white text-slate-950 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {r === "7D" ? "Last 7 Days" : r === "30D" ? "Last 30 Days" : "Last 6 Months"}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Curve Chart */}
            <div className="relative pt-2">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-44 overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#84CC16" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#84CC16" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                  const y = (svgHeight - paddingY) - frac * graphHeight;
                  return (
                    <line
                      key={idx}
                      x1="0"
                      y1={y}
                      x2={svgWidth}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Shaded Area */}
                {areaPath && <path d={areaPath} fill="url(#revenueGrad)" />}

                {/* Smooth Curve Stroke */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#65A30D"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Points */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredIdx === idx;
                  const isPeak = idx === peakIndex;
                  return (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="14"
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                      {(isHovered || isPeak) && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 5}
                          fill="#84CC16"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          className="transition-all"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {activeHover && (
                <div
                  style={{
                    left: `${(activeHover.x / svgWidth) * 100}%`,
                    top: `${Math.max(10, (activeHover.y / svgHeight) * 100 - 30)}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                  className="absolute pointer-events-none z-10 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col items-center gap-0.5 whitespace-nowrap transition-all duration-150"
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                    <span>{activeHover.item.fullDate || activeHover.item.label}</span>
                  </div>
                  <span className="text-sm font-black text-lime-400">
                    {formatCurrency(activeHover.item.total)}
                  </span>
                  {activeHover.item.count !== undefined && (
                    <span className="text-[9px] text-slate-400">
                      {activeHover.item.count} {activeHover.item.count === 1 ? "sale" : "sales"}
                    </span>
                  )}
                </div>
              )}

              {/* X-Axis Labels */}
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-3 px-1 select-none">
                {chartRange === "7D"
                  ? currentSeries.map((d, i) => <span key={i}>{d.label}</span>)
                  : chartRange === "30D"
                  ? currentSeries
                      .filter((_, i) => i % 5 === 0 || i === currentSeries.length - 1)
                      .map((d, i) => <span key={i}>{d.label}</span>)
                  : currentSeries.map((d, i) => <span key={i}>{d.label}</span>)}
              </div>
            </div>

            {/* Stock Availability Health Bar */}
            {config.widgetStockBar && (
              <div className="pt-3 border-t border-slate-100">
                <StockAvailabilityBar
                  inStock={Math.max(0, totalProductsCount - lowStockItems.length)}
                  lowStock={lowStockItems.length}
                  outOfStock={0}
                />
              </div>
            )}
          </div>
        ) : null}

        {/* Right 4 Cols: Payment Share Breakdown & Operations Gauge */}
        <div className={cn("space-y-4", config.chartRevenue ? "lg:col-span-4" : "lg:col-span-12")}>
          {/* Payment Method Share */}
          {config.chartPaymentModes && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Today&apos;s Payment Channels</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  Settlement Split
                </span>
              </div>

              {/* Segmented Distribution Bar */}
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${cashPct}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Cash: ${cashPct}%`}
                />
                <div
                  style={{ width: `${upiPct}%` }}
                  className="bg-indigo-500 h-full transition-all"
                  title={`UPI: ${upiPct}%`}
                />
                <div
                  style={{ width: `${creditPct}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`Udhaar / Credit: ${creditPct}%`}
                />
              </div>

              {/* Legend & Amounts */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700">Cash Drawer</span>
                  </div>
                  <div className="text-right font-black text-slate-900">
                    {formatCurrency(todayCashTotal)}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">({cashPct}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="font-bold text-slate-700">Digital UPI</span>
                  </div>
                  <div className="text-right font-black text-slate-900">
                    {formatCurrency(todayUpiTotal)}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">({upiPct}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-bold text-slate-700">Credit / Udhaar</span>
                  </div>
                  <div className="text-right font-black text-slate-900">
                    {formatCurrency(todayCreditTotal)}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">({creditPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Job Orders Widget */}
          {config.tableActiveJobs && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Press Work Orders</h3>
                  <span className="text-[11px] text-slate-400">{activeJobs.length} in production</span>
                </div>
                <Link
                  href="/jobs"
                  className="text-xs font-bold text-lime-700 hover:text-lime-800 bg-lime-50 px-2.5 py-1 rounded-xl flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2">
                {activeJobs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No active jobs in workshop
                  </div>
                ) : (
                  activeJobs.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          {job.jobOrderNumber}
                        </span>
                        <StatusBadge status={job.status} size="sm" />
                      </div>
                      <div className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                        {job.jobType}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>{job.customerName}</span>
                        <span className="font-bold text-slate-800">
                          {job.quantity} {job.unitName}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Data Hub: Customer Credit Watchlist & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 Cols: Customer Credit & Udhaar Watchlist */}
        {config.tableCreditWatch && (
          <div className="lg:col-span-6 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                  <Users2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Customer Udhaar Watchlist</h3>
                  <p className="text-[11px] text-slate-400">Clients with highest outstanding debt</p>
                </div>
              </div>
              <Link
                href="/customers"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
              >
                Statement Hub →
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {topDebtors.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No overdue credit balances! All client accounts clear.
                </div>
              ) : (
                topDebtors.map((client) => {
                  const isLimitExceeded =
                    client.creditLimit > 0 && client.currentBalance > client.creditLimit;
                  const whatsappUrl = generateWhatsAppCustomerStatementUrl({
                    phone: client.phone || "",
                    customerName: client.name,
                    balanceDue: client.currentBalance,
                    shopName: shopSettings?.shopName || "Crystal Press",
                    upiId: shopSettings?.upiId,
                  });

                  return (
                    <div
                      key={client.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{client.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {client.phone ? `+91 ${client.phone}` : "No phone"}
                          {isLimitExceeded && (
                            <span className="text-rose-600 font-bold ml-2">Limit Breached!</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-slate-900 text-xs text-right font-mono">
                          {formatCurrency(client.currentBalance)}
                        </span>

                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send WhatsApp Payment Due Reminder"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right 6 Cols: Low Stock Reorder List */}
        {config.tableLowStock && (
          <div className="lg:col-span-6 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Low Stock Reorders</h3>
                  <p className="text-[11px] text-slate-400">Inventory items below minimum safety level</p>
                </div>
              </div>
              <Link
                href="/inventory"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
              >
                Inventory Hub →
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {lowStockItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Warehouse well-stocked! All items above minimum threshold.
                </div>
              ) : (
                lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.skuCode}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-rose-700 text-xs px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                        {item.currentStock} {item.unitCode} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Recent Counter Sales & Bills Table */}
      {config.tableRecentSales && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Recent Counter Invoices
              </h3>
              <p className="text-xs text-slate-400">Latest retail POS counter billing transactions</p>
            </div>
            <Link
              href="/pos"
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-xs"
            >
              + Open POS (F8)
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Bill No</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3">Payment Mode</th>
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No counter sales recorded yet today
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-2 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 font-semibold text-slate-800">{inv.customerName}</td>
                      <td className="py-3 text-slate-500">{inv.itemCount} items</td>
                      <td className="py-3">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-[11px]">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{formatDate(inv.createdAt)}</td>
                      <td className="py-3 text-right font-black text-slate-900">
                        {formatCurrency(inv.netTotal)}
                      </td>
                      <td className="py-3 text-center">
                        <StatusBadge status={inv.status} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Dashboard Customizer Modal */}
      {isAdmin && (
        <DashboardCustomizerModal
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          config={config}
          onChange={handleConfigChange}
        />
      )}
    </div>
  );
}
