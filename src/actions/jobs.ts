"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { JobStatus, InvoiceType, PaymentMethod, StockAdjustmentType } from "@prisma/client";
import { revalidatePath } from "next/cache";

const JobOrderSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional().nullable(),
  jobType: z.string().min(1, "Job type is required"),
  specifications: z.record(z.any()),
  quantity: z.number().int().positive(),
  unitName: z.string().default("pcs"),
  totalAmount: z.number().nonnegative(),
  advancePaid: z.number().default(0),
  expectedDeliveryDate: z.string().optional().nullable(),
  designNotes: z.string().optional().nullable(),
  createdById: z.string().uuid().optional(),
});

export async function createJobOrder(payload: z.infer<typeof JobOrderSchema>) {
  try {
    const validated = JobOrderSchema.parse(payload);

    let userId = validated.createdById;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    const count = await prisma.jobOrder.count();
    const currentYear = new Date().getFullYear();
    const jobOrderNumber = `JO-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const balanceDue = Math.max(0, validated.totalAmount - validated.advancePaid);

    const job = await prisma.jobOrder.create({
      data: {
        jobOrderNumber,
        customerId: validated.customerId || null,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone || null,
        jobType: validated.jobType,
        specifications: validated.specifications,
        quantity: validated.quantity,
        unitName: validated.unitName,
        totalAmount: validated.totalAmount,
        advancePaid: validated.advancePaid,
        balanceDue,
        status: JobStatus.ORDER_PLACED,
        designNotes: validated.designNotes || null,
        expectedDeliveryDate: validated.expectedDeliveryDate ? new Date(validated.expectedDeliveryDate) : null,
        createdById: userId!,
      },
    });

    revalidatePath("/jobs");
    return { success: true as const, job };
  } catch (error: any) {
    console.error("❌ Failed to create Job Order:", error);
    return { success: false as const, error: error.message || "Failed to create job order" };
  }
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  try {
    const updated = await prisma.jobOrder.update({
      where: { id: jobId },
      data: {
        status,
        proofApproved: status === JobStatus.PRINTING || status === JobStatus.READY_FOR_PICKUP || status === JobStatus.DELIVERED ? true : undefined,
        proofApprovedAt: status === JobStatus.PRINTING ? new Date() : undefined,
        deliveredAt: status === JobStatus.DELIVERED ? new Date() : undefined,
      },
    });

    revalidatePath("/jobs");
    return { success: true as const, job: updated };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function convertJobToFinalBill(jobId: string, paymentMethod: PaymentMethod = PaymentMethod.CASH) {
  try {
    const job = await prisma.jobOrder.findUnique({
      where: { id: jobId },
      include: { customer: true },
    });

    if (!job) throw new Error("Job order not found");

    const result = await prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      const count = await tx.invoice.count();
      const invoiceNumber = `CP-${currentYear}-${String(count + 1).padStart(5, "0")}`;

      const finalNetTotal = Number(job.totalAmount);

      // Create Final Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceType: InvoiceType.JOB_ORDER_FINAL,
          customerId: job.customerId,
          customerName: job.customerName,
          customerPhone: job.customerPhone,
          jobOrderId: job.id,
          subTotal: finalNetTotal,
          discountAmount: 0,
          taxAmount: 0,
          roundOff: 0,
          netTotal: finalNetTotal,
          paidAmount: finalNetTotal, // Advance + Balance collected
          balanceDue: 0,
          paymentMethod,
          createdById: job.createdById,
          items: {
            create: [
              {
                itemDescription: `${job.jobType} (${job.quantity} ${job.unitName}) - Order #${job.jobOrderNumber}`,
                quantity: 1,
                unitCostPrice: 0,
                unitSalePrice: finalNetTotal,
                discountAmount: 0,
                taxPercent: 0,
                taxAmount: 0,
                lineTotal: finalNetTotal,
              },
            ],
          },
        },
      });

      // Update Job status to DELIVERED
      await tx.jobOrder.update({
        where: { id: jobId },
        data: {
          status: JobStatus.DELIVERED,
          deliveredAt: new Date(),
          balanceDue: 0,
        },
      });

      return { success: true as const, invoiceNumber, invoiceId: invoice.id };
    });

    revalidatePath("/jobs");
    revalidatePath("/reports");
    return result;
  } catch (error: any) {
    console.error("❌ Conversion failed:", error);
    return { success: false as const, error: error.message };
  }
}

export interface OperatorDispatchInput {
  jobId: string;
  targetStatus: JobStatus;
  machineAssigned?: string | null;
  operatorName?: string | null;
  spoilageQuantity?: number;
  spoilageReason?: string | null;
  operatorNotes?: string | null;
}

export async function updateJobStageWithOperatorLog(payload: OperatorDispatchInput) {
  try {
    const job = await prisma.jobOrder.findUnique({
      where: { id: payload.jobId },
    });

    if (!job) {
      return { success: false as const, error: "Job order not found" };
    }

    const timestamp = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const logEntry = `[${timestamp} - ${payload.operatorName || "Operator"}] Stage: ${payload.targetStatus}${
      payload.machineAssigned ? ` | Machine: ${payload.machineAssigned}` : ""
    }${payload.spoilageQuantity ? ` | Spoilage: ${payload.spoilageQuantity} sheets (${payload.spoilageReason || "Waste"})` : ""}${
      payload.operatorNotes ? ` | Note: ${payload.operatorNotes}` : ""
    }`;

    const updatedNotes = job.designNotes ? `${job.designNotes}\n${logEntry}` : logEntry;

    // Update the job order
    const updated = await prisma.jobOrder.update({
      where: { id: payload.jobId },
      data: {
        status: payload.targetStatus,
        designNotes: updatedNotes,
        proofApproved:
          payload.targetStatus === JobStatus.PRINTING ||
          payload.targetStatus === JobStatus.READY_FOR_PICKUP ||
          payload.targetStatus === JobStatus.DELIVERED
            ? true
            : undefined,
        proofApprovedAt: payload.targetStatus === JobStatus.PRINTING ? new Date() : undefined,
        deliveredAt: payload.targetStatus === JobStatus.DELIVERED ? new Date() : undefined,
      },
    });

    revalidatePath("/jobs");
    return { success: true as const, job: updated };
  } catch (error: any) {
    console.error("❌ Failed to update job stage log:", error);
    return { success: false as const, error: error.message || "Failed to update job stage" };
  }
}

export async function getJobAttachments(jobId: string) {
  try {
    const attachments = await prisma.jobOrderAttachment.findMany({
      where: { jobOrderId: jobId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true as const, attachments };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function attachProofUrlToJob(jobId: string, fileUrl: string, fileName: string) {
  try {
    const attachment = await prisma.jobOrderAttachment.create({
      data: {
        jobOrderId: jobId,
        fileUrl,
        fileName,
        fileType: "image/png",
        isProof: true,
      },
    });

    await prisma.jobOrder.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PROOF_APPROVAL,
        proofApproved: false,
        proofApprovedAt: null,
        proofRejectedAt: null,
      },
    });

    revalidatePath("/jobs");
    return { success: true as const, attachment };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function deleteJobAttachment(attachmentId: string) {
  try {
    await prisma.jobOrderAttachment.delete({
      where: { id: attachmentId },
    });
    revalidatePath("/jobs");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function setJobProofApprovalStage(jobId: string) {
  try {
    const job = await prisma.jobOrder.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PROOF_APPROVAL,
      },
    });
    revalidatePath("/jobs");
    return { success: true as const, job };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

