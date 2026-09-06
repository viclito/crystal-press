"use server";

import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface LoyaltySettingsData {
  isLoyaltyEnabled: boolean;
  loyaltySpendPerPoint: number;
  loyaltyPointValue: number;
  maxLoyaltyDiscountPercent: number;
  loyaltyDiscountType: "RUPEES" | "PERCENT";
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

/**
 * Retrieves the current shop loyalty rules
 */
export async function getLoyaltySettingsAction(): Promise<{
  success: boolean;
  settings: LoyaltySettingsData;
}> {
  try {
    const s = await prisma.shopSettings.findFirst();

    return {
      success: true,
      settings: {
        isLoyaltyEnabled: s?.isLoyaltyEnabled ?? true,
        loyaltySpendPerPoint: Number(s?.loyaltySpendPerPoint ?? 100),
        loyaltyPointValue: Number(s?.loyaltyPointValue ?? 1),
        maxLoyaltyDiscountPercent: Number(s?.maxLoyaltyDiscountPercent ?? 50),
        loyaltyDiscountType: (s?.loyaltyDiscountType as "RUPEES" | "PERCENT") || "RUPEES",
      },
    };
  } catch (error: any) {
    return {
      success: false,
      settings: {
        isLoyaltyEnabled: true,
        loyaltySpendPerPoint: 100,
        loyaltyPointValue: 1,
        maxLoyaltyDiscountPercent: 50,
        loyaltyDiscountType: "RUPEES",
      },
    };
  }
}

/**
 * Admin action to update loyalty rules (Rupees vs Percentage, spend per point, etc.)
 */
export async function updateLoyaltySettingsAction(data: {
  isLoyaltyEnabled: boolean;
  loyaltySpendPerPoint: number;
  loyaltyPointValue: number;
  maxLoyaltyDiscountPercent: number;
  loyaltyDiscountType: "RUPEES" | "PERCENT";
}) {
  try {
    let setting = await prisma.shopSettings.findFirst();

    if (setting) {
      await prisma.shopSettings.update({
        where: { id: setting.id },
        data: {
          isLoyaltyEnabled: data.isLoyaltyEnabled,
          loyaltySpendPerPoint: data.loyaltySpendPerPoint,
          loyaltyPointValue: data.loyaltyPointValue,
          maxLoyaltyDiscountPercent: data.maxLoyaltyDiscountPercent,
          loyaltyDiscountType: data.loyaltyDiscountType,
        },
      });
    } else {
      await prisma.shopSettings.create({
        data: {
          shopName: "Crystal Press",
          isLoyaltyEnabled: data.isLoyaltyEnabled,
          loyaltySpendPerPoint: data.loyaltySpendPerPoint,
          loyaltyPointValue: data.loyaltyPointValue,
          maxLoyaltyDiscountPercent: data.maxLoyaltyDiscountPercent,
          loyaltyDiscountType: data.loyaltyDiscountType,
        },
      });
    }

    safeRevalidate("/settings");
    safeRevalidate("/pos");
    safeRevalidate("/customers");
    return { success: true };
  } catch (error: any) {
    console.error("updateLoyaltySettingsAction error:", error);
    return { success: false, error: error?.message || "Failed to update loyalty settings" };
  }
}

/**
 * Recharges / adds funds to a customer's store credit wallet
 */
export async function rechargeCustomerWallet(data: {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    const rechargeAmt = Math.max(0, Number(data.amount) || 0);
    if (rechargeAmt <= 0) {
      return { success: false, error: "Recharge amount must be greater than zero." };
    }

    const currentBal = Number(customer.walletBalance) || 0;
    const newBal = currentBal + rechargeAmt;
    const currentPoints = customer.loyaltyPoints || 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Customer wallet balance
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          walletBalance: newBal,
        },
      });

      // 2. Create Wallet Transaction Log
      const transaction = await tx.customerWalletTransaction.create({
        data: {
          customerId: customer.id,
          type: "WALLET_TOPUP",
          amount: rechargeAmt,
          points: 0,
          runningWalletBalance: newBal,
          runningPointsBalance: currentPoints,
          paymentMethod: data.paymentMethod,
          referenceType: "MANUAL_TOPUP",
          notes: data.notes || `Store credit recharge via ${data.paymentMethod}`,
        },
      });

      return { updatedCustomer, transaction };
    });

    safeRevalidate("/customers");
    safeRevalidate("/pos");
    return {
      success: true,
      newBalance: newBal,
      transaction: result.transaction,
    };
  } catch (error: any) {
    console.error("rechargeCustomerWallet error:", error);
    return { success: false, error: error?.message || "Failed to recharge customer wallet" };
  }
}

/**
 * Retrieves the full digital passbook (wallet debits, credits, and loyalty points history)
 */
export async function getCustomerWalletPassbook(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        walletTransactions: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        walletBalance: Number(customer.walletBalance),
        loyaltyPoints: customer.loyaltyPoints,
      },
      transactions: customer.walletTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        points: t.points,
        runningWalletBalance: Number(t.runningWalletBalance),
        runningPointsBalance: t.runningPointsBalance,
        paymentMethod: t.paymentMethod,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("getCustomerWalletPassbook error:", error);
    return { success: false, error: error?.message || "Failed to load wallet passbook" };
  }
}

/**
 * Generates official WhatsApp share link with wallet and loyalty status
 */
export async function generateWhatsAppLoyaltyUrl(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  const settings = await prisma.shopSettings.findFirst();
  const shopName = settings?.shopName || "Crystal Press";
  const shopPhone = settings?.phone1 || "+91 98765 43210";

  if (!customer) return "";

  const cleanPhone = (customer.phone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const walletBal = Number(customer.walletBalance).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  });
  const points = customer.loyaltyPoints.toLocaleString("en-IN");

  const message =
`*${shopName.toUpperCase()} — LOYALTY & STORE CREDIT STATEMENT* ⭐💳

Hello *${customer.name}*,

Thank you for being our valued customer! Here is your latest account rewards summary:

💳 *Store Credit Wallet Balance:* ₹${walletBal}
⭐ *Loyalty Reward Points:* ${points} Points

💡 *How to use:*
You can redeem your reward points and wallet credit at our counter to discount your next print order or stationery purchase!

📍 *Store:* ${shopName}
📞 *Helpdesk:* ${shopPhone}

_Thank you for choosing us!_`.trim();

  if (!formattedPhone) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
