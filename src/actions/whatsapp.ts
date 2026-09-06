"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  WhatsAppTemplateKey,
  renderWhatsAppTemplate,
  createWhatsAppUrl,
  WhatsAppTemplate,
} from "@/lib/whatsapp-templates";
import {
  getAllWhatsAppTemplates,
  getEffectiveTemplateText,
  saveTemplateCustomization,
  resetTemplateToDefault,
} from "@/lib/whatsapp-storage.server";

export interface BatchRecipientItem {
  id: string;
  type: "UDHAAR" | "JOB_PICKUP";
  title: string;
  subtitle: string;
  phone: string;
  amount: number;
  messageText: string;
  whatsappUrl: string;
  metadata?: Record<string, any>;
}

export async function getWhatsAppStudioData(): Promise<{
  templates: WhatsAppTemplate[];
  shopSettings: {
    shopName: string;
    phone1: string;
    addressLine1: string;
    upiId: string;
  };
}> {
  const templates = getAllWhatsAppTemplates();
  const settings = await prisma.shopSettings.findFirst();

  return {
    templates,
    shopSettings: {
      shopName: settings?.shopName || "Crystal Press",
      phone1: settings?.phone1 || "+91 98765 43210",
      addressLine1: settings?.addressLine1 || "Main Commercial Road, Shop #4",
      upiId: settings?.upiId || "crystalpress@icici",
    },
  };
}

export async function updateWhatsAppTemplateAction(key: WhatsAppTemplateKey, message: string) {
  try {
    const success = saveTemplateCustomization(key, message);
    if (!success) {
      return { success: false, error: "Failed to save template to storage" };
    }

    revalidatePath("/whatsapp");
    revalidatePath("/jobs");
    revalidatePath("/customers");
    revalidatePath("/pos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "An unexpected error occurred" };
  }
}

export async function resetWhatsAppTemplateAction(key: WhatsAppTemplateKey) {
  try {
    const success = resetTemplateToDefault(key);
    if (!success) {
      return { success: false, error: "Failed to reset template" };
    }

    revalidatePath("/whatsapp");
    revalidatePath("/jobs");
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "An unexpected error occurred" };
  }
}

export async function getBatchWhatsAppQueueAction(
  queueType: "OVERDUE_UDHAAR" | "READY_FOR_PICKUP"
): Promise<{
  success: boolean;
  recipients: BatchRecipientItem[];
  totalAmount: number;
  error?: string;
}> {
  try {
    const settings = await prisma.shopSettings.findFirst();
    const shopName = settings?.shopName || "Crystal Press";
    const shopPhone = settings?.phone1 || "+91 98765 43210";
    const shopAddress = settings?.addressLine1 || "Main Commercial Road, Shop #4";
    const upiId = settings?.upiId || "crystalpress@icici";

    if (queueType === "OVERDUE_UDHAAR") {
      // Find all active customers with outstanding balance > 0
      const customers = await prisma.customer.findMany({
        where: {
          currentBalance: { gt: 0 },
          isActive: true,
        },
        orderBy: {
          currentBalance: "desc",
        },
        take: 100,
      });

      const templateText = getEffectiveTemplateText("UDHAAR_REMINDER");
      let totalAmount = 0;

      const recipients: BatchRecipientItem[] = customers.map((c) => {
        const bal = Number(c.currentBalance) || 0;
        totalAmount += bal;

        const renderedMsg = renderWhatsAppTemplate(templateText, {
          CUSTOMER_NAME: c.name,
          CUSTOMER_PHONE: c.phone || "",
          BALANCE_DUE: bal.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
          UPI_ID: upiId,
          SHOP_NAME: shopName,
          SHOP_PHONE: shopPhone,
          SHOP_ADDRESS: shopAddress,
        });

        const waUrl = createWhatsAppUrl(c.phone, renderedMsg);

        return {
          id: c.id,
          type: "UDHAAR",
          title: c.name,
          subtitle: `Balance Due: ₹${bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
          phone: c.phone || "No Phone",
          amount: bal,
          messageText: renderedMsg,
          whatsappUrl: waUrl,
          metadata: {
            creditLimit: Number(c.creditLimit) || 0,
            address: c.address,
          },
        };
      });

      return { success: true, recipients, totalAmount };
    }

    if (queueType === "READY_FOR_PICKUP") {
      // Find all jobs ready for pickup
      const jobs = await prisma.jobOrder.findMany({
        where: {
          status: "READY_FOR_PICKUP",
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 100,
      });

      const templateText = getEffectiveTemplateText("READY_FOR_PICKUP");
      let totalAmount = 0;

      const recipients: BatchRecipientItem[] = jobs.map((job) => {
        const bal = Number(job.balanceDue) || 0;
        totalAmount += bal;

        const renderedMsg = renderWhatsAppTemplate(templateText, {
          CUSTOMER_NAME: job.customerName,
          CUSTOMER_PHONE: job.customerPhone || "",
          ORDER_NUMBER: job.jobOrderNumber,
          JOB_TYPE: job.jobType,
          QUANTITY: Number(job.quantity) || 1,
          UNIT: job.unitName || "pcs",
          BALANCE_DUE: bal.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
          TRACK_LINK: `http://localhost:3000/track/${job.jobOrderNumber}`,
          SHOP_NAME: shopName,
          SHOP_PHONE: shopPhone,
          SHOP_ADDRESS: shopAddress,
          UPI_ID: upiId,
        });

        const waUrl = createWhatsAppUrl(job.customerPhone, renderedMsg);

        return {
          id: job.id,
          type: "JOB_PICKUP",
          title: `${job.customerName} (${job.jobOrderNumber})`,
          subtitle: `${job.jobType} • ${job.quantity} ${job.unitName || "pcs"} • ₹${bal.toFixed(2)} Due`,
          phone: job.customerPhone || "No Phone",
          amount: bal,
          messageText: renderedMsg,
          whatsappUrl: waUrl,
          metadata: {
            jobOrderNumber: job.jobOrderNumber,
            jobType: job.jobType,
            quantity: job.quantity,
          },
        };
      });

      return { success: true, recipients, totalAmount };
    }

    return { success: true, recipients: [], totalAmount: 0 };
  } catch (error: any) {
    console.error("Batch WhatsApp queue error:", error);
    return { success: false, recipients: [], totalAmount: 0, error: error?.message || "Failed to load batch queue" };
  }
}
