"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveDashboardWidgetConfig(config: any) {
  try {
    const setting = await prisma.shopSettings.findFirst();
    if (setting) {
      await prisma.shopSettings.update({
        where: { id: setting.id },
        data: {
          dashboardConfig: config,
        },
      });
    } else {
      await prisma.shopSettings.create({
        data: {
          dashboardConfig: config,
        },
      });
    }

    try {
      revalidatePath("/");
    } catch {}

    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to save dashboard widget config:", error);
    return { success: false as const, error: error.message || "Failed to save dashboard configuration" };
  }
}
