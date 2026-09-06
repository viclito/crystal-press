"use server";

import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";

export interface FilteredReportData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalRevenue: number;
    totalCostOfGoods: number;
    grossProfit: number;
    grossProfitMarginPct: number;
    totalExpenses: number;
    netOperatingProfit: number;
    totalInvoicesCount: number;
    totalCustomJobsCount: number;
    totalTaxCollected: number;
    totalDiscounts: number;
  };
  expenseBreakdown: {
    total: number;
    cashPettyTotal: number;
    categories: Array<{ name: string; color: string; amount: number; count: number }>;
  };
  paymentBreakdown: {
    cash: number;
    upi: number;
    card: number;
    udhaar: number;
    split: number;
  };
  gstSlabs: Array<{
    slabRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    totalTax: number;
    itemCount: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    skuCode: string;
    quantitySold: number;
    totalRevenue: number;
    totalProfit: number;
  }>;
  topJobTypes: Array<{
    jobType: string;
    count: number;
    totalAmount: number;
  }>;
  dailyTimeline: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    invoicesCount: number;
  }>;
  invoicesList: Array<{
    id: string;
    invoiceNumber: string;
    invoiceType: string;
    customerName: string | null;
    customerPhone: string | null;
    paymentMethod: PaymentMethod;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    netTotal: number;
    createdAt: string;
  }>;
}

