"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Printer,
  Boxes,
  Truck,
  FileText,
  Banknote,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Inbox,
  X,
} from "lucide-react";
import { getSystemNotifications, SystemNotification } from "@/actions/notifications";
import { toast } from "@/stores/useSnackbarStore";

const STORAGE_KEY = "cp_read_notifications_v1";

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "URGENT" | "STOCK" | "JOBS">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch {}
  }, []);

  // Fetch notifications
  const fetchNotifications = async (showToast = false) => {
    setIsLoading(true);
    try {
      const res = await getSystemNotifications();
      if (res.success) {
        setNotifications(res.notifications);
        if (showToast) {
          toast.success("Notifications refreshed", "Updated");
        }
      }
    } catch (e) {
      console.warn("Failed to fetch notifications:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 60 seconds
    const timer = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Mark all as read
  const handleMarkAllRead = () => {
    const allIds = new Set([...Array.from(readIds), ...notifications.map((n) => n.id)]);
    setReadIds(allIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(allIds)));
    } catch {}
    toast.info("All notifications marked as read");
  };

  // Mark single as read and navigate
  const handleItemClick = (notification: SystemNotification) => {
    const next = new Set(readIds);
    next.add(notification.id);
    setReadIds(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {}

    setIsOpen(false);
    router.push(notification.link);
  };

  // Filter list
  const filteredList = notifications.filter((n) => {
    if (selectedFilter === "URGENT") return n.severity === "urgent";
    if (selectedFilter === "STOCK") return n.type === "low_stock";
    if (selectedFilter === "JOBS") return n.type === "job_order";
    return true;
  });

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const urgentCount = notifications.filter((n) => n.severity === "urgent" && !readIds.has(n.id)).length;

  const getNotificationIcon = (type: SystemNotification["type"]) => {
    switch (type) {
      case "low_stock":
        return <Boxes className="w-4 h-4 text-amber-600" />;
      case "job_order":
        return <Printer className="w-4 h-4 text-sky-600" />;
      case "udhaar":
        return <Banknote className="w-4 h-4 text-rose-600" />;
      case "challan":
        return <Truck className="w-4 h-4 text-emerald-600" />;
      case "quotation":
        return <FileText className="w-4 h-4 text-indigo-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getIconContainerBg = (type: SystemNotification["type"]) => {
    switch (type) {
      case "low_stock":
        return "bg-amber-50 border-amber-200/80";
      case "job_order":
        return "bg-sky-50 border-sky-200/80";
      case "udhaar":
        return "bg-rose-50 border-rose-200/80";
      case "challan":
        return "bg-emerald-50 border-emerald-200/80";
      case "quotation":
        return "bg-indigo-50 border-indigo-200/80";
      default:
        return "bg-slate-50 border-slate-200/80";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) fetchNotifications();
          setIsOpen(!isOpen);
        }}
        title="Notifications & System Alerts"
        aria-label="Notifications"
        className={`relative p-2.5 rounded-2xl transition-all border ${
          isOpen
            ? "bg-slate-900 text-white border-slate-900 shadow-md"
            : unreadCount > 0
            ? "text-slate-800 bg-white hover:bg-slate-50 border-slate-200/90 shadow-xs"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-slate-100"
        }`}
      >
        <Bell className={`w-4 h-4 ${isOpen ? "text-lime-400" : unreadCount > 0 ? "text-slate-800" : ""}`} />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-xs animate-in zoom-in ${
              urgentCount > 0 ? "bg-rose-600 ring-2 ring-white" : "bg-lime-500 text-slate-950 ring-2 ring-white"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-16px)] sm:w-96 max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Notifications</h3>
                  {unreadCount > 0 ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      All caught up
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-400">Warehouse, press & accounts alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                disabled={isLoading}
                title="Refresh alerts"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-lime-600" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Category Filter Tabs */}
          <div className="flex items-center gap-1.5 p-2 px-3 border-b border-slate-100 bg-white overflow-x-auto text-[11px] font-bold select-none no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedFilter("ALL")}
              className={`px-2.5 py-1 rounded-xl transition-all shrink-0 ${
                selectedFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("URGENT")}
              className={`px-2.5 py-1 rounded-xl transition-all shrink-0 flex items-center gap-1 ${
                selectedFilter === "URGENT"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Urgent ({notifications.filter((n) => n.severity === "urgent").length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("STOCK")}
              className={`px-2.5 py-1 rounded-xl transition-all shrink-0 ${
                selectedFilter === "STOCK"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Stock ({notifications.filter((n) => n.type === "low_stock").length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("JOBS")}
              className={`px-2.5 py-1 rounded-xl transition-all shrink-0 ${
                selectedFilter === "JOBS"
                  ? "bg-sky-600 text-white"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100"
              }`}
            >
              Jobs ({notifications.filter((n) => n.type === "job_order").length})
            </button>
          </div>

          {/* Notification List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar max-h-96">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">No Notifications</div>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
                  {selectedFilter === "ALL"
                    ? "Everything is running smoothly. No active alerts right now."
                    : "No items match the selected category filter."}
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isRead = readIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 group ${
                      isRead ? "bg-white opacity-70 hover:opacity-100 hover:bg-slate-50/80" : "bg-slate-50/40 hover:bg-slate-100/70"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${getIconContainerBg(
                        item.type
                      )}`}
                    >
                      {getNotificationIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          {!isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-lime-500 shrink-0" />
                          )}
                          <span
                            className={`text-xs font-bold truncate ${
                              isRead ? "text-slate-600 font-semibold" : "text-slate-900"
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                            item.severity === "urgent"
                              ? "bg-rose-100 text-rose-800"
                              : item.severity === "warning"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.time}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-extrabold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark all as read</span>
              </button>
            ) : (
              <span className="text-[10.5px] font-semibold text-slate-400">All caught up</span>
            )}

            <div className="flex items-center gap-2">
              <Link
                href="/jobs"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-extrabold text-lime-700 hover:text-lime-800 transition-colors flex items-center gap-0.5"
              >
                <span>Production</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
              <span className="text-slate-300">•</span>
              <Link
                href="/inventory"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-extrabold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-0.5"
              >
                <span>Inventory</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
