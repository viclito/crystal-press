import React from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getCustomersWithAging } from "@/actions/customers";
import { prisma } from "@/lib/prisma";
import { CustomersPageClient } from "./CustomersPageClient";
import { serializeShopSettings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [agingRes, settings] = await Promise.all([
    getCustomersWithAging(),
    prisma.shopSettings.findFirst(),
  ]);

  const initialCustomers = agingRes.success && agingRes.customers ? agingRes.customers : [];
  const initialMetrics = agingRes.success && agingRes.metrics ? agingRes.metrics : {
    totalCustomers: 0,
    totalReceivables: 0,
    overdue30Amount: 0,
    overdueCount: 0,
    limitBreachedCount: 0,
    collectionsThisMonth: 0,
  };

  const serializedSettings = serializeShopSettings(settings);

  return (
    <DashboardShell title="Customers & Udhaar (Credit) Ledger">
      <CustomersPageClient
        initialCustomers={initialCustomers}
        initialMetrics={initialMetrics}
        shopSettings={serializedSettings}
      />
    </DashboardShell>
  );
}
