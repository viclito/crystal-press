import React from "react";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardClient } from "./DashboardClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { serializeShopSettings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userRole = ((session?.user as any)?.role as string) || "ADMIN";

  // Cashiers strictly cannot access Dashboard
  if (userRole === "CASHIER") {
    redirect("/pos");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  let todaySalesTotal = 0;
  let todayInvoicesCount = 0;
  let todayCashTotal = 0;
  let todayUpiTotal = 0;
  let todayCreditTotal = 0;
  let monthSalesTotal = 0;

  let todayExpensesTotal = 0;
  let todayCashExpenses = 0;

  let totalUdhaar = 0;
  let overdueAccountsCount = 0;

  let totalProductsCount = 0;
  let totalCustomersCount = 0;
  let pendingChallansCount = 0;
  let openQuotationsCount = 0;

  let serializedRecentInvoices: any[] = [];
  let serializedActiveJobs: any[] = [];
  let serializedLowStock: any[] = [];
  let serializedTopDebtors: any[] = [];
  let shopSettings: any = null;

  let analytics7D: Array<{ label: string; fullDate: string; total: number; count: number }> = [];
  let analytics30D: Array<{ label: string; fullDate: string; total: number; count: number }> = [];
  let analytics6M: Array<{ label: string; fullDate: string; total: number; count: number }> = [];

  try {
    const [
      allHistoricalInvoices,
      recentInvoices,
      activeJobs,
      lowStockProducts,
      prodCount,
      custCount,
      settings,
      todayExpenses,
      pendingChallans,
      openQuotes,
      debtorCustomers,
    ] = await Promise.all([
      // 1. Invoices for Analytics & Historical KPIs
      prisma.invoice.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        orderBy: { createdAt: "asc" },
        select: {
          netTotal: true,
          paidAmount: true,
          paymentMethod: true,
          createdAt: true,
        },
      }),
      // 2. Recent Invoices
      prisma.invoice.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { items: true, customer: true },
      }),
      // 3. Active Job Orders
      prisma.jobOrder.findMany({
        where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      // 4. Low Stock Products
      prisma.product.findMany({
        where: {
          isActive: true,
          currentStock: { lte: 15 },
        },
        take: 6,
        include: { unit: true },
      }),
      // 5. Counts
      prisma.product.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { isActive: true } }),
      // 6. Shop Settings
      prisma.shopSettings.findFirst(),
      // 7. Today's Expenses
      prisma.expense.findMany({
        where: { expenseDate: { gte: today } },
        select: { amount: true, paymentMethod: true },
      }),
      // 8. Pending Challans
      prisma.deliveryChallan.count({
        where: { status: { in: ["PREPARED", "IN_TRANSIT"] } },
      }),
      // 9. Open Quotations
      prisma.quotation.count({
        where: { status: { in: ["DRAFT", "SENT"] } },
      }),
      // 10. Debtors
      prisma.customer.findMany({
        where: { isActive: true, currentBalance: { gt: 0 } },
        orderBy: { currentBalance: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
          currentBalance: true,
          creditLimit: true,
        },
      }),
    ]);

    // Today's Sales Metrics
    const todayInvoices = allHistoricalInvoices.filter((inv) => inv.createdAt >= today);
    todaySalesTotal = todayInvoices.reduce((sum, inv) => sum + Number(inv.netTotal), 0);
    todayInvoicesCount = todayInvoices.length;
    todayCashTotal = todayInvoices
      .filter((inv) => inv.paymentMethod === "CASH")
      .reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
    todayUpiTotal = todayInvoices
      .filter((inv) => inv.paymentMethod === "UPI")
      .reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
    todayCreditTotal = todayInvoices
      .filter((inv) => inv.paymentMethod === "CREDIT_UDHAAR")
      .reduce((sum, inv) => sum + Number(inv.netTotal), 0);

    // Month's Sales
    const monthInvoices = allHistoricalInvoices.filter((inv) => inv.createdAt >= startOfMonth);
    monthSalesTotal = monthInvoices.reduce((sum, inv) => sum + Number(inv.netTotal), 0);

    // Expenses Metrics
    todayExpensesTotal = todayExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    todayCashExpenses = todayExpenses
      .filter((exp) => exp.paymentMethod === "CASH")
      .reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Total Udhaar (Receivables)
    totalUdhaar = debtorCustomers.reduce((sum, c) => sum + Number(c.currentBalance), 0);
    overdueAccountsCount = debtorCustomers.length;

    totalProductsCount = prodCount;
    totalCustomersCount = custCount;
    pendingChallansCount = pendingChallans;
    openQuotationsCount = openQuotes;

    // Build 7 Days Analytics
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayInvoices = allHistoricalInvoices.filter(
        (inv) => inv.createdAt >= d && inv.createdAt < nextD
      );

      const total = dayInvoices.reduce((sum, inv) => sum + Number(inv.netTotal), 0);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const fullDate = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

      analytics7D.push({ label, fullDate, total, count: dayInvoices.length });
    }

    // Build 30 Days Analytics
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayInvoices = allHistoricalInvoices.filter(
        (inv) => inv.createdAt >= d && inv.createdAt < nextD
      );

      const total = dayInvoices.reduce((sum, inv) => sum + Number(inv.netTotal), 0);
      const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const fullDate = d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });

      analytics30D.push({ label, fullDate, total, count: dayInvoices.length });
    }

    // Build 6 Months Analytics
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const startM = new Date(year, month, 1);
      const endM = new Date(year, month + 1, 1);

      const mInvoices = allHistoricalInvoices.filter(
        (inv) => inv.createdAt >= startM && inv.createdAt < endM
      );

      const total = mInvoices.reduce((sum, inv) => sum + Number(inv.netTotal), 0);
      const label = startM.toLocaleDateString("en-IN", { month: "short" });
      const fullDate = startM.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

      analytics6M.push({ label, fullDate, total, count: mInvoices.length });
    }

    serializedRecentInvoices = recentInvoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      customerName: i.customerName,
      customerPhone: i.customerPhone,
      netTotal: Number(i.netTotal),
      paidAmount: Number(i.paidAmount),
      balanceDue: Number(i.balanceDue),
      paymentMethod: i.paymentMethod,
      status: i.status,
      itemCount: i.items.length,
      createdAt: i.createdAt.toISOString(),
    }));

    serializedActiveJobs = activeJobs.map((j) => ({
      id: j.id,
      jobOrderNumber: j.jobOrderNumber,
      customerName: j.customerName,
      jobType: j.jobType,
      quantity: Number(j.quantity),
      unitName: j.unitName,
      status: j.status,
      totalAmount: Number(j.totalAmount),
      balanceDue: Number(j.balanceDue),
      createdAt: j.createdAt.toISOString(),
    }));

    serializedLowStock = lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      skuCode: p.skuCode,
      currentStock: Number(p.currentStock),
      minStockAlert: Number(p.minStockAlert),
      unitCode: p.unit?.code || "pcs",
    }));

    serializedTopDebtors = debtorCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      currentBalance: Number(c.currentBalance),
      creditLimit: Number(c.creditLimit),
    }));

    shopSettings = serializeShopSettings(settings);
  } catch (error) {
    console.warn("⚠️ Database query error on dashboard, using fallbacks:", error);
  }

  // Cash Drawer Balance = Cash Sales - Cash Expenses
  const cashDrawerBalance = Math.max(0, todayCashTotal - todayCashExpenses);

  return (
    <DashboardShell title="Dashboard Overview">
      <DashboardClient
        userRole={userRole}
        todaySalesTotal={todaySalesTotal}
        todayInvoicesCount={todayInvoicesCount}
        todayCashTotal={todayCashTotal}
        todayUpiTotal={todayUpiTotal}
        todayCreditTotal={todayCreditTotal}
        todayExpensesTotal={todayExpensesTotal}
        cashDrawerBalance={cashDrawerBalance}
        monthSalesTotal={monthSalesTotal}
        totalUdhaar={totalUdhaar}
        overdueAccountsCount={overdueAccountsCount}
        totalProductsCount={totalProductsCount}
        totalCustomersCount={totalCustomersCount}
        pendingChallansCount={pendingChallansCount}
        openQuotationsCount={openQuotationsCount}
        recentInvoices={serializedRecentInvoices}
        activeJobs={serializedActiveJobs}
        lowStockItems={serializedLowStock}
        topDebtors={serializedTopDebtors}
        shopSettings={shopSettings}
        analytics={{
          last7Days: analytics7D,
          last30Days: analytics30D,
          last6Months: analytics6M,
        }}
      />
    </DashboardShell>
  );
}
