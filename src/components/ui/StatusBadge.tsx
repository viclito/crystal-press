import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  customLabel?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, customLabel, className, size = "md" }: StatusBadgeProps) {
  const configs: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    // Job Order Statuses
    ORDER_PLACED: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", label: "Order Placed" },
    DESIGNING: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500", label: "Designing" },
    PROOF_APPROVAL: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Proof Sent" },
    PRINTING: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", label: "Printing" },
    FINISHING: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", label: "Finishing" },
    READY_FOR_PICKUP: { bg: "bg-lime-100", text: "text-lime-900", dot: "bg-lime-600", label: "Ready for Pickup" },
    DELIVERED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Delivered" },
    CANCELLED: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Cancelled" },

    // Invoices & Payment Statuses
    COMPLETED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Paid" },
    PAID: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Paid" },
    PARTIAL: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", label: "Partial Paid" },
    DUE: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Udhaar Due" },
    HELD: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500", label: "Held / Parked" },

    // Inventory Statuses
    IN_STOCK: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "In Stock" },
    LOW_STOCK: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Low Stock" },
    OUT_OF_STOCK: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Out of Stock" },

    // Room / Item Types
    DELUXE: { bg: "bg-lime-100", text: "text-lime-900", dot: "bg-lime-500", label: "Deluxe" },
    STANDARD: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500", label: "Standard" },
    SUITE: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500", label: "Premium" },
  };

  const key = status?.toUpperCase() || "DEFAULT";
  const config = configs[key] || {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    label: customLabel || status,
  };

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold transition-colors",
        config.bg,
        config.text,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("rounded-full flex-shrink-0", config.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {customLabel || config.label}
    </span>
  );
}
