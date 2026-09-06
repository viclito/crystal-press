import React from "react";
import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getProductsForBarcodes } from "@/actions/barcodes";
import { prisma } from "@/lib/prisma";
import { BarcodeStudioClient } from "./BarcodeStudioClient";
import { serializeShopSettings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Barcode & Label Studio | Crystal Press",
  description: "Generate and print thermal barcode labels (50x25mm, 38x25mm) and A4 sticker sheets",
};

export default async function BarcodesPage() {
  const [catalogRes, categories, settings] = await Promise.all([
    getProductsForBarcodes(),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.shopSettings.findFirst(),
  ]);

  const initialProducts = catalogRes.success && catalogRes.products ? catalogRes.products : [];
  const metrics = catalogRes.success && catalogRes.metrics ? catalogRes.metrics : {
    total: 0,
    withBarcode: 0,
    missingBarcode: 0,
  };

  const serializedSettings = serializeShopSettings(settings);

  return (
    <DashboardShell title="Barcode & Thermal Label Studio">
      <BarcodeStudioClient
        initialProducts={initialProducts}
        categories={categories}
        metrics={metrics}
        shopSettings={serializedSettings}
      />
    </DashboardShell>
  );
}
