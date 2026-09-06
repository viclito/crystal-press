"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { StockAdjustmentType } from "@prisma/client";
import { revalidatePath } from "next/cache";

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Product name is required"),
  skuCode: z.string().min(1, "SKU code is required"),
  barcode: z.string().optional().nullable(),
  subCategoryId: z.string().uuid("Please select a sub-category"),
  unitId: z.string().uuid("Please select a unit"),
  costPrice: z.number().nonnegative().default(0),
  sellingPrice: z.number().positive("Selling price must be greater than 0"),
  currentStock: z.number().nonnegative().default(0),
  minStockAlert: z.number().nonnegative().default(10),
  taxPercent: z.number().nonnegative().default(0),
});

export async function upsertProduct(payload: z.infer<typeof ProductSchema>) {
  try {
    const validated = ProductSchema.parse(payload);

    if (validated.id) {
      const updated = await prisma.product.update({
        where: { id: validated.id },
        data: {
          name: validated.name,
          skuCode: validated.skuCode,
          barcode: validated.barcode || null,
          subCategoryId: validated.subCategoryId,
          unitId: validated.unitId,
          costPrice: validated.costPrice,
          sellingPrice: validated.sellingPrice,
          minStockAlert: validated.minStockAlert,
          taxPercent: validated.taxPercent,
        },
      });
      revalidatePath("/inventory");
      revalidatePath("/pos");
      return { success: true, product: updated };
    } else {
      const created = await prisma.product.create({
        data: {
          name: validated.name,
          skuCode: validated.skuCode,
          barcode: validated.barcode || null,
          subCategoryId: validated.subCategoryId,
          unitId: validated.unitId,
          costPrice: validated.costPrice,
          sellingPrice: validated.sellingPrice,
          currentStock: validated.currentStock,
          minStockAlert: validated.minStockAlert,
          taxPercent: validated.taxPercent,
        },
      });
      revalidatePath("/inventory");
      revalidatePath("/pos");
      return { success: true, product: created };
    }
  } catch (error: any) {
    console.error("❌ Failed to save product:", error);
    return { success: false, error: error.message || "Failed to save product" };
  }
}

export async function adjustStock(payload: {
  productId: string;
  adjustmentType: StockAdjustmentType;
  quantityDelta: number; // Negative for damage/spoilage, positive for restock
  reasonNotes?: string;
  userId?: string;
}) {
  try {
    const product = await prisma.product.findUnique({ where: { id: payload.productId } });
    if (!product) throw new Error("Product not found");

    let userId = payload.userId;
    if (!userId) {
      const user = await prisma.user.findFirst();
      userId = user?.id || "00000000-0000-0000-0000-000000000000";
    }

    const previousStock = Number(product.currentStock);
    const newStock = Math.max(0, previousStock + payload.quantityDelta);

    await prisma.$transaction([
      prisma.product.update({
        where: { id: payload.productId },
        data: { currentStock: newStock },
      }),
      prisma.stockAdjustment.create({
        data: {
          productId: payload.productId,
          adjustmentType: payload.adjustmentType,
          quantityDelta: payload.quantityDelta,
          previousStock,
          newStock,
          reasonNotes: payload.reasonNotes || null,
          userId: userId!,
        },
      }),
    ]);

    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true, newStock };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
