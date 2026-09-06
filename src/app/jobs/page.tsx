import React from "react";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { JobsPageClient } from "./JobsPageClient";
import { serializeShopSettings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  let serializedJobs: any[] = [];
  let serializedCustomers: any[] = [];
  let shopSettings: any = null;

  try {
    const [jobOrders, customers, settings] = await Promise.all([
      prisma.jobOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          createdBy: true,
        },
      }),
      prisma.customer.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.shopSettings.findFirst(),
    ]);

    serializedJobs = jobOrders.map((j) => ({
      id: j.id,
      jobOrderNumber: j.jobOrderNumber,
      customerName: j.customerName,
      customerPhone: j.customerPhone,
      jobType: j.jobType,
      specifications: j.specifications as Record<string, any>,
      quantity: j.quantity,
      unitName: j.unitName,
      totalAmount: Number(j.totalAmount),
      advancePaid: Number(j.advancePaid),
      balanceDue: Number(j.balanceDue),
      status: j.status,
      proofApproved: j.proofApproved,
      proofApprovedAt: j.proofApprovedAt ? j.proofApprovedAt.toISOString() : null,
      proofRejectedAt: j.proofRejectedAt ? j.proofRejectedAt.toISOString() : null,
      customerFeedback: j.customerFeedback,
      clientApprovedName: j.clientApprovedName,
      designNotes: j.designNotes,
      expectedDeliveryDate: j.expectedDeliveryDate ? j.expectedDeliveryDate.toISOString() : null,
      createdAt: j.createdAt.toISOString(),
    }));

    serializedCustomers = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      currentBalance: Number(c.currentBalance),
    }));

    shopSettings = serializeShopSettings(settings);
  } catch (error) {
    console.warn("⚠️ Database not connected during page build, using fallback data.");
  }

  return (
    <DashboardShell title="Custom Printing Job Orders">
      <JobsPageClient
        initialJobs={serializedJobs}
        customers={serializedCustomers}
        shopSettings={shopSettings}
      />
    </DashboardShell>
  );
}
