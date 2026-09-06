"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const UnitSchema = z.object({
  code: z.string().min(1, "Unit code is required").toLowerCase().trim(),
  name: z.string().min(2, "Unit full name is required").trim(),
  allowsFraction: z.boolean().default(false),
});

export async function createUnit(payload: z.infer<typeof UnitSchema>) {
  try {
    const validated = UnitSchema.parse(payload);
    const existing = await prisma.unit.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return { success: false as const, error: `Unit code "${validated.code}" already exists.` };
    }

    const unit = await prisma.unit.create({
      data: {
        code: validated.code,
        name: validated.name,
        allowsFraction: validated.allowsFraction,
        isActive: true,
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true as const, unit };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to create unit of measure" };
  }
}

export async function deleteUnit(unitId: string) {
  try {
    const count = await prisma.product.count({
      where: { unitId },
    });

    if (count > 0) {
      return {
        success: false as const,
        error: `Cannot delete unit: ${count} products are currently using this unit of measure. Please reassign those products first.`,
      };
    }

    await prisma.unit.delete({
      where: { id: unitId },
    });

    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete unit" };
  }
}
