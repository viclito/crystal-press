import React from "react";
import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getQuotations } from "@/actions/quotations";
import { prisma } from "@/lib/prisma";
import { QuotationsClient } from "./QuotationsClient";
import { serializeShopSettings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quotations & Estimates | Crystal Press",
  description: "Create, print, and track commercial printing estimates and quotation proformas",
};

export default async function QuotationsPage() {
  const [quotesRes, customers, products, settings] = await Promise.all([
    getQuotations(),
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        skuCode: true,
        sellingPrice: true,
        currentStock: true,
        taxPercent: true,
        unit: {
          select: {
            code: true,
          },
        },
      },
    }),
    prisma.shopSettings.findFirst(),
  ]);

  const initialQuotations = quotesRes.success ? quotesRes.quotations : [];
  const initialKpis = quotesRes.success ? quotesRes.kpis : {};

  const serializedProducts = products.map((p) => ({
    ...p,
    sellingPrice: Number(p.sellingPrice),
    currentStock: Number(p.currentStock),
    taxPercent: Number(p.taxPercent),
  }));

  const serializedSettings = serializeShopSettings(settings);

  return (
    <DashboardShell title="Quotations & Estimates">
      <QuotationsClient
        initialQuotations={initialQuotations}
        initialKpis={initialKpis}
        customers={customers}
        products={serializedProducts}
        shopSettings={serializedSettings}
      />
    </DashboardShell>
  );
}
