"use server";

import { prisma } from "@/lib/prisma";
import { QuotationStatus, JobStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializeShopSettings } from "@/lib/utils";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside Next.js request context
  }
}

/**
 * Fetches inventory products (paper stocks, materials, etc.) and customers for the calculator.
 */
export async function getCalculatorMasterData() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        skuCode: true,
        costPrice: true,
        sellingPrice: true,
        currentStock: true,
        taxPercent: true,
        unit: {
          select: { code: true, name: true },
        },
        subCategory: {
          select: { name: true },
        },
      },
    });

    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        currentBalance: true,
      },
    });

    const shopSettings = await prisma.shopSettings.findFirst();

    return {
      success: true as const,
      products: products.map((p) => ({
        ...p,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        currentStock: Number(p.currentStock),
        taxPercent: Number(p.taxPercent),
      })),
      customers: customers.map((c) => ({
        ...c,
        currentBalance: Number(c.currentBalance),
      })),
      shopSettings: serializeShopSettings(shopSettings),
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch calculator master data:", error);
    return { success: false as const, error: error.message || "Failed to load master data" };
  }
}

export interface ExportToQuotationInput {
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  validUntilDays?: number;
  itemTitle: string;
  specifications: Record<string, any>;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  netTotal: number;
  notes?: string | null;
  createdById?: string;
}

/**
 * Creates a formal customer Quotation directly from the Print Calculator.
 */
export async function createQuotationFromCalculator(payload: ExportToQuotationInput) {
  try {
    let userId = payload.createdById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.quotation.count();
    const quotationNumber = `QT-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (payload.validUntilDays || 15));

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: payload.customerId || null,
        customerName: payload.customerName || "Valued Customer",
        customerPhone: payload.customerPhone || null,
        customerEmail: payload.customerEmail || null,
        customerAddress: payload.customerAddress || null,
        quotationDate: new Date(),
        validUntil,
        subTotal: payload.subTotal,
        discountAmount: payload.discountAmount || 0,
        taxPercent: payload.taxPercent || 0,
        taxAmount: payload.taxAmount || 0,
        roundOff: 0,
        netTotal: payload.netTotal,
        status: QuotationStatus.DRAFT,
        notes: payload.notes || "Estimated via Crystal Press Imposition & Costing Calculator.",
        termsConditions:
          "1. 50% advance payment required to commence production.\n2. Final color may vary 5-10% from digital proofs.\n3. Delivery in 3-5 working days from proof approval.",
        createdById: userId!,
        items: {
          create: [
            {
              itemType: "CUSTOM_JOB",
              itemDescription: payload.itemTitle,
              specifications: payload.specifications,
              quantity: payload.quantity,
              unitName: "pcs",
              unitPrice: payload.unitPrice,
              discountAmount: payload.discountAmount || 0,
              taxPercent: payload.taxPercent || 0,
              taxAmount: payload.taxAmount || 0,
              lineTotal: payload.subTotal,
            },
          ],
        },
      },
    });

    safeRevalidatePath("/quotations");
    safeRevalidatePath("/calculator");
    return { success: true as const, quotation };
  } catch (error: any) {
    console.error("❌ Failed to create quotation from calculator:", error);
    return { success: false as const, error: error.message || "Failed to create quotation" };
  }
}

export interface ExportToJobOrderInput {
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  jobType: string;
  specifications: Record<string, any>;
  quantity: number;
  totalAmount: number;
  advancePaid: number;
  expectedDeliveryDays?: number;
  designNotes?: string | null;
  createdById?: string;
}

/**
 * Creates a live production Job Order directly from the Print Calculator.
 */
export async function createJobOrderFromCalculator(payload: ExportToJobOrderInput) {
  try {
    let userId = payload.createdById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.jobOrder.count();
    const jobOrderNumber = `JO-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + (payload.expectedDeliveryDays || 3));

    const balanceDue = Math.max(0, payload.totalAmount - (payload.advancePaid || 0));

    const job = await prisma.jobOrder.create({
      data: {
        jobOrderNumber,
        customerId: payload.customerId || null,
        customerName: payload.customerName || "Valued Customer",
        customerPhone: payload.customerPhone || null,
        jobType: payload.jobType,
        specifications: payload.specifications,
        quantity: payload.quantity,
        unitName: "pcs",
        totalAmount: payload.totalAmount,
        advancePaid: payload.advancePaid || 0,
        balanceDue,
        status: JobStatus.ORDER_PLACED,
        proofApproved: false,
        designNotes: payload.designNotes || "Created via Print Cost Estimator & Sheet Imposition Calculator.",
        expectedDeliveryDate,
        createdById: userId!,
      },
    });

    safeRevalidatePath("/jobs");
    safeRevalidatePath("/calculator");
    return { success: true as const, job };
  } catch (error: any) {
    console.error("❌ Failed to create job order from calculator:", error);
    return { success: false as const, error: error.message || "Failed to create job order" };
  }
}
