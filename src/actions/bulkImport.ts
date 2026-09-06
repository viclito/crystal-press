"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface BulkProductRow {
  name: string;
  skuCode?: string;
  barcode?: string;
  categoryName?: string;
  subCategoryName?: string;
  unitCode?: string;
  costPrice?: number;
  sellingPrice: number;
  currentStock?: number;
  minStockAlert?: number;
  taxPercent?: number;
}

interface ImportOptions {
  duplicateStrategy: "update" | "skip";
}

export async function bulkImportProducts(
  rows: BulkProductRow[],
  options: ImportOptions = { duplicateStrategy: "update" }
) {
  try {
    if (!rows || rows.length === 0) {
      return { success: false as const, error: "No product rows found in the uploaded file" };
    }

    // 1. Fetch reference units and categories
    const [units, categories] = await Promise.all([
      prisma.unit.findMany(),
      prisma.category.findMany({ include: { subCategories: true } }),
    ]);

    const unitMap = new Map(units.map((u) => [u.code.toLowerCase(), u.id]));
    const defaultUnitId = units.find((u) => u.code.toLowerCase() === "pcs")?.id || units[0]?.id;
    const defaultSubCategoryId = categories[0]?.subCategories[0]?.id;

    // Cache category & subcategory map for fast lookup
    const catMap = new Map<string, { id: string; subCategories: Map<string, string> }>();
    for (const cat of categories) {
      const subMap = new Map<string, string>();
      for (const sub of cat.subCategories) {
        subMap.set(sub.name.toLowerCase(), sub.id);
      }
      catMap.set(cat.name.toLowerCase(), { id: cat.id, subCategories: subMap });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // 2. Process in transactional batches of 50 for max speed & safety
    const batchSize = 50;
    for (let b = 0; b < rows.length; b += batchSize) {
      const batch = rows.slice(b, b + batchSize);

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNum = b + i + 1;

          if (!row.name || !row.name.trim()) {
            errors.push(`Row ${rowNum}: Missing product name (Skipped)`);
            skippedCount++;
            continue;
          }

          const name = row.name.trim();
          const sellingPrice = Number(row.sellingPrice) || 0;
          const costPrice = Number(row.costPrice) || Math.round(sellingPrice * 0.75);
          const currentStock = Number(row.currentStock) || 0;
          const minStockAlert = Number(row.minStockAlert) || 10;
          const taxPercent = Number(row.taxPercent) || 0;

          // Auto-generate SKU if missing
          const skuCode = row.skuCode?.trim() || `CP-SKU-${String(Date.now()).slice(-6)}-${b + i + 1}`;
          const barcode = row.barcode?.trim() || undefined;

          // Resolve Unit
          let unitId = defaultUnitId;
          if (row.unitCode) {
            const matched = unitMap.get(row.unitCode.trim().toLowerCase());
            if (matched) unitId = matched;
          }

          // Resolve Category & SubCategory (or create default)
          let subCategoryId: string | undefined = undefined;
          const catName = (row.categoryName?.trim() || "General Stationery").toLowerCase();
          const subCatName = (row.subCategoryName?.trim() || "Standard").toLowerCase();

          if (!catMap.has(catName)) {
            // Auto-create Category
            const newCat = await tx.category.create({
              data: {
                name: row.categoryName?.trim() || "General Stationery",
                slug: catName.replace(/\s+/g, "-"),
                subCategories: {
                  create: [
                    {
                      name: row.subCategoryName?.trim() || "Standard",
                      slug: subCatName.replace(/\s+/g, "-"),
                    },
                  ],
                },
              },
              include: { subCategories: true },
            });

            const subMap = new Map<string, string>();
            subMap.set(subCatName, newCat.subCategories[0].id);
            catMap.set(catName, { id: newCat.id, subCategories: subMap });
            subCategoryId = newCat.subCategories[0].id;
          } else {
            const catEntry = catMap.get(catName)!;
            if (!catEntry.subCategories.has(subCatName)) {
              // Auto-create SubCategory
              const newSub = await tx.subCategory.create({
                data: {
                  name: row.subCategoryName?.trim() || "Standard",
                  slug: subCatName.replace(/\s+/g, "-"),
                  categoryId: catEntry.id,
                },
              });
              catEntry.subCategories.set(subCatName, newSub.id);
              subCategoryId = newSub.id;
            } else {
              subCategoryId = catEntry.subCategories.get(subCatName);
            }
          }

          // Check for existing product by SKU or Barcode
          const existing = await tx.product.findFirst({
            where: {
              OR: [{ skuCode }, ...(barcode ? [{ barcode }] : [])],
            },
          });

          if (existing) {
            if (options.duplicateStrategy === "update") {
              await tx.product.update({
                where: { id: existing.id },
                data: {
                  name,
                  costPrice,
                  sellingPrice,
                  currentStock: { increment: currentStock },
                  minStockAlert,
                  taxPercent,
                  subCategoryId: subCategoryId || existing.subCategoryId,
                  unitId: unitId || existing.unitId,
                },
              });
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await tx.product.create({
              data: {
                name,
                skuCode,
                barcode: barcode || null,
                costPrice,
                sellingPrice,
                currentStock,
                minStockAlert,
                taxPercent,
                unitId,
                subCategoryId: subCategoryId || defaultSubCategoryId,
                isActive: true,
              },
            });
            createdCount++;
          }
        }
      });
    }

    revalidatePath("/inventory");
    revalidatePath("/pos");
    revalidatePath("/");

    return {
      success: true as const,
      createdCount,
      updatedCount,
      skippedCount,
      totalProcessed: rows.length,
      errors: errors.slice(0, 10), // Return top errors if any
    };
  } catch (error: any) {
    console.error("❌ Bulk Import Failed:", error);
    return { success: false as const, error: error.message || "Failed to process bulk import" };
  }
}
