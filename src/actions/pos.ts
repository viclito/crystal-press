"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { InvoiceType, PaymentMethod, StockAdjustmentType } from "@prisma/client";
import { revalidatePath } from "next/cache";

const CartItemSchema = z.object({
  productId: z.string().uuid().optional(),
  skuCode: z.string(),
  name: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  costPrice: z.number().default(0),
  quantity: z.number().positive(),
  unitName: z.string().default("pcs"),
  discountAmount: z.number().default(0),
  taxPercent: z.number().default(0),
});

const CheckoutPayloadSchema = z.object({
  customerId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || typeof val !== "string" || !val.trim()) return null;
      const trimmed = val.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
      return isUuid ? trimmed : null;
    }),
  customerName: z.string().default("Walk-in Customer"),
  customerPhone: z.string().optional().nullable(),
  items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  subTotal: z.number().nonnegative(),
  discountAmount: z.number().default(0),
  taxAmount: z.number().default(0),
  roundOff: z.number().default(0),
  netTotal: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  transactionRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdById: z.string().uuid().optional(),
  pointsRedeemed: z.number().default(0).optional(),
  pointsDiscount: z.number().default(0).optional(),
  walletPaid: z.number().default(0).optional(),
});

export async function processCheckout(payload: z.input<typeof CheckoutPayloadSchema>) {
  try {
    const validated = CheckoutPayloadSchema.parse(payload);

    // Get an admin/cashier user ID fallback if not supplied
    let userId = validated.createdById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    const settings = await prisma.shopSettings.findFirst();
    const isLoyaltyEnabled = settings?.isLoyaltyEnabled ?? true;
    const spendPerPoint = Number(settings?.loyaltySpendPerPoint ?? 100);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate sequential invoice number
      const currentYear = new Date().getFullYear();
      const count = await tx.invoice.count();
      const invoiceNumber = `CP-${currentYear}-${String(count + 1).padStart(5, "0")}`;

      // 2. Atomic Stock Decrement & Stock Adjustment Logs
      for (const item of validated.items) {
        if (item.productId) {
          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
            },
            data: {
              currentStock: { decrement: item.quantity },
              version: { increment: 1 },
            },
          });

          if (updated.count > 0) {
            await tx.stockAdjustment.create({
              data: {
                productId: item.productId,
                adjustmentType: StockAdjustmentType.SALE_DEDUCTION,
                quantityDelta: -item.quantity,
                previousStock: 0,
                newStock: 0,
                reasonNotes: `POS Sale Invoice #${invoiceNumber}`,
                userId: userId!,
              },
            });
          }
        }
      }

      const balanceDue = Math.max(0, validated.netTotal - validated.paidAmount);

      let existingCustomer: any = null;
      if (validated.customerId) {
        existingCustomer = await tx.customer.findUnique({
          where: { id: validated.customerId },
        });
      }
      const activeCustomerId = existingCustomer ? existingCustomer.id : null;

      // Points calculation
      const pointsRedeemed = Math.max(0, Math.floor(validated.pointsRedeemed || 0));
      const pointsDiscount = Math.max(0, validated.pointsDiscount || 0);
      const walletPaid =
        validated.paymentMethod === PaymentMethod.WALLET
          ? validated.paidAmount
          : Math.max(0, validated.walletPaid || 0);

      // Points earned based on spendPerPoint
      const pointsEarned =
        isLoyaltyEnabled && activeCustomerId && spendPerPoint > 0
          ? Math.floor(validated.netTotal / spendPerPoint)
          : 0;

      // 3. Create Invoice Record
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceType: InvoiceType.POS_COUNTER,
          customerId: activeCustomerId,
          customerName: validated.customerName || "Walk-in Customer",
          customerPhone: validated.customerPhone || null,
          subTotal: validated.subTotal,
          discountAmount: validated.discountAmount,
          taxAmount: validated.taxAmount,
          roundOff: validated.roundOff,
          netTotal: validated.netTotal,
          paidAmount: validated.paidAmount,
          balanceDue,
          paymentMethod: validated.paymentMethod,
          notes: validated.notes || null,
          createdById: userId!,
          pointsEarned,
          pointsRedeemed,
          pointsDiscount,
          walletPaid,
          items: {
            create: validated.items.map((item) => ({
              productId: item.productId || null,
              itemDescription: item.name,
              unitName: item.unitName,
              quantity: item.quantity,
              unitCostPrice: item.costPrice,
              unitSalePrice: item.unitPrice,
              discountAmount: item.discountAmount,
              taxPercent: item.taxPercent,
              taxAmount: 0,
              lineTotal: item.quantity * item.unitPrice - item.discountAmount,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 4. Handle Customer Wallet & Loyalty Points Updates
      if (validated.customerId) {
        const cust = await tx.customer.findUnique({
          where: { id: validated.customerId },
        });

        if (cust) {
          let runningWallet = Number(cust.walletBalance);
          let runningPoints = cust.loyaltyPoints;

          // Deduct points redeemed
          if (pointsRedeemed > 0) {
            runningPoints = Math.max(0, runningPoints - pointsRedeemed);
            await tx.customerWalletTransaction.create({
              data: {
                customerId: cust.id,
                type: "POINTS_REDEEMED",
                amount: 0,
                points: -pointsRedeemed,
                runningWalletBalance: runningWallet,
                runningPointsBalance: runningPoints,
                referenceType: "INVOICE",
                referenceId: invoice.id,
                notes: `Redeemed ${pointsRedeemed} points for ₹${pointsDiscount.toFixed(2)} discount on Bill #${invoiceNumber}`,
              },
            });
          }

          // Deduct store credit wallet payment
          if (walletPaid > 0) {
            runningWallet = Math.max(0, runningWallet - walletPaid);
            await tx.customerWalletTransaction.create({
              data: {
                customerId: cust.id,
                type: "WALLET_PAYMENT",
                amount: -walletPaid,
                points: 0,
                runningWalletBalance: runningWallet,
                runningPointsBalance: runningPoints,
                referenceType: "INVOICE",
                referenceId: invoice.id,
                paymentMethod: PaymentMethod.WALLET,
                notes: `Paid ₹${walletPaid.toFixed(2)} via Store Credit Wallet on Bill #${invoiceNumber}`,
              },
            });
          }

          // Accrue new points earned
          if (pointsEarned > 0) {
            runningPoints += pointsEarned;
            await tx.customerWalletTransaction.create({
              data: {
                customerId: cust.id,
                type: "POINTS_ACCRUED",
                amount: 0,
                points: pointsEarned,
                runningWalletBalance: runningWallet,
                runningPointsBalance: runningPoints,
                referenceType: "INVOICE",
                referenceId: invoice.id,
                notes: `Earned ${pointsEarned} loyalty points from Bill #${invoiceNumber}`,
              },
            });
          }

          // Persist updated wallet and points to Customer record
          await tx.customer.update({
            where: { id: cust.id },
            data: {
              walletBalance: runningWallet,
              loyaltyPoints: runningPoints,
            },
          });
        }
      }

      // 5. If partial/credit (Udhaar), update customer balance and ledger
      if (balanceDue > 0 && validated.customerId) {
        const customer = await tx.customer.update({
          where: { id: validated.customerId },
          data: {
            currentBalance: { increment: balanceDue },
          },
        });

        await tx.customerLedger.create({
          data: {
            customerId: validated.customerId,
            referenceType: "INVOICE",
            referenceId: invoice.id,
            debitAmount: balanceDue,
            creditAmount: 0,
            runningBalance: customer.currentBalance,
            notes: `Invoice #${invoiceNumber} balance due`,
          },
        });
      }

      return {
        success: true as const,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone || undefined,
        netTotal: Number(invoice.netTotal),
        paidAmount: Number(invoice.paidAmount),
        balanceDue: Number(invoice.balanceDue),
        pointsEarned: Number(pointsEarned || 0),
        pointsRedeemed: Number(pointsRedeemed || 0),
        pointsDiscount: Number(pointsDiscount || 0),
        paymentMethod: invoice.paymentMethod,
        items: invoice.items.map((it) => ({
          name: it.itemDescription,
          quantity: Number(it.quantity),
          unitCostPrice: Number(it.unitCostPrice),
          unitSalePrice: Number(it.unitSalePrice),
          discountAmount: Number(it.discountAmount),
          taxPercent: Number(it.taxPercent),
          taxAmount: Number(it.taxAmount),
          lineTotal: Number(it.lineTotal),
          unitName: it.unitName,
        })),
        createdAt: invoice.createdAt.toISOString(),
      };
    });

    try {
      revalidatePath("/pos");
      revalidatePath("/customers");
    } catch {}

    return result;
  } catch (error: any) {
    console.error("POS processCheckout error:", error);
    if (error instanceof z.ZodError) {
      const formatted = error.errors
        .map((e) => `${e.path.join(".") || "field"}: ${e.message}`)
        .join(", ");
      return {
        success: false as const,
        error: formatted,
      };
    }
    return {
      success: false as const,
      error: error.message || "Failed to process checkout transaction",
    };
  }
}
