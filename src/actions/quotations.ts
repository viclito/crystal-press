"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { QuotationStatus, JobStatus, InvoiceType, PaymentMethod, StockAdjustmentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { serializeShopSettings } from "@/lib/utils";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore when invoked outside Next.js request context
  }
}

// ----------------------------------------------------
// SCHEMAS
// ----------------------------------------------------

const QuotationItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().uuid().optional().nullable(),
  itemType: z.enum(["CUSTOM_JOB", "INVENTORY_PRODUCT", "SERVICE"]).default("CUSTOM_JOB"),
  itemDescription: z.string().min(1, "Description is required").trim(),
  specifications: z.record(z.any()).optional().nullable(),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitName: z.string().default("pcs"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  discountAmount: z.number().default(0),
  taxPercent: z.number().default(0),
  taxAmount: z.number().default(0),
  lineTotal: z.number().nonnegative("Line total cannot be negative"),
});

const QuotationPayloadSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required").trim(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  quotationDate: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  subTotal: z.number().nonnegative(),
  discountAmount: z.number().default(0),
  taxPercent: z.number().default(0),
  taxAmount: z.number().default(0),
  roundOff: z.number().default(0),
  netTotal: z.number().nonnegative(),
  status: z.nativeEnum(QuotationStatus).default(QuotationStatus.DRAFT),
  termsConditions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdById: z.string().optional(),
  items: z.array(QuotationItemSchema).min(1, "Quotation must have at least one line item"),
});

export type QuotationItemInput = z.infer<typeof QuotationItemSchema>;
export type QuotationPayloadInput = z.infer<typeof QuotationPayloadSchema>;

// ----------------------------------------------------
// QUOTATION QUERY ACTIONS
// ----------------------------------------------------

export async function getQuotations(filters?: {
  status?: string;
  search?: string;
  dateRange?: string; // "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL"
  customerId?: string;
}) {
  try {
    const where: any = {};

    // 1. Status Filter
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status as QuotationStatus;
    }

    // 2. Customer ID Filter
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    // 3. Search Filter
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { quotationNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { items: { some: { itemDescription: { contains: q, mode: "insensitive" } } } },
      ];
    }

    // 4. Date Range Filter
    const now = new Date();
    if (filters?.dateRange === "TODAY") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      where.quotationDate = { gte: startOfDay };
    } else if (filters?.dateRange === "THIS_WEEK") {
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0);
      where.quotationDate = { gte: firstDayOfWeek };
    } else if (filters?.dateRange === "THIS_MONTH") {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      where.quotationDate = { gte: firstDayOfMonth };
    }

    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            currentBalance: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                skuCode: true,
                currentStock: true,
              },
            },
          },
        },
      },
    });

    // Compute Summary KPIs
    const allQuotesForKpi = await prisma.quotation.findMany({
      select: {
        id: true,
        status: true,
        netTotal: true,
        validUntil: true,
      },
    });

    const totalQuotes = allQuotesForKpi.length;
    const totalValue = allQuotesForKpi.reduce((sum, q) => sum + Number(q.netTotal || 0), 0);

    const openQuotes = allQuotesForKpi.filter(
      (q) => q.status === QuotationStatus.DRAFT || q.status === QuotationStatus.SENT
    );
    const openQuotesCount = openQuotes.length;
    const openQuotesValue = openQuotes.reduce((sum, q) => sum + Number(q.netTotal || 0), 0);

    const convertedQuotes = allQuotesForKpi.filter((q) => q.status === QuotationStatus.CONVERTED);
    const convertedCount = convertedQuotes.length;
    const convertedValue = convertedQuotes.reduce((sum, q) => sum + Number(q.netTotal || 0), 0);

    const acceptedQuotes = allQuotesForKpi.filter((q) => q.status === QuotationStatus.ACCEPTED);
    const acceptedCount = acceptedQuotes.length;

    const conversionRate =
      totalQuotes > 0 ? ((convertedCount + acceptedCount) / totalQuotes) * 100 : 0;

    return {
      success: true as const,
      quotations: quotations.map((q) => ({
        ...q,
        subTotal: Number(q.subTotal),
        discountAmount: Number(q.discountAmount),
        taxPercent: Number(q.taxPercent),
        taxAmount: Number(q.taxAmount),
        roundOff: Number(q.roundOff),
        netTotal: Number(q.netTotal),
        quotationDate: q.quotationDate ? q.quotationDate.toISOString() : null,
        validUntil: q.validUntil ? q.validUntil.toISOString() : null,
        createdAt: q.createdAt ? q.createdAt.toISOString() : null,
        updatedAt: q.updatedAt ? q.updatedAt.toISOString() : null,
        customer: q.customer
          ? {
              ...q.customer,
              currentBalance: Number(q.customer.currentBalance || 0),
            }
          : null,
        items: q.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discountAmount: Number(it.discountAmount),
          taxPercent: Number(it.taxPercent),
          taxAmount: Number(it.taxAmount),
          lineTotal: Number(it.lineTotal),
          product: it.product
            ? { ...it.product, currentStock: Number(it.product.currentStock) }
            : null,
        })),
      })),
      kpis: {
        totalQuotes,
        totalValue,
        openQuotesCount,
        openQuotesValue,
        convertedCount,
        convertedValue,
        acceptedCount,
        conversionRate,
      },
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch quotations:", error);
    return { success: false as const, error: error.message || "Failed to fetch quotations" };
  }
}

