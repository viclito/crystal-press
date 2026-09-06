import React from "react";
import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getCalculatorMasterData } from "@/actions/calculator";
import { PrintCostCalculatorClient } from "@/components/calculator/PrintCostCalculatorClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print Estimator & Paper Cut Planner | Crystal Press",
  description: "Interactive 2D paper sheet imposition, raw material consumption, and multi-stage print costing engine",
};

export default async function CalculatorPage() {
  const masterData = await getCalculatorMasterData();

  const products = masterData.success ? masterData.products : [];
  const customers = masterData.success ? masterData.customers : [];
  const shopSettings = masterData.success ? masterData.shopSettings : null;

  return (
    <DashboardShell title="Print Estimator & Paper Cut Planner">
      <PrintCostCalculatorClient
        products={products}
        customers={customers}
        shopSettings={shopSettings}
      />
    </DashboardShell>
  );
}
