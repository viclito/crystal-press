"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface DenominationBreakdown {
  "500": number;
  "200": number;
  "100": number;
  "50": number;
  "20": number;
  "10": number;
  "5": number;
  "2": number;
  "1": number;
  [key: string]: number;
}

export interface ShiftLiveMetrics {
  openingFloat: number;
  posCashSales: number;
  posUpiSales: number;
  posCardSales: number;
  posUdhaarSales: number;
  totalSales: number;
  jobAdvancesCash: number;
  customerUdhaarCash: number;
  pettyCashExpenses: number;
  expectedCashInDrawer: number;
  invoicesCount: number;
  jobsCount: number;
  expensesCount: number;
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

/**
 * Calculates live sales and cash metrics for a given time window
 */
async function calculateShiftMetrics(openedAt: Date, closedAt?: Date): Promise<ShiftLiveMetrics> {
  const timeFilter = {
    gte: openedAt,
    ...(closedAt ? { lte: closedAt } : {}),
  };

  // 1. Invoices (POS sales)
  const invoices = await prisma.invoice.findMany({
    where: {
      createdAt: timeFilter,
      status: "COMPLETED",
    },
    select: {
      netTotal: true,
      paidAmount: true,
      balanceDue: true,
      paymentMethod: true,
    },
  });

  let posCashSales = 0;
  let posUpiSales = 0;
  let posCardSales = 0;
  let posUdhaarSales = 0;
  let totalSales = 0;

  for (const inv of invoices) {
    const net = Number(inv.netTotal) || 0;
    const paid = Number(inv.paidAmount) || 0;
    const bal = Number(inv.balanceDue) || 0;
    totalSales += net;

    if (inv.paymentMethod === "CASH") {
      posCashSales += paid > 0 ? paid : net;
    } else if (inv.paymentMethod === "UPI") {
      posUpiSales += paid > 0 ? paid : net;
    } else if (inv.paymentMethod === "CARD") {
      posCardSales += paid > 0 ? paid : net;
    } else if (inv.paymentMethod === "CREDIT_UDHAAR") {
      posUdhaarSales += bal > 0 ? bal : net;
    } else if (inv.paymentMethod === "SPLIT") {
      posCashSales += paid > 0 ? paid : net;
    }
  }

  // 2. Job Order Cash Advances received in this window
  const jobs = await prisma.jobOrder.findMany({
    where: {
      createdAt: timeFilter,
    },
    select: {
      advancePaid: true,
    },
  });

  let jobAdvancesCash = 0;
  for (const j of jobs) {
    jobAdvancesCash += Number(j.advancePaid) || 0;
  }

  // 3. Customer Udhaar Payments (CustomerPayment where paymentMethod = CASH)
  const customerPayments = await prisma.customerPayment.findMany({
    where: {
      receivedAt: timeFilter,
      paymentMethod: "CASH",
    },
    select: {
      amount: true,
    },
  });

  let customerUdhaarCash = 0;
  for (const cp of customerPayments) {
    customerUdhaarCash += Number(cp.amount) || 0;
  }

  // 4. Petty Cash Outflows (Expense where paymentMethod = CASH)
  const expenses = await prisma.expense.findMany({
    where: {
      expenseDate: timeFilter,
      paymentMethod: "CASH",
    },
    select: {
      amount: true,
    },
  });

  let pettyCashExpenses = 0;
  for (const exp of expenses) {
    pettyCashExpenses += Number(exp.amount) || 0;
  }

  // Total Expected Cash = Opening Float (added in caller) + POS Cash + Job Advances Cash + Customer Payments Cash - Petty Cash Expenses
  const netCashInflow = posCashSales + jobAdvancesCash + customerUdhaarCash - pettyCashExpenses;

  return {
    openingFloat: 0, // Assigned by caller
    posCashSales,
    posUpiSales,
    posCardSales,
    posUdhaarSales,
    totalSales,
    jobAdvancesCash,
    customerUdhaarCash,
    pettyCashExpenses,
    expectedCashInDrawer: netCashInflow,
    invoicesCount: invoices.length,
    jobsCount: jobs.length,
    expensesCount: expenses.length,
  };
}

/**
 * Gets the active open shift or null
 */
export async function getActiveShift(): Promise<{
  success: boolean;
  hasActiveShift: boolean;
  shift: any | null;
  liveMetrics: ShiftLiveMetrics | null;
  error?: string;
}> {
  try {
    const shift = await prisma.cashShift.findFirst({
      where: { status: "OPEN" },
      include: {
        openedBy: {
          select: { id: true, fullName: true, username: true, role: true },
        },
      },
      orderBy: { openedAt: "desc" },
    });

    if (!shift) {
      return { success: true, hasActiveShift: false, shift: null, liveMetrics: null };
    }

    const openingFloat = Number(shift.openingFloat) || 0;
    const metrics = await calculateShiftMetrics(shift.openedAt);
    metrics.openingFloat = openingFloat;
    metrics.expectedCashInDrawer += openingFloat;

    return {
      success: true,
      hasActiveShift: true,
      shift: {
        ...shift,
        openingFloat,
        expectedCash: shift.expectedCash ? Number(shift.expectedCash) : null,
        actualCash: shift.actualCash ? Number(shift.actualCash) : null,
        discrepancy: shift.discrepancy ? Number(shift.discrepancy) : null,
        totalSales: Number(shift.totalSales || 0),
        cashSales: Number(shift.cashSales || 0),
        upiSales: Number(shift.upiSales || 0),
        cardSales: Number(shift.cardSales || 0),
        udhaarSales: Number(shift.udhaarSales || 0),
        pettyCashExpenses: Number(shift.pettyCashExpenses || 0),
        closingFloatKept: shift.closingFloatKept ? Number(shift.closingFloatKept) : null,
        cashBanked: shift.cashBanked ? Number(shift.cashBanked) : null,
        openedAt: shift.openedAt ? shift.openedAt.toISOString() : null,
        closedAt: shift.closedAt ? shift.closedAt.toISOString() : null,
        createdAt: shift.createdAt ? shift.createdAt.toISOString() : null,
        updatedAt: shift.updatedAt ? shift.updatedAt.toISOString() : null,
      },
      liveMetrics: metrics,
    };
  } catch (error: any) {
    console.error("getActiveShift error:", error);
    return {
      success: false,
      hasActiveShift: false,
      shift: null,
      liveMetrics: null,
      error: error?.message || "Failed to fetch active shift",
    };
  }
}

/**
 * Opens a new shift with an opening float
 */
export async function openNewShift(data: {
  openingFloat: number;
  openedById?: string;
  notes?: string;
}) {
  try {
    // Check if there is already an active open shift
    const existing = await prisma.cashShift.findFirst({
      where: { status: "OPEN" },
    });

    if (existing) {
      return {
        success: false,
        error: `Shift #${existing.shiftNumber} is already open. Please reconcile and close it before opening a new shift.`,
      };
    }

    let userId = data.openedById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.cashShift.count();
    const shiftNumber = `SH-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const shift = await prisma.cashShift.create({
      data: {
        shiftNumber,
        openedById: userId,
        status: "OPEN",
        openingFloat: data.openingFloat || 0,
        handoverNotes: data.notes || null,
      },
      include: {
        openedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    safeRevalidate("/shifts");
    safeRevalidate("/pos");
    return { success: true, shift };
  } catch (error: any) {
    console.error("openNewShift error:", error);
    return { success: false, error: error?.message || "Failed to open shift" };
  }
}

/**
 * Closes an active shift with physical cash count and discrepancy verification
 */
export async function closeActiveShift(data: {
  shiftId: string;
  actualCash: number;
  denominations: Record<string, number>;
  handoverNotes?: string;
  nextCashierName?: string;
  closingFloatKept?: number;
  cashBanked?: number;
  closedById?: string;
}) {
  try {
    const shift = await prisma.cashShift.findUnique({
      where: { id: data.shiftId },
    });

    if (!shift || shift.status !== "OPEN") {
      return { success: false, error: "Active shift not found or already closed." };
    }

    let userId = data.closedById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || shift.openedById;
    }

    const closedAt = new Date();
    const metrics = await calculateShiftMetrics(shift.openedAt, closedAt);
    const openingFloat = Number(shift.openingFloat) || 0;
    const expectedCash = openingFloat + metrics.expectedCashInDrawer;
    const actualCash = Number(data.actualCash) || 0;
    const discrepancy = actualCash - expectedCash;

    const updated = await prisma.cashShift.update({
      where: { id: shift.id },
      data: {
        closedById: userId,
        closedAt,
        status: "CLOSED",
        expectedCash,
        actualCash,
        discrepancy,
        totalSales: metrics.totalSales,
        cashSales: metrics.posCashSales + metrics.jobAdvancesCash + metrics.customerUdhaarCash,
        upiSales: metrics.posUpiSales,
        cardSales: metrics.posCardSales,
        udhaarSales: metrics.posUdhaarSales,
        pettyCashExpenses: metrics.pettyCashExpenses,
        denominations: JSON.stringify(data.denominations),
        handoverNotes: data.handoverNotes || null,
        nextCashierName: data.nextCashierName || null,
        closingFloatKept: data.closingFloatKept || 0,
        cashBanked: data.cashBanked || 0,
      },
      include: {
        openedBy: { select: { fullName: true, username: true } },
        closedBy: { select: { fullName: true, username: true } },
      },
    });

    safeRevalidate("/shifts");
    safeRevalidate("/pos");
    safeRevalidate("/reports");
    return { success: true, shift: updated, discrepancy };
  } catch (error: any) {
    console.error("closeActiveShift error:", error);
    return { success: false, error: error?.message || "Failed to close shift" };
  }
}

/**
 * Fetches shift history with overall metrics
 */
export async function getShiftHistory(filters?: { limit?: number; page?: number }) {
  try {
    const limit = filters?.limit || 50;

    const [shifts, totalCount, activeShift] = await Promise.all([
      prisma.cashShift.findMany({
        where: { status: "CLOSED" },
        include: {
          openedBy: { select: { id: true, fullName: true, username: true } },
          closedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { closedAt: "desc" },
        take: limit,
      }),
      prisma.cashShift.count({ where: { status: "CLOSED" } }),
      prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        include: { openedBy: { select: { id: true, fullName: true, username: true } } },
      }),
    ]);

    let totalReconciledCash = 0;
    let totalDiscrepanciesCount = 0;
    let netDiscrepancyAmount = 0;

    for (const s of shifts) {
      totalReconciledCash += Number(s.actualCash) || 0;
      const disc = Number(s.discrepancy) || 0;
      if (Math.abs(disc) > 0.01) {
        totalDiscrepanciesCount++;
        netDiscrepancyAmount += disc;
      }
    }

    return {
      success: true,
      shifts: shifts.map((s) => ({
        ...s,
        openingFloat: Number(s.openingFloat),
        expectedCash: s.expectedCash ? Number(s.expectedCash) : 0,
        actualCash: s.actualCash ? Number(s.actualCash) : 0,
        discrepancy: s.discrepancy ? Number(s.discrepancy) : 0,
        totalSales: Number(s.totalSales),
        cashSales: Number(s.cashSales),
        upiSales: Number(s.upiSales),
        cardSales: Number(s.cardSales),
        udhaarSales: Number(s.udhaarSales),
        pettyCashExpenses: Number(s.pettyCashExpenses),
        closingFloatKept: s.closingFloatKept ? Number(s.closingFloatKept) : 0,
        cashBanked: s.cashBanked ? Number(s.cashBanked) : 0,
        denominations: s.denominations ? JSON.parse(s.denominations) : {},
        openedAt: s.openedAt ? s.openedAt.toISOString() : null,
        closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        createdAt: s.createdAt ? s.createdAt.toISOString() : null,
        updatedAt: s.updatedAt ? s.updatedAt.toISOString() : null,
        openedBy: s.openedBy
          ? {
              id: s.openedBy.id,
              fullName: s.openedBy.fullName,
              username: s.openedBy.username,
            }
          : null,
        closedBy: s.closedBy
          ? {
              id: s.closedBy.id,
              fullName: s.closedBy.fullName,
              username: s.closedBy.username,
            }
          : null,
      })),
      totalCount,
      activeShift: activeShift
        ? {
            ...activeShift,
            openingFloat: Number(activeShift.openingFloat),
            openedAt: activeShift.openedAt ? activeShift.openedAt.toISOString() : null,
            closedAt: activeShift.closedAt ? activeShift.closedAt.toISOString() : null,
            createdAt: activeShift.createdAt ? activeShift.createdAt.toISOString() : null,
            updatedAt: activeShift.updatedAt ? activeShift.updatedAt.toISOString() : null,
          }
        : null,
      metrics: {
        closedShiftsCount: totalCount,
        totalReconciledCash,
        totalDiscrepanciesCount,
        netDiscrepancyAmount,
      },
    };
  } catch (error: any) {
    console.error("getShiftHistory error:", error);
    return {
      success: false,
      shifts: [],
      totalCount: 0,
      activeShift: null,
      metrics: {
        closedShiftsCount: 0,
        totalReconciledCash: 0,
        totalDiscrepanciesCount: 0,
        netDiscrepancyAmount: 0,
      },
      error: error?.message || "Failed to load shift history",
    };
  }
}

/**
 * Returns structured payload for thermal shift handover docket printing
 */
export async function getShiftDocketData(shiftId: string) {
  try {
    const [shift, settings] = await Promise.all([
      prisma.cashShift.findUnique({
        where: { id: shiftId },
        include: {
          openedBy: { select: { fullName: true, username: true } },
          closedBy: { select: { fullName: true, username: true } },
        },
      }),
      prisma.shopSettings.findFirst(),
    ]);

    if (!shift) {
      return { success: false, error: "Shift record not found." };
    }

    const denominations = shift.denominations ? JSON.parse(shift.denominations) : {};

    return {
      success: true,
      docket: {
        shopName: settings?.shopName || "Crystal Press",
        shopAddress: settings?.addressLine1 || "Main Commercial Road",
        shopPhone: settings?.phone1 || "+91 98765 43210",
        shiftNumber: shift.shiftNumber,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        openedBy: shift.openedBy.fullName || shift.openedBy.username,
        closedBy: shift.closedBy?.fullName || shift.closedBy?.username || "Staff",
        nextCashierName: shift.nextCashierName || "Not Specified",
        openingFloat: Number(shift.openingFloat),
        expectedCash: Number(shift.expectedCash),
        actualCash: Number(shift.actualCash),
        discrepancy: Number(shift.discrepancy),
        totalSales: Number(shift.totalSales),
        cashSales: Number(shift.cashSales),
        upiSales: Number(shift.upiSales),
        cardSales: Number(shift.cardSales),
        udhaarSales: Number(shift.udhaarSales),
        pettyCashExpenses: Number(shift.pettyCashExpenses),
        closingFloatKept: Number(shift.closingFloatKept),
        cashBanked: Number(shift.cashBanked),
        denominations,
        handoverNotes: shift.handoverNotes,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to prepare docket data" };
  }
}