export async function getQuotationById(id: string) {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                skuCode: true,
                barcode: true,
                currentStock: true,
                sellingPrice: true,
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      return { success: false as const, error: "Quotation not found" };
    }

    const settings = await prisma.shopSettings.findFirst();

    return {
      success: true as const,
      quotation: {
        ...quotation,
        subTotal: Number(quotation.subTotal),
        discountAmount: Number(quotation.discountAmount),
        taxPercent: Number(quotation.taxPercent),
        taxAmount: Number(quotation.taxAmount),
        roundOff: Number(quotation.roundOff),
        netTotal: Number(quotation.netTotal),
        quotationDate: quotation.quotationDate ? quotation.quotationDate.toISOString() : null,
        validUntil: quotation.validUntil ? quotation.validUntil.toISOString() : null,
        createdAt: quotation.createdAt ? quotation.createdAt.toISOString() : null,
        updatedAt: quotation.updatedAt ? quotation.updatedAt.toISOString() : null,
        customer: quotation.customer
          ? {
              ...quotation.customer,
              currentBalance: Number(quotation.customer.currentBalance || 0),
              creditLimit: Number(quotation.customer.creditLimit || 0),
              createdAt: quotation.customer.createdAt ? quotation.customer.createdAt.toISOString() : null,
            }
          : null,
        items: quotation.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discountAmount: Number(it.discountAmount),
          taxPercent: Number(it.taxPercent),
          taxAmount: Number(it.taxAmount),
          lineTotal: Number(it.lineTotal),
          product: it.product
            ? {
                ...it.product,
                currentStock: Number(it.product.currentStock),
                sellingPrice: Number(it.product.sellingPrice),
              }
            : null,
        })),
      },
      shopSettings: serializeShopSettings(settings),
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch quotation details:", error);
    return { success: false as const, error: error.message || "Failed to fetch quotation details" };
  }
}

// ----------------------------------------------------
// CREATE & UPDATE QUOTATIONS
// ----------------------------------------------------

