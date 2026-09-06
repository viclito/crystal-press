"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PaymentMethod } from "@prisma/client";

// ----------------------------------------------------
// SCHEMAS
// ----------------------------------------------------

const VendorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Vendor name must be at least 2 characters").trim(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const PurchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitCostPrice: z.number().nonnegative("Cost price cannot be negative"),
});

const PurchaseOrderSchema = z.object({
  vendorId: z.string().min(1, "Supplier/Vendor is required"),
  vendorBillNo: z.string().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
  updateProductCostPrice: z.boolean().default(true),
  items: z.array(PurchaseOrderItemSchema).min(1, "At least 1 item is required"),
  paidAmount: z.number().nonnegative().default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  transactionRef: z.string().optional(),
});

const VendorPaymentSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionRef: z.string().optional(),
});

// ----------------------------------------------------
// VENDOR CRUD ACTIONS
// ----------------------------------------------------

export async function upsertVendor(payload: z.infer<typeof VendorSchema>) {
  try {
    const validated = VendorSchema.parse(payload);

    let vendor;
    if (validated.id) {
      vendor = await prisma.vendor.update({
        where: { id: validated.id },
        data: {
          name: validated.name,
          contactPerson: validated.contactPerson || null,
          phone: validated.phone || null,
          address: validated.address || null,
        },
      });
    } else {
      vendor = await prisma.vendor.create({
        data: {
          name: validated.name,
          contactPerson: validated.contactPerson || null,
          phone: validated.phone || null,
          address: validated.address || null,
          outstandingBalance: 0,
          isActive: true,
        },
      });
    }

    revalidatePath("/purchases");
    return { success: true as const, vendor };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to save vendor" };
  }
}

export async function deleteVendor(vendorId: string) {
  try {
    const poCount = await prisma.purchaseOrder.count({
      where: { vendorId },
    });

    if (poCount > 0) {
      // Soft-delete if has history
      await prisma.vendor.update({
        where: { id: vendorId },
        data: { isActive: false },
      });
    } else {
      await prisma.vendor.delete({
        where: { id: vendorId },
      });
    }

    revalidatePath("/purchases");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete vendor" };
  }
}

// ----------------------------------------------------
// RECORD INWARD PURCHASE ORDER (RESTOCKING)
// ----------------------------------------------------

export async function recordPurchaseOrder(payload: z.infer<typeof PurchaseOrderSchema>) {
  try {
    const validated = PurchaseOrderSchema.parse(payload);

    return await prisma.$transaction(async (tx) => {
      // 1. Generate unique PO Number
      const count = await tx.purchaseOrder.count();
      const currentYear = new Date().getFullYear();
      const poNumber = `PO-${currentYear}-${String(count + 1).padStart(4, "0")}`;

      // 2. Calculate Line Totals and Total Amount
      let totalAmount = 0;
      const orderItemsData = validated.items.map((item) => {
        const lineTotal = Number(item.quantity) * Number(item.unitCostPrice);
        totalAmount += lineTotal;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitCostPrice: item.unitCostPrice,
          lineTotal,
        };
      });

      const paidAmount = Math.min(Number(validated.paidAmount || 0), totalAmount);
      const balanceDue = totalAmount - paidAmount;

      // 3. Create the Purchase Order
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          poNumber,
          vendorId: validated.vendorId,
          vendorBillNo: validated.vendorBillNo || null,
          totalAmount,
          paidAmount,
          purchaseDate: validated.purchaseDate ? new Date(validated.purchaseDate) : new Date(),
          notes: validated.notes || null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          vendor: true,
        },
      });

      // 4. Update Product Stock and Optionally Cost Price
      for (const item of validated.items) {
        const updateData: any = {
          currentStock: {
            increment: item.quantity,
          },
        };

        if (validated.updateProductCostPrice && item.unitCostPrice > 0) {
          updateData.costPrice = item.unitCostPrice;
        }

        await tx.product.update({
          where: { id: item.productId },
          data: updateData,
        });
      }

      // 5. Update Vendor Outstanding Balance
      if (balanceDue > 0) {
        await tx.vendor.update({
          where: { id: validated.vendorId },
          data: {
            outstandingBalance: {
              increment: balanceDue,
            },
          },
        });
      }

      // 6. Record Vendor Payment if upfront payment was made
      if (paidAmount > 0) {
        await tx.vendorPayment.create({
          data: {
            vendorId: validated.vendorId,
            amount: paidAmount,
            paymentMethod: validated.paymentMethod,
            transactionRef: validated.transactionRef || `Paid against ${poNumber}`,
          },
        });
      }

      revalidatePath("/purchases");
      revalidatePath("/inventory");
      revalidatePath("/pos");
      revalidatePath("/");

      return {
        success: true as const,
        purchaseOrder,
        poNumber,
        totalAmount,
        paidAmount,
        balanceDue,
      };
    });
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to record purchase order" };
  }
}

// ----------------------------------------------------
// VENDOR PAYMENT SETTLEMENT
// ----------------------------------------------------

export async function recordVendorPayment(payload: z.infer<typeof VendorPaymentSchema>) {
  try {
    const validated = VendorPaymentSchema.parse(payload);

    return await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({
        where: { id: validated.vendorId },
      });

      if (!vendor) {
        throw new Error("Vendor not found");
      }

      // 1. Create Payment Record
      const payment = await tx.vendorPayment.create({
        data: {
          vendorId: validated.vendorId,
          amount: validated.amount,
          paymentMethod: validated.paymentMethod,
          transactionRef: validated.transactionRef || null,
        },
      });

      // 2. Reduce Vendor's Outstanding Balance
      const updatedVendor = await tx.vendor.update({
        where: { id: validated.vendorId },
        data: {
          outstandingBalance: {
            decrement: validated.amount,
          },
        },
      });

      revalidatePath("/purchases");
      return { success: true as const, payment, updatedVendor };
    });
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to record vendor payment" };
  }
}
