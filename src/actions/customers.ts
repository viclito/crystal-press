"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializeShopSettings } from "@/lib/utils";

const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  creditLimit: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export async function upsertCustomer(payload: z.infer<typeof CustomerSchema>) {
  try {
    const validated = CustomerSchema.parse(payload);
    const trimmedName = validated.name.trim();
    const rawPhone = validated.phone?.trim() || null;
    const cleanDigits = rawPhone ? rawPhone.replace(/\D/g, "") : null;
    // Standardize 10-digit Indian numbers (strip leading 91 or 0)
    const phoneNormalized =
      cleanDigits && cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    // 1. Prevent duplicate phone numbers across customers
    if (phoneNormalized && phoneNormalized.length >= 7) {
      const existingByPhone = await prisma.customer.findFirst({
        where: {
          id: validated.id ? { not: validated.id } : undefined,
          OR: [
            { phone: rawPhone! },
            { phone: phoneNormalized },
            { phone: { endsWith: phoneNormalized } },
          ],
        },
      });

      if (existingByPhone) {
        return {
          success: false,
          error: `Customer "${existingByPhone.name}" is already registered with phone "${rawPhone || phoneNormalized}". Duplicate customer creation blocked.`,
          existingCustomer: {
            id: existingByPhone.id,
            name: existingByPhone.name,
            phone: existingByPhone.phone || "",
            currentBalance: Number(existingByPhone.currentBalance || 0),
            walletBalance: Number(existingByPhone.walletBalance || 0),
            loyaltyPoints: Number(existingByPhone.loyaltyPoints || 0),
          },
        };
      }
    }

    // 2. Prevent duplicate exact names if phone is empty
    if (!phoneNormalized) {
      const existingByName = await prisma.customer.findFirst({
        where: {
          id: validated.id ? { not: validated.id } : undefined,
          name: { equals: trimmedName, mode: "insensitive" },
        },
      });

      if (existingByName) {
        return {
          success: false,
          error: `A customer named "${existingByName.name}" is already registered${existingByName.phone ? ` with phone ${existingByName.phone}` : ""}. Duplicate customer creation blocked.`,
          existingCustomer: {
            id: existingByName.id,
            name: existingByName.name,
            phone: existingByName.phone || "",
            currentBalance: Number(existingByName.currentBalance || 0),
            walletBalance: Number(existingByName.walletBalance || 0),
            loyaltyPoints: Number(existingByName.loyaltyPoints || 0),
          },
        };
      }
    }

    const finalPhone = phoneNormalized || rawPhone;

    if (validated.id) {
      const updated = await prisma.customer.update({
        where: { id: validated.id },
        data: {
          name: trimmedName,
          phone: finalPhone,
          email: validated.email || null,
          address: validated.address || null,
          creditLimit: validated.creditLimit,
          notes: validated.notes || null,
        },
      });
      revalidatePath("/customers");
      revalidatePath("/pos");
      return {
        success: true,
        customer: {
          ...updated,
          currentBalance: Number(updated.currentBalance || 0),
          creditLimit: Number(updated.creditLimit || 0),
          walletBalance: Number(updated.walletBalance || 0),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    } else {
      const created = await prisma.customer.create({
        data: {
          name: trimmedName,
          phone: finalPhone,
          email: validated.email || null,
          address: validated.address || null,
          creditLimit: validated.creditLimit,
          notes: validated.notes || null,
        },
      });
      revalidatePath("/customers");
      revalidatePath("/pos");
      return {
        success: true,
        customer: {
          ...created,
          currentBalance: Number(created.currentBalance || 0),
          creditLimit: Number(created.creditLimit || 0),
          walletBalance: Number(created.walletBalance || 0),
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordCustomerPayment(payload: {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
}) {
  try {
    const { customerId, amount, paymentMethod, transactionRef, notes } = payload;
    if (amount <= 0) throw new Error("Payment amount must be greater than zero");

    const result = await prisma.$transaction(async (tx) => {
      // 1. Record payment record
      const payment = await tx.customerPayment.create({
        data: {
          customerId,
          amount,
          paymentMethod,
          transactionRef: transactionRef || null,
          notes: notes || null,
        },
      });

      // 2. Reduce Customer balance
      const customer = await tx.customer.update({
        where: { id: customerId },
        data: {
          currentBalance: { decrement: amount },
        },
      });

      // 3. Write Ledger Entry
      await tx.customerLedger.create({
        data: {
          customerId,
          referenceType: "PAYMENT",
          referenceId: payment.id,
          debitAmount: 0,
          creditAmount: amount,
          runningBalance: customer.currentBalance,
          notes: notes || `Payment received via ${paymentMethod}`,
        },
      });

      return {
        success: true as const,
        paymentId: payment.id,
        newBalance: Number(customer.currentBalance),
      };
    });

    revalidatePath("/customers");
    revalidatePath("/pos");
    return result;
  } catch (error: any) {
    return { success: false as const, error: error.message || "Payment failed" };
  }
}

export async function getCustomerLedger(customerId: string) {
  try {
    const [entries, settings] = await Promise.all([
      prisma.customerLedger.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.shopSettings.findFirst(),
    ]);

    return {
      success: true as const,
      entries: entries.map((e) => ({
        id: e.id,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        debitAmount: Number(e.debitAmount),
        creditAmount: Number(e.creditAmount),
        runningBalance: Number(e.runningBalance),
        notes: e.notes,
        createdAt: e.createdAt.toISOString(),
      })),
      shopSettings: settings,
    };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function getCustomerStatementDetails(customerId: string) {
  try {
    const [customer, ledgerEntries, settings] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              invoiceNumber: true,
              netTotal: true,
              paidAmount: true,
              balanceDue: true,
              createdAt: true,
            },
          },
          payments: {
            orderBy: { receivedAt: "desc" },
            take: 20,
            select: {
              id: true,
              amount: true,
              paymentMethod: true,
              transactionRef: true,
              receivedAt: true,
            },
          },
        },
      }),
      prisma.customerLedger.findMany({
        where: { customerId },
        orderBy: { createdAt: "asc" }, // Ascending for chronological statement calculation
      }),
      prisma.shopSettings.findFirst(),
    ]);

    if (!customer) {
      return { success: false as const, error: "Customer not found" };
    }

    let running = 0;
    const ledger = ledgerEntries.map((e) => {
      running = running + Number(e.debitAmount) - Number(e.creditAmount);
      return {
        id: e.id,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        debitAmount: Number(e.debitAmount),
        creditAmount: Number(e.creditAmount),
        runningBalance: Number(running.toFixed(2)),
        notes: e.notes,
        createdAt: e.createdAt.toISOString(),
      };
    });

    const totalDebit = ledger.reduce((sum, it) => sum + it.debitAmount, 0);
    const totalCredit = ledger.reduce((sum, it) => sum + it.creditAmount, 0);

    return {
      success: true as const,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        currentBalance: Number(customer.currentBalance),
        creditLimit: Number(customer.creditLimit),
        notes: customer.notes,
      },
      ledger,
      totals: {
        totalDebit,
        totalCredit,
        balanceDue: Number(customer.currentBalance),
      },
      shopSettings: serializeShopSettings(settings),
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch customer statement details:", error);
    return { success: false as const, error: error.message || "Failed to load statement" };
  }
}

export async function getCustomersWithAging() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const [customers, monthPayments] = await Promise.all([
      prisma.customer.findMany({
        where: { isActive: true },
        orderBy: { currentBalance: "desc" },
        include: {
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
      prisma.customerPayment.aggregate({
        where: { receivedAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    const formatted = customers.map((c) => {
      const balance = Number(c.currentBalance);
      const limit = Number(c.creditLimit);
      const lastInvoiceDate = c.invoices[0]?.createdAt ? new Date(c.invoices[0].createdAt) : null;
      const isOverdue30 = balance > 0 && lastInvoiceDate ? lastInvoiceDate < thirtyDaysAgo : false;
      const isLimitBreached = limit > 0 && balance > limit;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        currentBalance: balance,
        creditLimit: limit,
        walletBalance: Number(c.walletBalance || 0),
        loyaltyPoints: c.loyaltyPoints || 0,
        notes: c.notes,
        lastInvoiceDate: lastInvoiceDate ? lastInvoiceDate.toISOString() : null,
        isOverdue30,
        isLimitBreached,
        createdAt: c.createdAt.toISOString(),
      };
    });

    const totalReceivables = formatted.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const overdueList = formatted.filter((c) => c.isOverdue30);
    const overdue30Amount = overdueList.reduce((sum, c) => sum + c.currentBalance, 0);
    const limitBreachedCount = formatted.filter((c) => c.isLimitBreached).length;
    const collectionsThisMonth = Number(monthPayments._sum.amount || 0);

    return {
      success: true as const,
      customers: formatted,
      metrics: {
        totalCustomers: formatted.length,
        totalReceivables,
        overdue30Amount,
        overdueCount: overdueList.length,
        limitBreachedCount,
        collectionsThisMonth,
      },
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch customers with aging:", error);
    return { success: false as const, error: error.message || "Failed to load customers" };
  }
}
