"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ----------------------------------------------------
// SCHEMAS
// ----------------------------------------------------

const ExpenseCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Category name must be at least 2 characters").trim(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

const ExpenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Expense description is required").trim(),
  categoryId: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  expenseDate: z.string().optional(),
  recipient: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdById: z.string().optional(),
});

// Default seed categories for print shop operations
const DEFAULT_CATEGORIES = [
  { name: "Tea & Refreshments", color: "#F59E0B" },
  { name: "Electricity & Utilities", color: "#3B82F6" },
  { name: "Shop Rent", color: "#EC4899" },
  { name: "Machine Maintenance & Inks", color: "#8B5CF6" },
  { name: "Paper Transport / Delivery", color: "#10B981" },
  { name: "Staff Daily Wages", color: "#06B6D4" },
  { name: "General Shop Supplies", color: "#64748B" },
];

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore when invoked outside Next.js request context
  }
}

// ----------------------------------------------------
// EXPENSE CATEGORY ACTIONS
// ----------------------------------------------------

export async function getExpenseCategories() {
  try {
    let categories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });

    // Auto-seed default categories if database table is empty
    if (categories.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await prisma.expenseCategory.upsert({
          where: { name: cat.name },
          update: {},
          create: {
            name: cat.name,
            color: cat.color,
            isActive: true,
          },
        });
      }

      categories = await prisma.expenseCategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { expenses: true },
          },
        },
      });
    }

    return {
      success: true as const,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        isActive: c.isActive,
        createdAt: c.createdAt ? c.createdAt.toISOString() : null,
        _count: c._count,
      })),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to fetch expense categories" };
  }
}

export async function upsertExpenseCategory(payload: z.input<typeof ExpenseCategorySchema>) {
  try {
    const validated = ExpenseCategorySchema.parse(payload);

    let category;
    if (validated.id) {
      category = await prisma.expenseCategory.update({
        where: { id: validated.id },
        data: {
          name: validated.name,
          color: validated.color || "#64748B",
          isActive: validated.isActive ?? true,
        },
      });
    } else {
      category = await prisma.expenseCategory.create({
        data: {
          name: validated.name,
          color: validated.color || "#64748B",
          isActive: validated.isActive ?? true,
        },
      });
    }

    safeRevalidatePath("/expenses");
    return { success: true as const, category };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to save category" };
  }
}

export async function deleteExpenseCategory(categoryId: string) {
  try {
    const expenseCount = await prisma.expense.count({
      where: { categoryId },
    });

    if (expenseCount > 0) {
      await prisma.expenseCategory.update({
        where: { id: categoryId },
        data: { isActive: false },
      });
    } else {
      await prisma.expenseCategory.delete({
        where: { id: categoryId },
      });
    }

    safeRevalidatePath("/expenses");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete category" };
  }
}

// ----------------------------------------------------
// EXPENSE CRUD ACTIONS
// ----------------------------------------------------

export interface ExpenseFilterParams {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  search?: string;
}

export async function getExpenses(params: ExpenseFilterParams = {}) {
  try {
    const where: any = {};

    if (params.startDate || params.endDate) {
      where.expenseDate = {};
      if (params.startDate) {
        const start = new Date(params.startDate);
        start.setHours(0, 0, 0, 0);
        where.expenseDate.gte = start;
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    if (params.categoryId && params.categoryId !== "ALL") {
      where.categoryId = params.categoryId;
    }

    if (params.paymentMethod) {
      where.paymentMethod = params.paymentMethod;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { recipient: { contains: q, mode: "insensitive" } },
        { expenseNumber: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { expenseDate: "desc" },
    });

    // Compute Summary Totals
    let totalExpenseAmount = 0;
    let cashExpenseAmount = 0; // Petty Cash Outflow
    let upiExpenseAmount = 0;
    let cardExpenseAmount = 0;

    const categoryBreakdown: Record<string, { name: string; color: string; amount: number; count: number }> = {};

    expenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalExpenseAmount += amt;

      if (exp.paymentMethod === "CASH") cashExpenseAmount += amt;
      else if (exp.paymentMethod === "UPI") upiExpenseAmount += amt;
      else if (exp.paymentMethod === "CARD") cardExpenseAmount += amt;

      const catName = exp.category?.name || "General";
      const catColor = exp.category?.color || "#64748B";
      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { name: catName, color: catColor, amount: 0, count: 0 };
      }
      categoryBreakdown[catName].amount += amt;
      categoryBreakdown[catName].count += 1;
    });

    return {
      success: true as const,
      data: {
        expenses: expenses.map((e) => ({
          id: e.id,
          expenseNumber: e.expenseNumber,
          title: e.title,
          amount: Number(e.amount),
          paymentMethod: e.paymentMethod,
          expenseDate: e.expenseDate.toISOString(),
          recipient: e.recipient,
          notes: e.notes,
          categoryId: e.categoryId,
          categoryName: e.category?.name || "General",
          categoryColor: e.category?.color || "#64748B",
          createdByName: e.createdBy?.fullName || e.createdBy?.username || "Staff",
          createdAt: e.createdAt.toISOString(),
        })),
        summary: {
          totalExpenseAmount,
          cashExpenseAmount,
          upiExpenseAmount,
          cardExpenseAmount,
          totalCount: expenses.length,
          categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.amount - a.amount),
        },
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to fetch expenses" };
  }
}

export async function createExpense(payload: z.infer<typeof ExpenseSchema>) {
  try {
    const validated = ExpenseSchema.parse(payload);

    let userId = validated.createdById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    return await prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      const count = await tx.expense.count();
      const expenseNumber = `EXP-${currentYear}-${String(count + 1).padStart(4, "0")}`;

      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          categoryId: validated.categoryId,
          title: validated.title,
          amount: validated.amount,
          paymentMethod: validated.paymentMethod,
          expenseDate: validated.expenseDate ? new Date(validated.expenseDate) : new Date(),
          recipient: validated.recipient || null,
          notes: validated.notes || null,
          createdById: userId!,
        },
        include: {
          category: true,
          createdBy: true,
        },
      });

      safeRevalidatePath("/expenses");
      safeRevalidatePath("/reports");
      safeRevalidatePath("/");

      return {
        success: true as const,
        expense: {
          id: expense.id,
          expenseNumber: expense.expenseNumber,
          title: expense.title,
          amount: Number(expense.amount),
          paymentMethod: expense.paymentMethod,
          expenseDate: expense.expenseDate.toISOString(),
          recipient: expense.recipient,
          notes: expense.notes,
          categoryName: expense.category?.name || "General",
        },
      };
    });
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to record expense" };
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    safeRevalidatePath("/expenses");
    safeRevalidatePath("/reports");
    safeRevalidatePath("/");

    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete expense" };
  }
}
