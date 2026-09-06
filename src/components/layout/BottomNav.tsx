"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Printer,
  Users2,
  Menu,
  Wallet,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/useSidebarStore";

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { mobileNavStyle, toggleMobileOpen, isMobileOpen } = useSidebarStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRole = ((session?.user as any)?.role as string) || "ADMIN";
  const isCashier = userRole === "CASHIER";

  // Hide if not mounted or user opted for pure drawer mode
  if (!mounted || mobileNavStyle !== "bottom_bar") {
    return null;
  }

  // Role-aware primary tabs
  const tabs = isCashier
    ? [
        { name: "POS", href: "/pos", icon: Calculator, badge: "F8" },
        { name: "Shifts", href: "/shifts", icon: Wallet },
        { name: "Jobs", href: "/jobs", icon: Printer },
        { name: "Customers", href: "/customers", icon: Users2 },
      ]
    : [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "POS", href: "/pos", icon: Calculator, badge: "F8" },
        { name: "Jobs", href: "/jobs", icon: Printer },
        { name: "Customers", href: "/customers", icon: Users2 },
      ];

  return (
    <nav
      aria-label="Bottom Navigation Bar"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-safe select-none"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all relative group",
                isActive
                  ? "text-slate-950 font-black"
                  : "text-slate-400 hover:text-slate-700 font-semibold"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all relative flex items-center justify-center",
                  isActive
                    ? "bg-lime-400 text-slate-950 shadow-xs scale-105"
                    : "group-hover:bg-slate-100 text-slate-500"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-black px-1 py-0.2 bg-slate-900 text-lime-400 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-none truncate max-w-[64px]">
                {tab.name}
              </span>
            </Link>
          );
        })}

        {/* 'More' Button triggering the full module drawer */}
        <button
          type="button"
          onClick={toggleMobileOpen}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all relative group",
            isMobileOpen
              ? "text-lime-700 font-black"
              : "text-slate-400 hover:text-slate-700 font-semibold"
          )}
          title="Open All Modules Menu"
        >
          <div
            className={cn(
              "p-1.5 rounded-xl transition-all relative flex items-center justify-center",
              isMobileOpen
                ? "bg-slate-900 text-lime-400 shadow-xs"
                : "group-hover:bg-slate-100 text-slate-500"
            )}
          >
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight leading-none">
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
