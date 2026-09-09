"use client";

import React, { useEffect, useState } from "react";
import { Settings, LogOut, Clock, User, Shield, Sparkles, Zap, Menu } from "lucide-react";
import { useSession, signOut, signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "@/stores/useSnackbarStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";

export function Header({ title = "Dashboard" }: { title?: string }) {
  const { data: session } = useSession();
  const [timeStr, setTimeStr] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { toggleMobileOpen } = useSidebarStore();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const userName = session?.user?.name || (session?.user as any)?.fullName || "Jaylon Dorwart";
  const userRole = ((session?.user as any)?.role as string) || "ADMIN";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CP";

  const handleSwitchShift = async (u: string, p: string, roleName: string) => {
    setIsDropdownOpen(false);
    toast.info(`Switching shift to ${roleName}...`, "Switching Shift");
    const res = await signIn("credentials", {
      username: u,
      password: p,
      redirect: false,
    });
    if (res?.error) {
      toast.error("Failed to switch shift");
    } else {
      toast.success(`Logged in as ${roleName}`, "Shift Switched");
      if (u === "cashier") {
        window.location.href = "/pos";
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title, Hamburger & Shift Status */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={toggleMobileOpen}
          className="lg:hidden p-2 -ml-1 rounded-2xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
            {title}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeStr || "Loading..."}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Interactive Notification Center */}
        <NotificationDropdown />

        {/* Settings Button */}
        {userRole === "ADMIN" && (
          <Link
            href="/settings"
            title="Settings"
            className="p-2.5 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors border border-slate-100"
          >
            <Settings className="w-4 h-4" />
          </Link>
        )}

        {/* User Profile Dropdown */}
        <div className="relative pl-3 border-l border-slate-100">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 p-1 rounded-2xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">{userName}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {userRole === "ADMIN" ? "Owner / Admin" : userRole === "MANAGER" ? "Store Manager" : "Cashier / Biller"}
              </div>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl p-3 border border-slate-100 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-slate-100 mb-2">
                <div className="text-xs font-bold text-slate-900">{userName}</div>
                <div className="text-[10px] text-slate-400">{session?.user?.email || "Staff Terminal"}</div>
                <span className="mt-1.5 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-lime-100 text-lime-900">
                  {userRole}
                </span>
              </div>

              {/* Quick Shift Switcher in Dropdown */}
              <div className="space-y-1 mb-2 pb-2 border-b border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                  ⚡ Quick Shift Switcher
                </span>

                {/* Admin */}
                <button
                  type="button"
                  onClick={() => handleSwitchShift("admin", "admin123", "Admin / Owner")}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left transition-colors flex items-center justify-between text-xs ${
                    userRole === "ADMIN" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Admin</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">admin</span>
                </button>

                {/* Manager */}
                <button
                  type="button"
                  onClick={() => handleSwitchShift("manager", "manager123", "Manager")}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left transition-colors flex items-center justify-between text-xs ${
                    userRole === "MANAGER" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    <span>Manager</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">manager</span>
                </button>

                {/* Cashier */}
                <button
                  type="button"
                  onClick={() => handleSwitchShift("cashier", "cashier123", "Cashier")}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left transition-colors flex items-center justify-between text-xs ${
                    userRole === "CASHIER" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>Cashier</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">cashier</span>
                </button>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