export async function createQuotation(payload: QuotationPayloadInput) {
  try {
    const validated = QuotationPayloadSchema.parse(payload);

    let userId = validated.createdById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    // Auto-generate sequential Quotation number: QT-2026-0001
    const currentYear = new Date().getFullYear();
    const count = await prisma.quotation.count();
    const quotationNumber = `QT-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: validated.customerId || null,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone || null,
        customerEmail: validated.customerEmail || null,
        customerAddress: validated.customerAddress || null,
        quotationDate: validated.quotationDate ? new Date(validated.quotationDate) : new Date(),
        validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
        subTotal: validated.subTotal,
        discountAmount: validated.discountAmount,
        taxPercent: validated.taxPercent,
        taxAmount: validated.taxAmount,
        roundOff: validated.roundOff,
        netTotal: validated.netTotal,
        status: validated.status,
        termsConditions: validated.termsConditions || null,
        notes: validated.notes || null,
        createdById: userId!,
        items: {
          create: validated.items.map((it) => ({
            productId: it.productId || null,
            itemType: it.itemType,
            itemDescription: it.itemDescription,
            specifications: it.specifications || undefined,
            quantity: it.quantity,
            unitName: it.unitName || "pcs",
            unitPrice: it.unitPrice,
            discountAmount: it.discountAmount,
            taxPercent: it.taxPercent,
            taxAmount: it.taxAmount,
            lineTotal: it.lineTotal,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    safeRevalidatePath("/quotations");
    return { success: true as const, quotation };
  } catch (error: any) {
    console.error("❌ Failed to create quotation:", error);
    return { success: false as const, error: error.message || "Failed to create quotation" };
  }
}

export async function updateQuotation(id: string, payload: QuotationPayloadInput) {
  try {
    const validated = QuotationPayloadSchema.parse(payload);

    // Delete old items and insert updated items in a transaction
    const quotation = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      return await tx.quotation.update({
        where: { id },
        data: {
          customerId: validated.customerId || null,
          customerName: validated.customerName,
          customerPhone: validated.customerPhone || null,
          customerEmail: validated.customerEmail || null,
          customerAddress: validated.customerAddress || null,
          quotationDate: validated.quotationDate ? new Date(validated.quotationDate) : undefined,
          validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
          subTotal: validated.subTotal,
          discountAmount: validated.discountAmount,
          taxPercent: validated.taxPercent,
          taxAmount: validated.taxAmount,
          roundOff: validated.roundOff,
          netTotal: validated.netTotal,
          status: validated.status,
          termsConditions: validated.termsConditions || null,
          notes: validated.notes || null,
          items: {
            create: validated.items.map((it) => ({
              productId: it.productId || null,
              itemType: it.itemType,
              itemDescription: it.itemDescription,
              specifications: it.specifications || undefined,
              quantity: it.quantity,
              unitName: it.unitName || "pcs",
              unitPrice: it.unitPrice,
              discountAmount: it.discountAmount,
              taxPercent: it.taxPercent,
              taxAmount: it.taxAmount,
              lineTotal: it.lineTotal,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    });

    safeRevalidatePath("/quotations");
    return { success: true as const, quotation };
  } catch (error: any) {
    console.error("❌ Failed to update quotation:", error);
    return { success: false as const, error: error.message || "Failed to update quotation" };
  }
}

export async function deleteQuotation(id: string) {
  try {
    await prisma.quotation.delete({
      where: { id },
    });

    safeRevalidatePath("/quotations");
    return { success: true as const };
  } catch (error: any) {
    console.error("❌ Failed to delete quotation:", error);
    return { success: false as const, error: error.message || "Failed to delete quotation" };
  }
}

export async function updateQuotationStatus(id: string, status: QuotationStatus) {
  try {
    const updated = await prisma.quotation.update({
      where: { id },
      data: { status },
    });

    safeRevalidatePath("/quotations");
    return { success: true as const, quotation: updated };
  } catch (error: any) {
    console.error("❌ Failed to update quotation status:", error);
    return { success: false as const, error: error.message || "Failed to update status" };
  }
}

// ----------------------------------------------------
// 1-CLICK CONVERSION WORKFLOWS
// ----------------------------------------------------

/**
 * Convert an approved Quotation directly into a live Job Order
 */
export async function convertQuotationToJobOrder(quotationId: string, advancePaid = 0) {
  try {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: true,
      },
    });

    if (!quote) {
      return { success: false as const, error: "Quotation not found" };
    }

    // Determine primary print job specs from line items
    const primaryItem = quote.items[0] || {
      itemDescription: "Custom Printing Order",
      specifications: {},
      quantity: 1,
      unitName: "pcs",
      lineTotal: quote.netTotal,
    };

    const count = await prisma.jobOrder.count();
    const currentYear = new Date().getFullYear();
    const jobOrderNumber = `JO-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const totalAmount = Number(quote.netTotal);
    const balanceDue = Math.max(0, totalAmount - advancePaid);

    // Merge specifications from all items if multiple
    const combinedSpecs: Record<string, any> = {
      fromQuotation: quote.quotationNumber,
      itemCount: quote.items.length,
      itemsSummary: quote.items.map((it) => `${it.quantity} ${it.unitName} - ${it.itemDescription}`).join("; "),
      ...(typeof primaryItem.specifications === "object" ? (primaryItem.specifications as any) : {}),
    };

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Job Order
      const job = await tx.jobOrder.create({
        data: {
          jobOrderNumber,
          customerId: quote.customerId || null,
          customerName: quote.customerName,
          customerPhone: quote.customerPhone || null,
          jobType: primaryItem.itemDescription || "Custom Job Order",
          specifications: combinedSpecs,
          quantity: Math.round(Number(primaryItem.quantity)) || 1,
          unitName: primaryItem.unitName || "pcs",
          totalAmount,
          advancePaid,
          balanceDue,
          status: JobStatus.ORDER_PLACED,
          designNotes: `Generated from Quotation #${quote.quotationNumber}.${quote.notes ? " Notes: " + quote.notes : ""}`,
          createdById: quote.createdById,
        },
      });

      // 2. Mark Quotation as CONVERTED
      await tx.quotation.update({
        where: { id: quote.id },
        data: {
          status: QuotationStatus.CONVERTED,
          convertedType: "JOB_ORDER",
          convertedId: job.id,
          convertedNumber: job.jobOrderNumber,
        },
      });

      return job;
    });

    safeRevalidatePath("/quotations");
    safeRevalidatePath("/jobs");
    return { success: true as const, job: result };
  } catch (error: any) {
    console.error("❌ Failed to convert quotation to job order:", error);
    return { success: false as const, error: error.message || "Failed to convert to job order" };
  }
}

