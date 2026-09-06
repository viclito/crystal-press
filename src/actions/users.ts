"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

const UserSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").toLowerCase(),
  password: z.string().min(4, "Password must be at least 4 characters").optional(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
});

export async function upsertUser(payload: z.infer<typeof UserSchema>) {
  try {
    const validated = UserSchema.parse(payload);
    const cleanUsername = validated.username.trim().toLowerCase();

    if (validated.id) {
      // Update existing user
      const existing = await prisma.user.findUnique({ where: { id: validated.id } });
      if (!existing) throw new Error("User not found");

      // Check if new username conflicts with someone else
      if (cleanUsername !== existing.username) {
        const duplicate = await prisma.user.findUnique({ where: { username: cleanUsername } });
        if (duplicate) throw new Error("Username already taken by another user");
      }

      const updated = await prisma.user.update({
        where: { id: validated.id },
        data: {
          fullName: validated.fullName,
          username: cleanUsername,
          role: validated.role,
          isActive: validated.isActive,
          passwordHash: validated.password ? validated.password : undefined,
        },
      });

      revalidatePath("/settings");
      return { success: true as const, user: updated };
    } else {
      // Create new user
      if (!validated.password) {
        throw new Error("Password is required for new accounts");
      }

      const duplicate = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (duplicate) throw new Error("Username already exists. Please choose a different username.");

      const created = await prisma.user.create({
        data: {
          fullName: validated.fullName,
          username: cleanUsername,
          passwordHash: validated.password,
          role: validated.role,
          isActive: true,
        },
      });

      revalidatePath("/settings");
      return { success: true as const, user: created };
    }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to save user account" };
  }
}

export async function deleteUser(userId: string) {
  try {
    // Check if user has invoices or job orders linked
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { invoices: true, jobOrders: true },
        },
      },
    });

    if (!user) throw new Error("User not found");

    // Prevent deleting the last Admin account
    if (user.role === UserRole.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } });
      if (adminCount <= 1) {
        throw new Error("Cannot delete the only active Admin/Owner account.");
      }
    }

    if (user._count.invoices > 0 || user._count.jobOrders > 0) {
      // Soft-deactivate if user has created historical invoices
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      revalidatePath("/settings");
      return { success: true as const, message: "User deactivated (preserved for audit logs)" };
    } else {
      // Hard delete if clean
      await prisma.user.delete({
        where: { id: userId },
      });
      revalidatePath("/settings");
      return { success: true as const, message: "User deleted successfully" };
    }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete user" };
  }
}
