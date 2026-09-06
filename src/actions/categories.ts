"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Category name must be at least 2 characters"),
  displayOrder: z.number().default(0),
});

const SubCategorySchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().min(2, "Subcategory name must be at least 2 characters"),
  displayOrder: z.number().default(0),
});

export async function createCategory(name: string, displayOrder = 0) {
  try {
    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        slug,
        displayOrder,
        subCategories: {
          create: [{ name: "Standard", slug: "standard", displayOrder: 0 }],
        },
      },
      include: { subCategories: true },
    });

    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true as const, category };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to create category" };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const count = await prisma.product.count({
      where: { subCategory: { categoryId } },
    });

    if (count > 0) {
      return {
        success: false as const,
        error: `Cannot delete category: ${count} products are currently assigned to this category. Please reassign them first.`,
      };
    }

    await prisma.category.delete({ where: { id: categoryId } });

    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete category" };
  }
}

export async function createSubCategory(categoryId: string, name: string) {
  try {
    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const subCategory = await prisma.subCategory.create({
      data: {
        categoryId,
        name: cleanName,
        slug,
      },
    });

    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true as const, subCategory };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to create subcategory" };
  }
}

export async function deleteSubCategory(subCategoryId: string) {
  try {
    const count = await prisma.product.count({
      where: { subCategoryId },
    });

    if (count > 0) {
      return {
        success: false as const,
        error: `Cannot delete subcategory: ${count} products are currently assigned to it.`,
      };
    }

    await prisma.subCategory.delete({ where: { id: subCategoryId } });

    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete subcategory" };
  }
}
