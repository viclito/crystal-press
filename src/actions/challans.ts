"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ChallanStatus, DispatchMode, JobStatus } from "@prisma/client";
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

const ChallanItemSchema = z.object({
  id: z.string().optional(),
  itemDescription: z.string().min(1, "Item description is required").trim(),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitName: z.string().default("pcs"),
  hsnCode: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

const ChallanPayloadSchema = z.object({
  id: z.string().optional(),
  jobOrderId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required").trim(),
  customerPhone: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  dispatchDate: z.string().optional(),
  dispatchMode: z.nativeEnum(DispatchMode).default(DispatchMode.COMPANY_VEHICLE),
  transporterName: z.string().optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  lrNumber: z.string().optional().nullable(),
  packageCount: z.string().optional().nullable(),
  packagingNotes: z.string().optional().nullable(),
  status: z.nativeEnum(ChallanStatus).default(ChallanStatus.PREPARED),
  createdById: z.string().optional(),
  items: z.array(ChallanItemSchema).min(1, "At least one item is required for dispatch"),
});

export type ChallanItemInput = z.infer<typeof ChallanItemSchema>;
export type ChallanPayloadInput = z.infer<typeof ChallanPayloadSchema>;

// ----------------------------------------------------
// QUERY ACTIONS
// ----------------------------------------------------

export async function getDeliveryChallans(filters?: {
  status?: string;
  search?: string;
  dateRange?: string; // "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL"
  customerId?: string;
}) {
  try {
    const where: any = {};

    // 1. Status Filter
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status as ChallanStatus;
    }

    // 2. Customer Filter
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    // 3. Search Filter
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { challanNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { vehicleNumber: { contains: q, mode: "insensitive" } },
        { transporterName: { contains: q, mode: "insensitive" } },
        { lrNumber: { contains: q, mode: "insensitive" } },
        { items: { some: { itemDescription: { contains: q, mode: "insensitive" } } } },
      ];
    }

    // 4. Date Range Filter
    const now = new Date();
    if (filters?.dateRange === "TODAY") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      where.dispatchDate = { gte: startOfDay };
    } else if (filters?.dateRange === "THIS_WEEK") {
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0);
      where.dispatchDate = { gte: firstDayOfWeek };
    } else if (filters?.dateRange === "THIS_MONTH") {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      where.dispatchDate = { gte: firstDayOfMonth };
    }

    // Query Challans
    const challans = await prisma.deliveryChallan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        customer: {
          select: { id: true, name: true, phone: true, address: true },
        },
        jobOrder: {
          select: { id: true, jobOrderNumber: true, jobType: true, totalAmount: true },
        },
        createdBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    // Compute Metrics across all active challans
    const allChallans = await prisma.deliveryChallan.findMany({
      select: { status: true, dispatchDate: true },
    });

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const monthCount = allChallans.filter((c) => new Date(c.dispatchDate) >= startOfMonth).length;

    const metrics = {
      total: allChallans.length,
      inTransit: allChallans.filter((c) => c.status === ChallanStatus.IN_TRANSIT).length,
      delivered: allChallans.filter((c) => c.status === ChallanStatus.DELIVERED).length,
      prepared: allChallans.filter((c) => c.status === ChallanStatus.PREPARED).length,
      thisMonth: monthCount,
    };

    const formatted = challans.map((c) => ({
      ...c,
      dispatchDate: c.dispatchDate ? c.dispatchDate.toISOString() : new Date().toISOString(),
      receivedAt: c.receivedAt ? c.receivedAt.toISOString() : null,
      createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? c.updatedAt.toISOString() : null,
      totalQuantity: c.items.reduce((sum, it) => sum + Number(it.quantity), 0),
      items: c.items.map((it) => ({
        ...it,
        quantity: Number(it.quantity),
      })),
      jobOrder: c.jobOrder
        ? {
            ...c.jobOrder,
            totalAmount: Number(c.jobOrder.totalAmount),
          }
        : null,
    }));

    return {
      success: true as const,
      challans: formatted,
      metrics,
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch delivery challans:", error);
    return { success: false as const, error: error.message || "Failed to fetch delivery challans" };
  }
}

