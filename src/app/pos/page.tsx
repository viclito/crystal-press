import React from "react";
import { prisma } from "@/lib/prisma";
import { POSCounterClient } from "./POSCounterClient";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  let serializedProducts: any[] = [];
  let categories: any[] = [];
  let serializedCustomers: any[] = [];
  let shopSettings: any = null;

  try {
    const [products, cats, customers, settings] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        include: {
          unit: true,
          subCategory: {
            include: { category: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.customer.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.shopSettings.findFirst(),
    ]);

    serializedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      skuCode: p.skuCode,
      barcode: p.barcode,
      sellingPrice: Number(p.sellingPrice),
      costPrice: Number(p.costPrice),
      currentStock: Number(p.currentStock),
      minStockAlert: Number(p.minStockAlert),
      taxPercent: Number(p.taxPercent),
      unit: p.unit ? { code: p.unit.code, name: p.unit.name } : null,
      subCategory: p.subCategory
        ? {
            id: p.subCategory.id,
            name: p.subCategory.name,
            category: p.subCategory.category
              ? { id: p.subCategory.category.id, name: p.subCategory.category.name }
              : undefined,
          }
        : undefined,
      version: p.version,
    }));
    categories = cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
    }));
    serializedCustomers = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || "",
      currentBalance: Number(c.currentBalance || 0),
      walletBalance: Number(c.walletBalance || 0),
      loyaltyPoints: Number(c.loyaltyPoints || 0),
    }));
    shopSettings = settings
      ? {
          id: settings.id,
          shopName: settings.shopName || "Crystal Press",
          tagline: settings.tagline || "",
          addressLine1: settings.addressLine1 || "",
          addressLine2: settings.addressLine2 || "",
          phone1: settings.phone1 || "",
          phone2: settings.phone2 || "",
          email: settings.email || "",
          upiId: settings.upiId || "",
          upiPayeeName: settings.upiPayeeName || "",
          invoicePrefix: settings.invoicePrefix || "CP",
          jobOrderPrefix: settings.jobOrderPrefix || "JO",
          receiptFooter: settings.receiptFooter || "",
          defaultTaxRate: Number(settings.defaultTaxRate || 0),
          isTaxEnabled: Boolean(settings.isTaxEnabled),
          loyaltySpendPerPoint: Number(settings.loyaltySpendPerPoint || 100),
          loyaltyPointValue: Number(settings.loyaltyPointValue || 1),
          maxLoyaltyDiscountPercent: Number(settings.maxLoyaltyDiscountPercent || 50),
          loyaltyDiscountType: settings.loyaltyDiscountType || "RUPEES",
          isLoyaltyEnabled: Boolean(settings.isLoyaltyEnabled ?? true),
        }
      : null;
  } catch (error) {
    console.warn("⚠️ Database not connected during POS build, using fallback data.");
  }

  return (
    <DashboardShell title="Counter POS Billing">
      <POSCounterClient
        initialProducts={serializedProducts}
        categories={categories}
        customers={serializedCustomers}
        shopSettings={shopSettings}
      />
    </DashboardShell>
  );
}
