"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializeShopSettings } from "@/lib/utils";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside Next.js request context
  }
}

// ----------------------------------------------------
// SCHEMAS
// ----------------------------------------------------

const VendorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Vendor / Paper Mill name is required").trim(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  outstandingBalance: z.number().default(0),
});

const VendorPaymentSchema = z.object({
  vendorId: z.string().uuid("Invalid vendor ID"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  transactionRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paidAt: z.string().optional(),
});

export type VendorInput = z.infer<typeof VendorSchema>;
export type VendorPaymentInput = z.infer<typeof VendorPaymentSchema>;

// ----------------------------------------------------
// QUERY ACTIONS
// ----------------------------------------------------

export async function getVendors(filters?: {
  search?: string;
  hasBalanceOnly?: boolean;
}) {
  try {
    const where: any = { isActive: true };

    if (filters?.hasBalanceOnly) {
      where.outstandingBalance = { gt: 0 };
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { contactPerson: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            vendorPayments: true,
          },
        },
      },
    });

    // Compute Summary KPIs
    const allVendors = await prisma.vendor.findMany({
      where: { isActive: true },
      select: { outstandingBalance: true },
    });

    const totalVendors = allVendors.length;
    const totalOutstanding = allVendors.reduce(
      (sum, v) => sum + Number(v.outstandingBalance || 0),
      0
    );

    // Current month purchases & payments
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthPurchases = await prisma.purchaseOrder.aggregate({
      where: { purchaseDate: { gte: startOfMonth } },
      _sum: { totalAmount: true },
    });

    const monthPayments = await prisma.vendorPayment.aggregate({
      where: { paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });

    return {
      success: true as const,
      vendors: vendors.map((v) => ({
        ...v,
        outstandingBalance: Number(v.outstandingBalance),
        createdAt: v.createdAt ? v.createdAt.toISOString() : null,
      })),
      kpis: {
        totalVendors,
        totalOutstanding,
        monthPurchases: Number(monthPurchases._sum.totalAmount || 0),
        monthPayments: Number(monthPayments._sum.amount || 0),
      },
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch vendors:", error);
    return { success: false as const, error: error.message || "Failed to fetch vendors" };
  }
}

export async function getVendorDetails(vendorId: string) {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        purchaseOrders: {
          orderBy: { purchaseDate: "desc" },
          include: {
            items: {
              include: {
                product: {
                  select: { name: true, skuCode: true },
                },
              },
            },
          },
        },
        vendorPayments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!vendor) {
      return { success: false as const, error: "Vendor not found" };
    }

    const settings = await prisma.shopSettings.findFirst();

    // Merge purchase orders and vendor payments into a unified ledger timeline
    const ledgerItems: Array<{
      id: string;
      date: Date;
      type: "PURCHASE_BILL" | "PAYMENT_OUT";
      referenceNumber: string;
      description: string;
      debitAmount: number; // Purchase increases balance
      creditAmount: number; // Payment decreases balance
      paymentMethod?: string | null;
      transactionRef?: string | null;
    }> = [];

    vendor.purchaseOrders.forEach((po) => {
      ledgerItems.push({
        id: po.id,
        date: new Date(po.purchaseDate),
        type: "PURCHASE_BILL",
        referenceNumber: po.poNumber,
        description: `Purchase Bill ${po.vendorBillNo ? `(Bill #${po.vendorBillNo})` : ""}`,
        debitAmount: Number(po.totalAmount),
        creditAmount: 0,
      });
    });

    vendor.vendorPayments.forEach((vp) => {
      ledgerItems.push({
        id: vp.id,
        date: new Date(vp.paidAt),
        type: "PAYMENT_OUT",
        referenceNumber: vp.transactionRef || "VOUCHER",
        description: `Payment via ${vp.paymentMethod}${vp.transactionRef ? ` (Ref: ${vp.transactionRef})` : ""}`,
        debitAmount: 0,
        creditAmount: Number(vp.amount),
        paymentMethod: vp.paymentMethod,
        transactionRef: vp.transactionRef,
      });
    });

    // Sort chronologically ascending to compute running balances
    ledgerItems.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = 0;
    const ledgerWithRunningBalance = ledgerItems.map((item) => {
      running = running + item.debitAmount - item.creditAmount;
      return {
        ...item,
        date: item.date.toISOString(),
        runningBalance: Number(running.toFixed(2)),
      };
    });

    // Reverse for UI display (newest first)
    ledgerWithRunningBalance.reverse();

    return {
      success: true as const,
      vendor: {
        ...vendor,
        outstandingBalance: Number(vendor.outstandingBalance),
        createdAt: vendor.createdAt ? vendor.createdAt.toISOString() : null,
        purchaseOrders: vendor.purchaseOrders.map((po) => ({
          ...po,
          totalAmount: Number(po.totalAmount),
          paidAmount: Number(po.paidAmount),
          purchaseDate: po.purchaseDate ? new Date(po.purchaseDate).toISOString() : null,
          items: po.items.map((it) => ({
            ...it,
            quantity: Number(it.quantity),
            unitCostPrice: Number(it.unitCostPrice),
            lineTotal: Number(it.lineTotal),
          })),
        })),
        vendorPayments: vendor.vendorPayments.map((vp) => ({
          ...vp,
          amount: Number(vp.amount),
          paidAt: vp.paidAt ? new Date(vp.paidAt).toISOString() : null,
        })),
      },
      ledger: ledgerWithRunningBalance,
      shopSettings: serializeShopSettings(settings),
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch vendor details:", error);
    return { success: false as const, error: error.message || "Failed to fetch vendor details" };
  }
}