export async function getDeliveryChallanById(id: string) {
  try {
    const challan = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
        jobOrder: {
          include: {
            customer: true,
          },
        },
        createdBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    if (!challan) {
      return { success: false as const, error: "Delivery Challan not found" };
    }

    const settings = await prisma.shopSettings.findFirst();

    const formatted = {
      ...challan,
      dispatchDate: challan.dispatchDate ? challan.dispatchDate.toISOString() : new Date().toISOString(),
      receivedAt: challan.receivedAt ? challan.receivedAt.toISOString() : null,
      createdAt: challan.createdAt ? challan.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: challan.updatedAt ? challan.updatedAt.toISOString() : null,
      items: challan.items.map((it) => ({
        ...it,
        quantity: Number(it.quantity),
      })),
      jobOrder: challan.jobOrder
        ? {
            ...challan.jobOrder,
            totalAmount: Number(challan.jobOrder.totalAmount),
            advancePaid: Number(challan.jobOrder.advancePaid),
            balanceDue: Number(challan.jobOrder.balanceDue),
          }
        : null,
      shopSettings: serializeShopSettings(settings),
    };

    return { success: true as const, challan: formatted };
  } catch (error: any) {
    console.error("❌ Failed to fetch delivery challan by ID:", error);
    return { success: false as const, error: error.message || "Failed to fetch delivery challan details" };
  }
}

export async function getJobOrdersForChallan() {
  try {
    const jobs = await prisma.jobOrder.findMany({
      where: {
        status: {
          in: [
            JobStatus.READY_FOR_PICKUP,
            JobStatus.FINISHING,
            JobStatus.PRINTING,
            JobStatus.ORDER_PLACED,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, address: true },
        },
        deliveryChallans: {
          select: { id: true, challanNumber: true, status: true },
        },
      },
    });

    const formatted = jobs.map((j) => ({
      id: j.id,
      jobOrderNumber: j.jobOrderNumber,
      jobType: j.jobType,
      quantity: j.quantity,
      unitName: j.unitName,
      status: j.status,
      customerId: j.customerId,
      customerName: j.customerName,
      customerPhone: j.customerPhone,
      totalAmount: Number(j.totalAmount),
      balanceDue: Number(j.balanceDue),
      customerAddress: j.customer?.address || null,
      dispatchedCount: j.deliveryChallans.length,
    }));

    return { success: true as const, jobs: formatted };
  } catch (error: any) {
    console.error("❌ Failed to fetch job orders for challan:", error);
    return { success: false as const, error: error.message || "Failed to fetch jobs" };
  }
}

// ----------------------------------------------------
// MUTATION ACTIONS
// ----------------------------------------------------