export async function getFilteredReportData(
  startDateStr: string,
  endDateStr: string
): Promise<{ success: boolean; data?: FilteredReportData; error?: string }> {
  try {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    const [invoices, invoiceItems, jobOrders, customerPayments, stockAdjustments, expenses] =
      await Promise.all([
        prisma.invoice.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
            status: { not: "CANCELLED" },
          },
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.invoiceItem.findMany({
          where: {
            invoice: {
              createdAt: {
                gte: start,
                lte: end,
              },
              status: { not: "CANCELLED" },
            },
          },
          include: {
            product: true,
            invoice: true,
          },
        }),
        prisma.jobOrder.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        }),
        prisma.customerPayment.findMany({
          where: {
            receivedAt: {
              gte: start,
              lte: end,
            },
          },
        }),
        prisma.stockAdjustment.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          include: { product: true },
        }),
        prisma.expense.findMany({
          where: {
            expenseDate: {
              gte: start,
              lte: end,
            },
          },
          include: { category: true },
        }),
      ]);

    // 1. Core Financial Metrics
    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let totalDiscounts = 0;
    let totalCostOfGoods = 0;

    const paymentBreakdown = {
      cash: 0,
      upi: 0,
      card: 0,
      udhaar: 0,
      split: 0,
    };

    // Timeline Aggregator by Date string (YYYY-MM-DD)
    const timelineMap: Record<
      string,
      { revenue: number; cost: number; profit: number; invoicesCount: number }
    > = {};

    invoices.forEach((inv) => {
      const net = Number(inv.netTotal) || 0;
      const tax = Number(inv.taxAmount) || 0;
      const disc = Number(inv.discountAmount) || 0;

      totalRevenue += net;
      totalTaxCollected += tax;
      totalDiscounts += disc;

      // Payment Breakdown
      if (inv.paymentMethod === "CASH") paymentBreakdown.cash += net;
      else if (inv.paymentMethod === "UPI") paymentBreakdown.upi += net;
      else if (inv.paymentMethod === "CARD") paymentBreakdown.card += net;
      else if (inv.paymentMethod === "CREDIT_UDHAAR") paymentBreakdown.udhaar += net;
      else if (inv.paymentMethod === "SPLIT") paymentBreakdown.split += net;

      // Timeline Date
      const dateKey = inv.createdAt.toISOString().split("T")[0];
      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = { revenue: 0, cost: 0, profit: 0, invoicesCount: 0 };
      }
      timelineMap[dateKey].revenue += net;
      timelineMap[dateKey].invoicesCount += 1;
    });

    // 2. GST Slabs & Item Profitability
    const gstSlabMap: Record<
      number,
      { taxableValue: number; cgst: number; sgst: number; totalTax: number; itemCount: number }
    > = {
      0: { taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, itemCount: 0 },
      5: { taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, itemCount: 0 },
      12: { taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, itemCount: 0 },
      18: { taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, itemCount: 0 },
      28: { taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, itemCount: 0 },
    };

    const productSalesMap: Record<
      string,
      {
        id: string;
        name: string;
        skuCode: string;
        quantitySold: number;
        totalRevenue: number;
        totalProfit: number;
      }
    > = {};

    invoiceItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCostPrice) || 0;
      const unitSelling = Number(item.unitSalePrice) || 0;
      const taxRate = Number(item.taxPercent) || 0;
      const itemLineTotal = Number(item.lineTotal) || qty * unitSelling;
      const itemCostTotal = qty * unitCost;

      totalCostOfGoods += itemCostTotal;

      // Add to timeline cost
      const dateKey = item.invoice.createdAt.toISOString().split("T")[0];
      if (timelineMap[dateKey]) {
        timelineMap[dateKey].cost += itemCostTotal;
        timelineMap[dateKey].profit =
          timelineMap[dateKey].revenue - timelineMap[dateKey].cost;
      }

      // GST Slab assignment
      const roundedSlab = [0, 5, 12, 18, 28].reduce((prev, curr) =>
        Math.abs(curr - taxRate) < Math.abs(prev - taxRate) ? curr : prev
      );

      // Tax math (Reverse calculation if price is inclusive, or direct if exclusive)
      const baseTaxable = taxRate > 0 ? itemLineTotal / (1 + taxRate / 100) : itemLineTotal;
      const taxAmt = itemLineTotal - baseTaxable;

      if (!gstSlabMap[roundedSlab]) {
        gstSlabMap[roundedSlab] = {
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          totalTax: 0,
          itemCount: 0,
        };
      }
      gstSlabMap[roundedSlab].taxableValue += baseTaxable;
      gstSlabMap[roundedSlab].cgst += taxAmt / 2;
      gstSlabMap[roundedSlab].sgst += taxAmt / 2;
      gstSlabMap[roundedSlab].totalTax += taxAmt;
      gstSlabMap[roundedSlab].itemCount += qty;

      // Product sales aggregator
      const prodId = item.productId || item.itemDescription;
      if (!productSalesMap[prodId]) {
        productSalesMap[prodId] = {
          id: prodId,
          name: item.product?.name || item.itemDescription,
          skuCode: item.product?.skuCode || "CUSTOM",
          quantitySold: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };
      }
      productSalesMap[prodId].quantitySold += qty;
      productSalesMap[prodId].totalRevenue += itemLineTotal;
      productSalesMap[prodId].totalProfit += itemLineTotal - itemCostTotal;
    });

    // 3. Operating Expenses Aggregation
    let totalExpenses = 0;
    let cashPettyTotal = 0;
    const expenseCatMap: Record<
      string,
      { name: string; color: string; amount: number; count: number }
    > = {};

    expenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      if (exp.paymentMethod === "CASH") cashPettyTotal += amt;

      const catName = exp.category?.name || "General";
      const catColor = exp.category?.color || "#64748B";
      if (!expenseCatMap[catName]) {
        expenseCatMap[catName] = { name: catName, color: catColor, amount: 0, count: 0 };
      }
      expenseCatMap[catName].amount += amt;
      expenseCatMap[catName].count += 1;
    });

    const grossProfit = Math.max(0, totalRevenue - totalCostOfGoods);
    const grossProfitMarginPct =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netOperatingProfit = grossProfit - totalExpenses;

    // 4. Top Custom Jobs
    const jobTypeMap: Record<string, { jobType: string; count: number; totalAmount: number }> =
      {};
    jobOrders.forEach((j) => {
      const t = j.jobType || "Custom Print";
      if (!jobTypeMap[t]) {
        jobTypeMap[t] = { jobType: t, count: 0, totalAmount: 0 };
      }
      jobTypeMap[t].count += 1;
      jobTypeMap[t].totalAmount += Number(j.totalAmount) || 0;
    });

    const topJobTypes = Object.values(jobTypeMap).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8);

    const dailyTimeline = Object.entries(timelineMap)
      .map(([date, val]) => ({
        date,
        revenue: val.revenue,
        cost: val.cost,
        profit: val.profit,
        invoicesCount: val.invoicesCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const gstSlabs = Object.entries(gstSlabMap)
      .map(([slab, val]) => ({
        slabRate: Number(slab),
        ...val,
      }))
      .filter((s) => s.taxableValue > 0 || s.slabRate === 0);

    const invoicesList = invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      invoiceType: i.invoiceType,
      customerName: i.customer?.name || null,
      customerPhone: i.customer?.phone || null,
      paymentMethod: i.paymentMethod,
      subtotal: Number(i.subTotal),
      taxAmount: Number(i.taxAmount),
      discountAmount: Number(i.discountAmount),
      netTotal: Number(i.netTotal),
      createdAt: i.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        dateRange: {
          startDate: startDateStr,
          endDate: endDateStr,
        },
        metrics: {
          totalRevenue,
          totalCostOfGoods,
          grossProfit,
          grossProfitMarginPct,
          totalExpenses,
          netOperatingProfit,
          totalInvoicesCount: invoices.length,
          totalCustomJobsCount: jobOrders.length,
          totalTaxCollected,
          totalDiscounts,
        },
        expenseBreakdown: {
          total: totalExpenses,
          cashPettyTotal,
          categories: Object.values(expenseCatMap).sort((a, b) => b.amount - a.amount),
        },
        paymentBreakdown,
        gstSlabs,
        topProducts,
        topJobTypes,
        dailyTimeline,
        invoicesList,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch report data" };
  }
}

// ----------------------------------------------------
// DAILY SHIFT Z-REPORT GENERATOR
// ----------------------------------------------------

export interface DailyZReportData {
  date: string;
  reportNumber: string;
  generatedAt: string;
  openingCash: number;
  totalSales: number;
  invoicesCount: number;
  paymentBreakdown: {
    cashSales: number;
    upiSales: number;
    cardSales: number;
    udhaarGiven: number;
  };
  customerPaymentsCollected: {
    cashCollected: number;
    upiCollected: number;
    totalCollected: number;
  };
  pettyCashExpenses: {
    totalCashExpenses: number;
    items: Array<{ title: string; categoryName: string; amount: number }>;
  };
  spoilageWastageCost: number;
  cashDrawerReconciliation: {
    openingCash: number;
    cashFromSales: number;
    cashFromUdhaarRecoveries: number;
    totalCashInflow: number;
    cashPettyExpensesPaid: number;
    expectedCashInDrawer: number;
  };
  taxCollected: number;
  discountGiven: number;
}

export async function generateDailyZReport(
  dateStr: string,
  openingCash: number = 0
): Promise<{ success: boolean; data?: DailyZReportData; error?: string }> {
  try {
    const targetDate = new Date(dateStr);
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const [invoices, customerPayments, stockAdjustments, cashExpenses] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.customerPayment.findMany({
        where: {
          receivedAt: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.stockAdjustment.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          adjustmentType: {
            in: ["PRINT_SPOILAGE", "DAMAGE_WASTAGE"],
          },
        },
        include: { product: true },
      }),
      prisma.expense.findMany({
        where: {
          expenseDate: {
            gte: start,
            lte: end,
          },
          paymentMethod: "CASH",
        },
        include: { category: true },
      }),
    ]);

    let totalSales = 0;
    let taxCollected = 0;
    let discountGiven = 0;

    const paymentBreakdown = {
      cashSales: 0,
      upiSales: 0,
      cardSales: 0,
      udhaarGiven: 0,
    };

    invoices.forEach((inv) => {
      const net = Number(inv.netTotal) || 0;
      totalSales += net;
      taxCollected += Number(inv.taxAmount) || 0;
      discountGiven += Number(inv.discountAmount) || 0;

      if (inv.paymentMethod === "CASH") paymentBreakdown.cashSales += net;
      else if (inv.paymentMethod === "UPI") paymentBreakdown.upiSales += net;
      else if (inv.paymentMethod === "CARD") paymentBreakdown.cardSales += net;
      else if (inv.paymentMethod === "CREDIT_UDHAAR") paymentBreakdown.udhaarGiven += net;
      else if (inv.paymentMethod === "SPLIT") paymentBreakdown.cashSales += net; // Treat split primary as cash
    });

    let udhaarCash = 0;
    let udhaarUpi = 0;
    customerPayments.forEach((cp) => {
      const amt = Number(cp.amount) || 0;
      if (cp.paymentMethod === "CASH") udhaarCash += amt;
      else udhaarUpi += amt;
    });

    let cashPettyPaid = 0;
    const pettyItems = cashExpenses.map((e) => {
      const amt = Number(e.amount) || 0;
      cashPettyPaid += amt;
      return {
        title: e.title,
        categoryName: e.category?.name || "General",
        amount: amt,
      };
    });

    const spoilageWastageCost = stockAdjustments.reduce((sum, adj) => {
      const cost = Number(adj.product?.costPrice) || 0;
      const qty = Math.abs(Number(adj.quantityDelta) || 0);
      return sum + cost * qty;
    }, 0);

    const totalCashInflow = paymentBreakdown.cashSales + udhaarCash;
    const expectedCashInDrawer = openingCash + totalCashInflow - cashPettyPaid;

    const reportNumber = `Z-${dateStr.replace(/-/g, "")}`;

    return {
      success: true,
      data: {
        date: dateStr,
        reportNumber,
        generatedAt: new Date().toISOString(),
        openingCash,
        totalSales,
        invoicesCount: invoices.length,
        paymentBreakdown,
        customerPaymentsCollected: {
          cashCollected: udhaarCash,
          upiCollected: udhaarUpi,
          totalCollected: udhaarCash + udhaarUpi,
        },
        pettyCashExpenses: {
          totalCashExpenses: cashPettyPaid,
          items: pettyItems,
        },
        spoilageWastageCost,
        cashDrawerReconciliation: {
          openingCash,
          cashFromSales: paymentBreakdown.cashSales,
          cashFromUdhaarRecoveries: udhaarCash,
          totalCashInflow,
          cashPettyExpensesPaid: cashPettyPaid,
          expectedCashInDrawer,
        },
        taxCollected,
        discountGiven,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate Z-Report" };
  }
}

