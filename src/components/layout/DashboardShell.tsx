"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { cn } from "@/lib/utils";

export function DashboardShell({
  children,
  title = "Dashboard",
  hideHeader = false,
  noPadding = false,
}: {
  children: React.ReactNode;
  title?: string;
  hideHeader?: boolean;
  noPadding?: boolean;
}) {
  const { mobileNavStyle } = useSidebarStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasBottomNav = mounted && mobileNavStyle === "bottom_bar";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Persistent Left Sidebar on Desktop & Slide Drawer on Mobile */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {!hideHeader && <Header title={title} />}
        <main
          className={cn(
            "flex-1 overflow-y-auto max-w-[1600px] w-full mx-auto",
            noPadding ? "p-2 sm:p-3" : "p-3 sm:p-5 md:p-6",
            hasBottomNav ? "pb-24 lg:pb-6" : "pb-6"
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