export async function createDeliveryChallan(payload: ChallanPayloadInput) {
  try {
    const validated = ChallanPayloadSchema.parse(payload);

    // Get staff / admin user for attribution
    let userId = validated.createdById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) throw new Error("No staff user found to record delivery challan");
      userId = defaultUser.id;
    }

    // Auto-generate Challan Number: DC-YYYY-XXXX
    const settings = await prisma.shopSettings.findFirst();
    const prefix = settings?.challanPrefix || "DC";
    const currentYear = new Date().getFullYear();

    const count = await prisma.deliveryChallan.count();
    const sequence = String(count + 1).padStart(4, "0");
    const challanNumber = `${prefix}-${currentYear}-${sequence}`;

    const challan = await prisma.deliveryChallan.create({
      data: {
        challanNumber,
        jobOrderId: validated.jobOrderId || null,
        customerId: validated.customerId || null,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone || null,
        deliveryAddress: validated.deliveryAddress || null,
        dispatchDate: validated.dispatchDate ? new Date(validated.dispatchDate) : new Date(),
        dispatchMode: validated.dispatchMode,
        transporterName: validated.transporterName || null,
        vehicleNumber: validated.vehicleNumber || null,
        lrNumber: validated.lrNumber || null,
        packageCount: validated.packageCount || null,
        packagingNotes: validated.packagingNotes || null,
        status: validated.status,
        createdById: userId,
        items: {
          create: validated.items.map((it) => ({
            itemDescription: it.itemDescription,
            quantity: it.quantity,
            unitName: it.unitName,
            hsnCode: it.hsnCode || null,
            remarks: it.remarks || null,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
        jobOrder: true,
      },
    });

    safeRevalidatePath("/challans");
    safeRevalidatePath("/jobs");
    return { success: true as const, challan };
  } catch (error: any) {
    console.error("❌ Failed to create delivery challan:", error);
    return { success: false as const, error: error.message || "Failed to create delivery challan" };
  }
}

export async function updateDeliveryChallan(id: string, payload: ChallanPayloadInput) {
  try {
    const validated = ChallanPayloadSchema.parse(payload);

    const existing = await prisma.deliveryChallan.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false as const, error: "Challan not found" };
    }

    if (existing.status === ChallanStatus.DELIVERED) {
      return { success: false as const, error: "Cannot edit a challan that has already been delivered" };
    }

    const challan = await prisma.$transaction(async (tx) => {
      // 1. Delete old items
      await tx.deliveryChallanItem.deleteMany({
        where: { challanId: id },
      });

      // 2. Update Challan header and re-create items
      return await tx.deliveryChallan.update({
        where: { id },
        data: {
          jobOrderId: validated.jobOrderId || null,
          customerId: validated.customerId || null,
          customerName: validated.customerName,
          customerPhone: validated.customerPhone || null,
          deliveryAddress: validated.deliveryAddress || null,
          dispatchDate: validated.dispatchDate ? new Date(validated.dispatchDate) : existing.dispatchDate,
          dispatchMode: validated.dispatchMode,
          transporterName: validated.transporterName || null,
          vehicleNumber: validated.vehicleNumber || null,
          lrNumber: validated.lrNumber || null,
          packageCount: validated.packageCount || null,
          packagingNotes: validated.packagingNotes || null,
          status: validated.status,
          items: {
            create: validated.items.map((it) => ({
              itemDescription: it.itemDescription,
              quantity: it.quantity,
              unitName: it.unitName,
              hsnCode: it.hsnCode || null,
              remarks: it.remarks || null,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    });

    safeRevalidatePath("/challans");
    safeRevalidatePath("/jobs");
    return { success: true as const, challan };
  } catch (error: any) {
    console.error("❌ Failed to update delivery challan:", error);
    return { success: false as const, error: error.message || "Failed to update delivery challan" };
  }
}

export async function markChallanDelivered(payload: {
  id: string;
  receivedBy: string;
  receiverPhone?: string;
  receiverNotes?: string;
  receivedAt?: string;
}) {
  try {
    const { id, receivedBy, receiverPhone, receiverNotes, receivedAt } = payload;

    if (!receivedBy || !receivedBy.trim()) {
      return { success: false as const, error: "Receiver name is required" };
    }

    const challan = await prisma.deliveryChallan.update({
      where: { id },
      data: {
        status: ChallanStatus.DELIVERED,
        receivedBy: receivedBy.trim(),
        receiverPhone: receiverPhone?.trim() || null,
        receiverNotes: receiverNotes?.trim() || null,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      },
      include: {
        jobOrder: true,
      },
    });

    // If linked to a job order that is ready for pickup, mark the job order as delivered as well
    if (challan.jobOrderId && challan.jobOrder) {
      await prisma.jobOrder.update({
        where: { id: challan.jobOrderId },
        data: {
          status: JobStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });
    }

    safeRevalidatePath("/challans");
    safeRevalidatePath("/jobs");
    return { success: true as const, challan };
  } catch (error: any) {
    console.error("❌ Failed to mark challan delivered:", error);
    return { success: false as const, error: error.message || "Failed to update delivery status" };
  }
}

export async function updateChallanStatus(id: string, status: ChallanStatus) {
  try {
    const challan = await prisma.deliveryChallan.update({
      where: { id },
      data: { status },
    });

    safeRevalidatePath("/challans");
    safeRevalidatePath("/jobs");
    return { success: true as const, challan };
  } catch (error: any) {
    console.error("❌ Failed to update challan status:", error);
    return { success: false as const, error: error.message || "Failed to update status" };
  }
}

export async function deleteDeliveryChallan(id: string) {
  try {
    const existing = await prisma.deliveryChallan.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false as const, error: "Challan not found" };
    }

    if (existing.status === ChallanStatus.DELIVERED) {
      return { success: false as const, error: "Cannot delete a delivered challan. Mark it cancelled instead." };
    }

    await prisma.deliveryChallan.delete({
      where: { id },
    });

    safeRevalidatePath("/challans");
    safeRevalidatePath("/jobs");
    return { success: true as const };
  } catch (error: any) {
    console.error("❌ Failed to delete delivery challan:", error);
    return { success: false as const, error: error.message || "Failed to delete delivery challan" };
  }
}
