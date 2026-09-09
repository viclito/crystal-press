"use server";

import { prisma } from "@/lib/prisma";

export interface SystemNotification {
  id: string;
  type: "low_stock" | "job_order" | "udhaar" | "challan" | "quotation";
  title: string;
  description: string;
  time: string;
  severity: "urgent" | "warning" | "info";
  link: string;
}

export async function getSystemNotifications() {
  try {
    const notifications: SystemNotification[] = [];

    const [lowStockProducts, activeJobs, debtorCustomers, pendingChallansCount, openQuotesCount] =
      await Promise.all([
        // 1. Critical Low Stock Products (lte 15 units)
        prisma.product.findMany({
          where: { isActive: true, currentStock: { lte: 15 } },
          orderBy: { currentStock: "asc" },
          take: 4,
          select: { id: true, name: true, currentStock: true, skuCode: true },
        }),

        // 2. Active Job Orders in Production
        prisma.jobOrder.findMany({
          where: { status: { in: ["ORDER_PLACED", "DESIGNING", "PRINTING", "FINISHING"] } },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            jobOrderNumber: true,
            jobType: true,
            customerName: true,
            status: true,
            expectedDeliveryDate: true,
            createdAt: true,
          },
        }),

        // 3. Outstanding Udhaar / Overdue Customers
        prisma.customer.findMany({
          where: { isActive: true, currentBalance: { gt: 0 } },
          orderBy: { currentBalance: "desc" },
          take: 3,
          select: { id: true, name: true, currentBalance: true, creditLimit: true },
        }),

        // 4. Pending Delivery Challans
        prisma.deliveryChallan.count({
          where: { status: { in: ["PREPARED", "IN_TRANSIT"] } },
        }),

        // 5. Open Quotations
        prisma.quotation.count({
          where: { status: { in: ["DRAFT", "SENT"] } },
        }),
      ]);

    // Format Low Stock Alerts
    for (const prod of lowStockProducts) {
      notifications.push({
        id: `stock-${prod.id}`,
        type: "low_stock",
        title: `Low Stock: ${prod.name}`,
        description: `Only ${Number(prod.currentStock)} units remaining (SKU: ${prod.skuCode})`,
        time: "Reorder Alert",
        severity: Number(prod.currentStock) <= 5 ? "urgent" : "warning",
        link: "/inventory",
      });
    }

    // Format Active Jobs
    for (const job of activeJobs) {
      const statusLabel =
        job.status === "PRINTING"
          ? "Printing in Progress"
          : job.status === "DESIGNING"
          ? "Artwork Designing"
          : job.status === "FINISHING"
          ? "Finishing & Cutting"
          : "Order Queued";

      notifications.push({
        id: `job-${job.id}`,
        type: "job_order",
        title: `${job.jobType} (${job.jobOrderNumber})`,
        description: `${job.customerName} • ${statusLabel}`,
        time: job.expectedDeliveryDate
          ? `Due: ${new Date(job.expectedDeliveryDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
          : "In Production",
        severity: job.status === "PRINTING" ? "urgent" : "info",
        link: `/jobs?jobId=${job.id}`,
      });
    }

    // Format Debtors
    for (const cust of debtorCustomers) {
      const isOverLimit =
        Number(cust.currentBalance) > Number(cust.creditLimit) && Number(cust.creditLimit) > 0;
      notifications.push({
        id: `udhaar-${cust.id}`,
        type: "udhaar",
        title: `Credit Watch: ${cust.name}`,
        description: `Outstanding Balance: ₹${Number(cust.currentBalance).toLocaleString("en-IN")}`,
        time: isOverLimit ? "Exceeds Limit" : "Payment Pending",
        severity: isOverLimit ? "urgent" : "warning",
        link: "/customers",
      });
    }

    // Format Pending Challans
    if (pendingChallansCount > 0) {
      notifications.push({
        id: "challans-pending",
        type: "challan",
        title: `${pendingChallansCount} Delivery Challans Pending`,
        description: "Orders packaged and ready for dispatch",
        time: "Dispatch Desk",
        severity: "info",
        link: "/challans",
      });
    }

    // Format Open Quotations
    if (openQuotesCount > 0) {
      notifications.push({
        id: "quotes-open",
        type: "quotation",
        title: `${openQuotesCount} Quotations Pending Review`,
        description: "Estimates sent awaiting client confirmation",
        time: "Estimates",
        severity: "info",
        link: "/quotations",
      });
    }

    return {
      success: true as const,
      notifications,
      unreadCount: notifications.length,
    };
  } catch (error: any) {
    console.error("Failed to fetch system notifications:", error);
    return {
      success: false as const,
      notifications: [],
      unreadCount: 0,
      error: error.message || "Failed to load notifications",
    };
  }
}