/**
 * Convert an approved Quotation directly into a completed Tax / POS Invoice
 */
export async function convertQuotationToInvoice(
  quotationId: string,
  options?: {
    paymentMethod?: PaymentMethod;
    paidAmount?: number;
    notes?: string;
  }
) {
  try {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: true,
      },
    });

    if (!quote) {
      return { success: false as const, error: "Quotation not found" };
    }

    const currentYear = new Date().getFullYear();
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `CP-${currentYear}-${String(invoiceCount + 1).padStart(5, "0")}`;

    const paymentMethod = options?.paymentMethod || PaymentMethod.CASH;
    const netTotal = Number(quote.netTotal);
    const paidAmount = options?.paidAmount !== undefined ? options.paidAmount : netTotal;
    const balanceDue = Math.max(0, netTotal - paidAmount);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrement Stock for any linked inventory products
      for (const item of quote.items) {
        if (item.productId) {
          const qty = Number(item.quantity);
          const updated = await tx.product.updateMany({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: qty },
              version: { increment: 1 },
            },
          });

          if (updated.count > 0) {
            await tx.stockAdjustment.create({
              data: {
                productId: item.productId,
                adjustmentType: StockAdjustmentType.SALE_DEDUCTION,
                quantityDelta: -qty,
                previousStock: 0,
                newStock: 0,
                reasonNotes: `Converted from Quotation #${quote.quotationNumber} to Invoice #${invoiceNumber}`,
                userId: quote.createdById,
              },
            });
          }
        }
      }

      // 2. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceType: InvoiceType.DESKTOP_DETAILED,
          customerId: quote.customerId || null,
          customerName: quote.customerName,
          customerPhone: quote.customerPhone || null,
          subTotal: quote.subTotal,
          discountAmount: quote.discountAmount,
          taxAmount: quote.taxAmount,
          roundOff: quote.roundOff,
          netTotal: quote.netTotal,
          paidAmount,
          balanceDue,
          paymentMethod,
          notes: `Converted from Quotation #${quote.quotationNumber}.${options?.notes ? " " + options.notes : ""}`,
          createdById: quote.createdById,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId || null,
              itemDescription: item.itemDescription,
              unitName: item.unitName,
              quantity: item.quantity,
              unitCostPrice: 0,
              unitSalePrice: item.unitPrice,
              discountAmount: item.discountAmount,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 3. Update Customer Udhaar balance if partial / credit payment
      if (balanceDue > 0 && quote.customerId) {
        await tx.customer.update({
          where: { id: quote.customerId },
          data: {
            currentBalance: { increment: balanceDue },
          },
        });

        await tx.customerLedger.create({
          data: {
            customerId: quote.customerId,
            referenceType: "INVOICE",
            referenceId: invoice.id,
            debitAmount: balanceDue,
            creditAmount: 0,
            runningBalance: 0,
            notes: `Converted from Quotation #${quote.quotationNumber} (Invoice #${invoiceNumber})`,
          },
        });
      }

      // 4. Mark Quotation as CONVERTED
      await tx.quotation.update({
        where: { id: quote.id },
        data: {
          status: QuotationStatus.CONVERTED,
          convertedType: "INVOICE",
          convertedId: invoice.id,
          convertedNumber: invoice.invoiceNumber,
        },
      });

      return invoice;
    });

    safeRevalidatePath("/quotations");
    safeRevalidatePath("/pos");
    safeRevalidatePath("/reports");
    safeRevalidatePath("/inventory");
    if (quote.customerId) safeRevalidatePath("/customers");

    return { success: true as const, invoice: result };
  } catch (error: any) {
    console.error("❌ Failed to convert quotation to invoice:", error);
    return { success: false as const, error: error.message || "Failed to convert to invoice" };
  }
}
