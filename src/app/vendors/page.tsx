import React from "react";
import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getVendors } from "@/actions/vendors";
import { prisma } from "@/lib/prisma";
import { VendorsClient } from "./VendorsClient";
import { serializeShopSettings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendors & Paper Mills | Crystal Press",
  description: "Track paper suppliers, raw material purchase bills, outgoing payments, and ledger statements",
};

export default async function VendorsPage() {
  const [vendorsRes, settings] = await Promise.all([
    getVendors(),
    prisma.shopSettings.findFirst(),
  ]);

  const initialVendors = vendorsRes.success ? vendorsRes.vendors : [];
  const initialKpis = vendorsRes.success ? vendorsRes.kpis : {};

  const serializedSettings = serializeShopSettings(settings);

  return (
    <DashboardShell title="Vendors & Paper Mills">
      <VendorsClient
        initialVendors={initialVendors}
        initialKpis={initialKpis}
        shopSettings={serializedSettings}
      />
    </DashboardShell>
  );
}
