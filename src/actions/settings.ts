"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const SettingsSchema = z.object({
  id: z.string().uuid().optional(),
  shopName: z.string().min(1),
  tagline: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  phone1: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  upiPayeeName: z.string().optional().nullable(),
  invoicePrefix: z.string().default("CP").optional(),
  jobOrderPrefix: z.string().default("JO").optional(),
  receiptFooter: z.string().optional().nullable(),
  termsConditions: z.string().optional().nullable(),
  defaultTaxRate: z.number().default(0),
  isTaxEnabled: z.boolean().default(false),
  isLoyaltyEnabled: z.boolean().default(true).optional(),
  loyaltySpendPerPoint: z.number().default(100).optional(),
  loyaltyPointValue: z.number().default(1).optional(),
  maxLoyaltyDiscountPercent: z.number().default(50).optional(),
  loyaltyDiscountType: z.enum(["RUPEES", "PERCENT"]).default("RUPEES").optional(),
});

export async function updateShopSettings(payload: z.infer<typeof SettingsSchema>) {
  try {
    const validated = SettingsSchema.parse(payload);

    let setting = await prisma.shopSettings.findFirst();

    if (setting) {
      setting = await prisma.shopSettings.update({
        where: { id: setting.id },
        data: validated,
      });
    } else {
      setting = await prisma.shopSettings.create({
        data: validated,
      });
    }

    revalidatePath("/settings");
    revalidatePath("/pos");
    return { success: true, setting };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
