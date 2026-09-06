import React from "react";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PurchasesClient } from "./PurchasesClient";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const [vendors, purchaseOrders, products] = await Promise.all([
    prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseOrder.findMany({
      orderBy: { purchaseDate: "desc" },
      include: {
        vendor: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                skuCode: true,
              },
            },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        skuCode: true,
        costPrice: true,
        currentStock: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedVendors = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    contactPerson: v.contactPerson,
    phone: v.phone,
    address: v.address,
    outstandingBalance: Number(v.outstandingBalance || 0),
    isActive: v.isActive,
    createdAt: v.createdAt ? v.createdAt.toISOString() : null,
  }));

  const serializedPOs = purchaseOrders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    vendorId: po.vendorId,
    vendorBillNo: po.vendorBillNo,
    totalAmount: Number(po.totalAmount || 0),
    paidAmount: Number(po.paidAmount || 0),
    purchaseDate: po.purchaseDate ? po.purchaseDate.toISOString() : new Date().toISOString(),
    notes: po.notes,
    vendor: {
      id: po.vendor.id,
      name: po.vendor.name,
      phone: po.vendor.phone,
      outstandingBalance: Number(po.vendor.outstandingBalance || 0),
    },
    items: po.items.map((it) => ({
      id: it.id,
      purchaseOrderId: it.purchaseOrderId,
      productId: it.productId,
      quantity: Number(it.quantity || 0),
      unitCostPrice: Number(it.unitCostPrice || 0),
      lineTotal: Number(it.lineTotal || 0),
      product: it.product ? {
        id: it.product.id,
        name: it.product.name,
        skuCode: it.product.skuCode,
      } : null,
    })),
  }));

  const serializedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    skuCode: p.skuCode,
    costPrice: Number(p.costPrice || 0),
    currentStock: Number(p.currentStock || 0),
  }));

  return (
    <DashboardShell title="Purchases & Vendor Restocking">
      <PurchasesClient
        vendors={serializedVendors}
        purchaseOrders={serializedPOs}
        products={serializedProducts}
      />
    </DashboardShell>
  );
}
