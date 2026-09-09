"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Printer,
  FileText,
  Boxes,
  Users2,
  Truck,
  BarChart3,
  Receipt,
  Settings,
  Sparkles,
  Layers,
  LogOut,
  Scissors,
  Building2,
  PackageCheck,
  Barcode,
  MessageSquare,
  Wallet,
  ExternalLink,
  FolderTree,
  List,
  ChevronDown,
  ChevronRight,
  X,
  Smartphone,
  PanelLeft,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/useSidebarStore";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  allowedRoles?: string[];
  openInNewTab?: boolean;
}

interface NavCategory {
  key: string;
  title: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    key: "OPERATIONS",
    title: "Counter & Operations",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, allowedRoles: ["ADMIN", "MANAGER"] },
      { name: "POS Counter", href: "/pos", icon: Calculator, badge: "F8", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
      { name: "Cash Drawer & Shifts", href: "/shifts", icon: Wallet, badge: "F10", badgeColor: "bg-emerald-100 text-emerald-800 font-bold", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    ],
  },
  {
    key: "PRINT_HUB",
    title: "Print & Order Hub",
    items: [
      { name: "Job Orders", href: "/jobs", icon: Printer, badge: "3", badgeColor: "bg-purple-100 text-purple-700", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
      { name: "Print Estimator", href: "/calculator", icon: Scissors, badge: "New", badgeColor: "bg-lime-100 text-lime-900 font-bold", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
      { name: "Quotations", href: "/quotations", icon: FileText, allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
      { name: "Delivery Challans", href: "/challans", icon: PackageCheck, allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
      { name: "Order Tracking & Proof", href: "/track", icon: Sparkles, badge: "Public", badgeColor: "bg-emerald-100 text-emerald-800 font-bold", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"], openInNewTab: true },
      { name: "WhatsApp Hub", href: "/whatsapp", icon: MessageSquare, badge: "Hub", badgeColor: "bg-emerald-100 text-emerald-800 font-bold", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    ],
  },
  {
    key: "INVENTORY",
    title: "Inventory & Stock",
    items: [
      { name: "Inventory", href: "/inventory", icon: Boxes, badge: "Low", badgeColor: "bg-rose-100 text-rose-700", allowedRoles: ["ADMIN", "MANAGER"] },
      { name: "Barcode Studio", href: "/barcodes", icon: Barcode, allowedRoles: ["ADMIN", "MANAGER"] },
      { name: "Purchases", href: "/purchases", icon: Truck, allowedRoles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    key: "PARTIES",
    title: "Parties & Udhaar",
    items: [
      { name: "Customers & Udhaar", href: "/customers", icon: Users2, allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
      { name: "Vendors & Payables", href: "/vendors", icon: Building2, allowedRoles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    key: "FINANCE_ADMIN",
    title: "Finance & Admin",
    items: [
      { name: "Expenses", href: "/expenses", icon: Receipt, allowedRoles: ["ADMIN", "MANAGER"] },
      { name: "Reports", href: "/reports", icon: BarChart3, allowedRoles: ["ADMIN"] },
      { name: "Settings", href: "/settings", icon: Settings, allowedRoles: ["ADMIN"] },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    layout,
    collapsedCategories,
    mobileNavStyle,
    isMobileOpen,
    setLayout,
    setMobileNavStyle,
    setMobileOpen,
    toggleCategory,
  } = useSidebarStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const userRole = ((session?.user as any)?.role as string) || "ADMIN";
  const isCashier = userRole === "CASHIER";

  // Filter items in each category based on role
  const visibleCategories = navCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => !i.allowedRoles || i.allowedRoles.includes(userRole)),
    }))
    .filter((cat) => cat.items.length > 0);

  // Flat list for Classic mode
  const flatVisibleItems = visibleCategories.flatMap((cat) => cat.items);

  // For cashiers, only classic view is used. For admins/managers, use saved preference.
  const activeLayout = isCashier ? "classic" : (mounted ? layout : "tree");

  const renderNavItem = (item: NavItem, isTreeChild = false) => {
    const isActive =
      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        onClick={() => setMobileOpen(false)}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
        className={cn(
          "flex items-center justify-between rounded-2xl font-medium transition-all duration-150 group",
          isTreeChild ? "px-2.5 py-1.5 text-[11.5px]" : "px-3 py-2 text-xs",
          isActive
            ? "bg-lime-200/90 text-slate-900 font-bold shadow-[0_2px_10px_rgba(217,249,157,0.4)]"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={cn(
              "shrink-0 transition-transform group-hover:scale-110",
              isTreeChild ? "w-3.5 h-3.5" : "w-4 h-4",
              isActive ? "text-slate-900 stroke-[2.5]" : "text-slate-400"
            )}
          />
          <span className="truncate">{item.name}</span>
          {item.openInNewTab && (
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors opacity-70" />
          )}
        </div>

        {item.badge && (
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors shrink-0",
              isActive
                ? "bg-white/80 text-slate-900 shadow-sm"
                : item.badgeColor || "bg-slate-100 text-slate-500"
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="h-full flex flex-col justify-between overflow-hidden">
      {/* Pinned Brand Header */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1 mb-3 pb-3 border-b border-slate-100/70">
        <Link
          href={userRole === "CASHIER" ? "/pos" : "/"}
          prefetch={false}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime shrink-0">
            <Layers className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Crystal Press</h1>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {userRole} Mode
            </span>
          </div>
        </Link>

        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scrollable Area with Hidden Scrollbar */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col justify-between min-h-0 space-y-4 pr-0.5">
        {/* Navigation List */}
        <nav className="space-y-3">
          {activeLayout === "tree" ? (
            /* Organized Categorized Tree Layout */
            <div className="space-y-3">
              {visibleCategories.map((category) => {
                const isCollapsed = collapsedCategories.includes(category.key);
                const hasActiveItem = category.items.some(
                  (i) => pathname === i.href || (i.href !== "/" && pathname.startsWith(i.href))
                );

                return (
                  <div key={category.key} className="space-y-1">
                    {/* Category Header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.key)}
                      className="w-full flex items-center justify-between px-2 py-1 rounded-xl text-left text-slate-400 hover:text-slate-700 hover:bg-slate-50/80 transition-colors group"
                      title={isCollapsed ? `Expand ${category.title}` : `Collapse ${category.title}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 truncate">
                          {category.title}
                        </span>
                        {hasActiveItem && (
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <span className="text-[10px] font-mono font-bold text-slate-300 group-hover:text-slate-400">
                          {category.items.length}
                        </span>
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 transition-transform" />
                        ) : (
                          <ChevronDown className="w-3 h-3 transition-transform" />
                        )}
                      </div>
                    </button>

                    {/* Category Items */}
                    {!isCollapsed && (
                      <div className="space-y-0.5 pl-1.5 border-l-2 border-slate-100/90 ml-2">
                        {category.items.map((item) => renderNavItem(item, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Classic Flat List View */
            <div className="space-y-1">
              {flatVisibleItems.map((item) => renderNavItem(item, false))}
            </div>
          )}
        </nav>

        {/* Bottom Promo, Layout Selector & Sign Out Widget */}
        <div className="space-y-2 pt-2 pb-1 shrink-0">
          {/* Quick Switchers (Visible only to Admin & Manager, hidden for Cashier) */}
          {!isCashier && (
            <div className="space-y-1.5">
              {/* Layout Switcher: Tree vs Classic */}
              <div className="p-1 bg-slate-100/90 rounded-2xl flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setLayout("tree")}
                  className={cn(
                    "flex-1 py-1 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5",
                    activeLayout === "tree"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                  title="Organized Tree View (Category headings)"
                >
                  <FolderTree className="w-3.5 h-3.5 text-lime-600" />
                  <span>Tree</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayout("classic")}
                  className={cn(
                    "flex-1 py-1 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5",
                    activeLayout === "classic"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                  title="Classic Flat List View"
                >
                  <List className="w-3.5 h-3.5 text-slate-500" />
                  <span>Classic</span>
                </button>
              </div>

              {/* Mobile Navigation Style Switcher */}
              <div className="p-1 bg-slate-100/90 rounded-2xl flex items-center gap-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setMobileNavStyle("bottom_bar")}
                  className={cn(
                    "flex-1 py-1 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1",
                    mobileNavStyle === "bottom_bar"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                  title="Mobile Down Side Navbar (Bottom Dock)"
                >
                  <Smartphone className="w-3 h-3 text-emerald-600" />
                  <span>Bottom Nav</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileNavStyle("drawer")}
                  className={cn(
                    "flex-1 py-1 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1",
                    mobileNavStyle === "drawer"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                  title="Mobile Header Drawer Navigation"
                >
                  <PanelLeft className="w-3 h-3 text-slate-500" />
                  <span>Drawer</span>
                </button>
              </div>
            </div>
          )}

          <div className="bg-lime-50 rounded-3xl p-3.5 border border-lime-200/60 shadow-[0_2px_12px_rgba(217,249,157,0.2)]">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-lime-200 rounded-xl text-slate-900">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900">Crystal Press POS</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Logged in as <strong>{session?.user?.name || "Staff"}</strong> ({userRole})
            </p>
            <Link
              href="/pos"
              prefetch={false}
              onClick={() => setMobileOpen(false)}
              className="mt-2.5 block w-full py-1.5 text-center text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
            >
              Counter POS (F8)
            </Link>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full py-2 px-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-rose-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Shift</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white h-screen border-r border-slate-100 flex-col p-4 select-none overflow-hidden">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer Sheet */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-300",
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Dark Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />

        {/* Sliding Off-Canvas Drawer */}
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col p-4 select-none overflow-hidden transition-transform duration-300 ease-out",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>
    </>
  );
}
