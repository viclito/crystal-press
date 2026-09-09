import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: any): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined, formatString: string = "dd MMM yyyy, hh:mm a"): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function serializeShopSettings(settings: any) {
  if (!settings) return null;
  return {
    ...settings,
    defaultTaxRate: Number(settings.defaultTaxRate || 0),
    loyaltySpendPerPoint: Number(settings.loyaltySpendPerPoint ?? 100),
    loyaltyPointValue: Number(settings.loyaltyPointValue ?? 1),
    maxLoyaltyDiscountPercent: Number(settings.maxLoyaltyDiscountPercent ?? 50),
    loyaltyDiscountType: settings.loyaltyDiscountType || "RUPEES",
    isLoyaltyEnabled: settings.isLoyaltyEnabled ?? true,
    dashboardConfig: settings.dashboardConfig
      ? typeof settings.dashboardConfig === "string"
        ? JSON.parse(settings.dashboardConfig)
        : settings.dashboardConfig
      : null,
    updatedAt: settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : (settings.updatedAt || null),
  };
}
