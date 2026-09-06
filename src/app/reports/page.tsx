import React from "react";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ReportsClient } from "./ReportsClient";
import { getFilteredReportData } from "@/actions/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const today = now.toISOString().split("T")[0];

  const [reportResult, shopSettings] = await Promise.all([
    getFilteredReportData(startOfMonth, today),
    prisma.shopSettings.findFirst(),
  ]);

  if (!reportResult.success || !reportResult.data) {
    return (
      <DashboardShell title="Reports & Financial Intelligence">
        <div className="p-8 bg-rose-50 rounded-3xl border border-rose-200 text-rose-700 text-sm font-bold text-center">
          Failed to load financial report data: {reportResult.error || "Unknown Error"}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Reports & Financial Intelligence">
      <ReportsClient
        initialData={reportResult.data}
        shopSettings={{
          shopName: shopSettings?.shopName || "Crystal Press",
          address: shopSettings?.addressLine1 || "12 Market Complex, Main Road",
          gstin: "36AAAAA0000A1Z5",
        }}
      />
    </DashboardShell>
  );
}