// ----------------------------------------------------
// MUTATION ACTIONS
// ----------------------------------------------------

export async function createVendor(payload: VendorInput) {
  try {
    const validated = VendorSchema.parse(payload);

    const vendor = await prisma.vendor.create({
      data: {
        name: validated.name,
        contactPerson: validated.contactPerson || null,
        phone: validated.phone || null,
        address: validated.address || null,
        outstandingBalance: validated.outstandingBalance,
      },
    });

    safeRevalidatePath("/vendors");
    safeRevalidatePath("/purchases");
    return { success: true as const, vendor };
  } catch (error: any) {
    console.error("❌ Failed to create vendor:", error);
    return { success: false as const, error: error.message || "Failed to create vendor" };
  }
}

export async function updateVendor(id: string, payload: VendorInput) {
  try {
    const validated = VendorSchema.parse(payload);

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: validated.name,
        contactPerson: validated.contactPerson || null,
        phone: validated.phone || null,
        address: validated.address || null,
        outstandingBalance: validated.outstandingBalance,
      },
    });

    safeRevalidatePath("/vendors");
    safeRevalidatePath("/purchases");
    return { success: true as const, vendor };
  } catch (error: any) {
    console.error("❌ Failed to update vendor:", error);
    return { success: false as const, error: error.message || "Failed to update vendor" };
  }
}

export async function deleteVendor(id: string) {
  try {
    // Check if vendor has purchase orders
    const count = await prisma.purchaseOrder.count({
      where: { vendorId: id },
    });

    if (count > 0) {
      // Soft-delete by marking inactive
      await prisma.vendor.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      await prisma.vendor.delete({
        where: { id },
      });
    }

    safeRevalidatePath("/vendors");
    safeRevalidatePath("/purchases");
    return { success: true as const };
  } catch (error: any) {
    console.error("❌ Failed to delete vendor:", error);
    return { success: false as const, error: error.message || "Failed to delete vendor" };
  }
}

export async function recordVendorPayment(payload: VendorPaymentInput) {
  try {
    const validated = VendorPaymentSchema.parse(payload);

    const result = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({
        where: { id: validated.vendorId },
      });

      if (!vendor) throw new Error("Vendor not found");

      // 1. Create Payment Voucher
      const payment = await tx.vendorPayment.create({
        data: {
          vendorId: validated.vendorId,
          amount: validated.amount,
          paymentMethod: validated.paymentMethod,
          transactionRef: validated.transactionRef || null,
          paidAt: validated.paidAt ? new Date(validated.paidAt) : new Date(),
        },
      });

      // 2. Decrement Outstanding Balance
      const newBalance = Math.max(0, Number(vendor.outstandingBalance) - validated.amount);
      await tx.vendor.update({
        where: { id: validated.vendorId },
        data: {
          outstandingBalance: newBalance,
        },
      });

      return { payment, newBalance };
    });

    safeRevalidatePath("/vendors");
    safeRevalidatePath("/purchases");
    return { success: true as const, ...result };
  } catch (error: any) {
    console.error("❌ Failed to record vendor payment:", error);
    return { success: false as const, error: error.message || "Failed to record vendor payment" };
  }
}
