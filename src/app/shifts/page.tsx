import React from "react";
import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getShiftHistory, getActiveShift } from "@/actions/shifts";
import { ShiftsClient } from "./ShiftsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cash Drawer & Shift Handover | Crystal Press",
  description: "Opening float, currency denominations, cash discrepancy reconciliation and printable handover dockets",
};

export default async function ShiftsPage() {
  const [historyRes, activeRes] = await Promise.all([
    getShiftHistory({ limit: 50 }),
    getActiveShift(),
  ]);

  const initialShifts = historyRes.success ? historyRes.shifts : [];
  const activeShift = activeRes.success ? activeRes.shift : null;
  const metrics = historyRes.success
    ? historyRes.metrics
    : {
        closedShiftsCount: 0,
        totalReconciledCash: 0,
        totalDiscrepanciesCount: 0,
        netDiscrepancyAmount: 0,
      };

  return (
    <DashboardShell>
      <ShiftsClient
        initialShifts={initialShifts}
        activeShift={activeShift}
        metrics={metrics}
      />
    </DashboardShell>
  );
}
