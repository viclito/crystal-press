"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export async function getProductsForBarcodes(filters?: {
  categoryId?: string;
  search?: string;
  hasBarcodeOnly?: boolean;
  missingBarcodeOnly?: boolean;
}) {
  try {
    const where: any = { isActive: true };

    if (filters?.categoryId && filters.categoryId !== "ALL") {
      where.subCategory = {
        categoryId: filters.categoryId,
      };
    }

    if (filters?.hasBarcodeOnly) {
      where.barcode = { not: null };
    } else if (filters?.missingBarcodeOnly) {
      where.OR = [{ barcode: null }, { barcode: "" }];
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { skuCode: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
      ];
    }

    const [products, totalCount, withBarcodeCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          subCategory: {
            include: {
              category: true,
            },
          },
          unit: true,
        },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({
        where: {
          isActive: true,
          barcode: { not: null },
          NOT: { barcode: "" },
        },
      }),
    ]);

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      skuCode: p.skuCode,
      barcode: p.barcode,
      categoryName: p.subCategory?.category?.name || "Uncategorized",
      unitName: p.unit?.name || "pcs",
      currentStock: Number(p.currentStock),
      sellingPrice: Number(p.sellingPrice),
      costPrice: Number(p.costPrice),
    }));

    return {
      success: true as const,
      products: formatted,
      metrics: {
        total: totalCount,
        withBarcode: withBarcodeCount,
        missingBarcode: totalCount - withBarcodeCount,
      },
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch barcode catalog:", error);
    return { success: false as const, error: error.message || "Failed to load products" };
  }
}

export async function autoGenerateMissingBarcodes() {
  try {
    const unassigned = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [{ barcode: null }, { barcode: "" }],
      },
      select: { id: true, skuCode: true },
    });

    if (unassigned.length === 0) {
      return { success: true as const, updatedCount: 0, message: "All products already have barcodes!" };
    }

    // Assign unique barcodes: CP-{skuCode} or numeric EAN format
    await prisma.$transaction(
      unassigned.map((p, idx) => {
        const generatedBarcode = p.skuCode
          ? `${p.skuCode.toUpperCase()}`
          : `CP-${String(Date.now()).slice(-6)}${String(idx).padStart(2, "0")}`;

        return prisma.product.update({
          where: { id: p.id },
          data: { barcode: generatedBarcode },
        });
      })
    );

    safeRevalidate("/barcodes");
    safeRevalidate("/inventory");
    safeRevalidate("/pos");

    return {
      success: true as const,
      updatedCount: unassigned.length,
      message: `Assigned barcodes to ${unassigned.length} products successfully!`,
    };
  } catch (error: any) {
    console.error("❌ Failed to auto-generate barcodes:", error);
    return { success: false as const, error: error.message || "Failed to auto-generate barcodes" };
  }
}

export async function updateProductBarcode(productId: string, barcode: string) {
  try {
    const trimmed = barcode.trim();
    if (!trimmed) {
      return { success: false as const, error: "Barcode string cannot be empty" };
    }

    // Check uniqueness
    const existing = await prisma.product.findFirst({
      where: {
        barcode: trimmed,
        id: { not: productId },
      },
    });

    if (existing) {
      return { success: false as const, error: `Barcode "${trimmed}" is already assigned to "${existing.name}"` };
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { barcode: trimmed },
    });

    safeRevalidate("/barcodes");
    safeRevalidate("/inventory");
    safeRevalidate("/pos");

    return { success: true as const, product: updated };
  } catch (error: any) {
    console.error("❌ Failed to update product barcode:", error);
    return { success: false as const, error: error.message || "Failed to update barcode" };
  }
}

export async function searchProductByBarcode(code: string) {
  try {
    const clean = code.trim();
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: { equals: clean, mode: "insensitive" } },
          { skuCode: { equals: clean, mode: "insensitive" } },
        ],
        isActive: true,
      },
      include: {
        unit: true,
      },
    });

    if (!product) {
      return { success: false as const, error: `No active product found with barcode "${clean}"` };
    }

    return {
      success: true as const,
      product: {
        ...product,
        sellingPrice: Number(product.sellingPrice),
        currentStock: Number(product.currentStock),
        costPrice: Number(product.costPrice),
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Search failed" };
  }
}
