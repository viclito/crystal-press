import React from "react";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { InventoryPageClient } from "./InventoryPageClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  let serializedProducts: any[] = [];
  let categories: any[] = [];
  let units: any[] = [];

  try {
    const [prods, cats, un] = await Promise.all([
      prisma.product.findMany({
        include: {
          unit: true,
          subCategory: {
            include: { category: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        include: { subCategories: true },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.unit.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    serializedProducts = prods.map((p) => ({
      id: p.id,
      name: p.name,
      skuCode: p.skuCode,
      barcode: p.barcode,
      subCategoryId: p.subCategoryId,
      unitId: p.unitId,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      currentStock: Number(p.currentStock),
      minStockAlert: Number(p.minStockAlert),
      taxPercent: Number(p.taxPercent),
      unit: p.unit ? { id: p.unit.id, code: p.unit.code, name: p.unit.name } : null,
      subCategory: p.subCategory
        ? {
            id: p.subCategory.id,
            name: p.subCategory.name,
            category: p.subCategory.category ? { id: p.subCategory.category.id, name: p.subCategory.category.name } : null,
          }
        : null,
    }));
    categories = cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      subCategories: (c.subCategories || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        categoryId: s.categoryId,
        displayOrder: s.displayOrder,
        isActive: s.isActive,
      })),
    }));
    units = un.map((u) => ({
      id: u.id,
      code: u.code,
      name: u.name,
      allowsFraction: u.allowsFraction,
      isActive: u.isActive,
    }));
  } catch (error) {
    console.warn("⚠️ Database not connected during inventory build, using fallback data.");
  }

  return (
    <DashboardShell title="Inventory & Stock Master">
      <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading inventory...</div>}>
        <InventoryPageClient
          initialProducts={serializedProducts}
          categories={categories}
          units={units}
        />
      </React.Suspense>
    </DashboardShell>
  );
}
