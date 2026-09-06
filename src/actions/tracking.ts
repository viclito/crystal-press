"use server";

import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface PublicJobData {
  id: string;
  jobOrderNumber: string;
  customerName: string;
  customerPhone: string | null;
  jobType: string;
  specifications: Record<string, any>;
  quantity: number;
  unitName: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  status: JobStatus;
  proofApproved: boolean;
  proofApprovedAt: string | null;
  proofRejectedAt: string | null;
  customerFeedback: string | null;
  clientApprovedName: string | null;
  designNotes: string | null;
  expectedDeliveryDate: string | null;
  deliveredAt: string | null;
  createdAt: string;
  attachments: Array<{
    id: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    isProof: boolean;
    createdAt: string;
  }>;
  shopSettings: {
    shopName: string;
    tagline: string;
    addressLine1: string;
    phone1: string;
    email: string;
    upiId: string;
  };
}

export async function getPublicJobTrackingData(query: string) {
  try {
    if (!query || !query.trim()) {
      return { success: false as const, error: "Order number or tracking code required" };
    }

    const cleanQuery = query.trim();

    // Find job order by jobOrderNumber or UUID id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQuery);

    const job = await prisma.jobOrder.findFirst({
      where: {
        OR: [
          { jobOrderNumber: { equals: cleanQuery, mode: "insensitive" } },
          ...(isUuid ? [{ id: cleanQuery }] : []),
        ],
      },
      include: {
        attachments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job) {
      return { success: false as const, error: `Order "${query}" was not found.` };
    }

    // Get shop settings
    const settings = await prisma.shopSettings.findFirst();

    const shopSettings = {
      shopName: settings?.shopName || "Crystal Press",
      tagline: settings?.tagline || "Printing Press & Stationery",
      addressLine1: settings?.addressLine1 || "123 Market Complex, Commercial Road",
      phone1: settings?.phone1 || "+91 98765 43210",
      email: settings?.email || "orders@crystalpress.in",
      upiId: settings?.upiId || "crystalpress@upi",
    };

    const formattedJob: PublicJobData = {
      id: job.id,
      jobOrderNumber: job.jobOrderNumber,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      jobType: job.jobType,
      specifications: (job.specifications as Record<string, any>) || {},
      quantity: Number(job.quantity) || 1,
      unitName: job.unitName || "pcs",
      totalAmount: Number(job.totalAmount) || 0,
      advancePaid: Number(job.advancePaid) || 0,
      balanceDue: Number(job.balanceDue) || 0,
      status: job.status,
      proofApproved: job.proofApproved,
      proofApprovedAt: job.proofApprovedAt ? job.proofApprovedAt.toISOString() : null,
      proofRejectedAt: job.proofRejectedAt ? job.proofRejectedAt.toISOString() : null,
      customerFeedback: job.customerFeedback,
      clientApprovedName: job.clientApprovedName,
      designNotes: job.designNotes,
      expectedDeliveryDate: job.expectedDeliveryDate ? job.expectedDeliveryDate.toISOString() : null,
      deliveredAt: job.deliveredAt ? job.deliveredAt.toISOString() : null,
      createdAt: job.createdAt.toISOString(),
      attachments: job.attachments.map((att) => ({
        id: att.id,
        fileUrl: att.fileUrl,
        fileName: att.fileName,
        fileType: att.fileType,
        isProof: att.isProof,
        createdAt: att.createdAt.toISOString(),
      })),
      shopSettings,
    };

    return { success: true as const, job: formattedJob };
  } catch (error: any) {
    console.error("❌ Error fetching public job tracking:", error);
    return { success: false as const, error: error.message || "Failed to load job tracking" };
  }
}

export async function searchPublicJobOrders(search: string) {
  try {
    if (!search || search.trim().length < 3) {
      return { success: false as const, error: "Please enter at least 3 characters" };
    }

    const q = search.trim();
    const isNumeric = /^\d+$/.test(q);

    const jobs = await prisma.jobOrder.findMany({
      where: {
        OR: [
          { jobOrderNumber: { contains: q, mode: "insensitive" } },
          ...(isNumeric ? [{ customerPhone: { contains: q } }] : []),
          { customerName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        jobOrderNumber: true,
        customerName: true,
        customerPhone: true,
        jobType: true,
        quantity: true,
        unitName: true,
        status: true,
        proofApproved: true,
        totalAmount: true,
        balanceDue: true,
        expectedDeliveryDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const formatted = jobs.map((j) => ({
      id: j.id,
      jobOrderNumber: j.jobOrderNumber,
      customerName: j.customerName,
      customerPhone: j.customerPhone,
      jobType: j.jobType,
      quantity: j.quantity,
      unitName: j.unitName,
      status: j.status,
      proofApproved: j.proofApproved,
      totalAmount: Number(j.totalAmount) || 0,
      balanceDue: Number(j.balanceDue) || 0,
      expectedDeliveryDate: j.expectedDeliveryDate ? j.expectedDeliveryDate.toISOString() : null,
      createdAt: j.createdAt.toISOString(),
    }));

    return { success: true as const, jobs: formatted };
  } catch (error: any) {
    console.error("❌ Error searching public jobs:", error);
    return { success: false as const, error: error.message || "Failed to search jobs" };
  }
}

export async function approveJobProofByCustomer(jobId: string, approvedByName: string) {
  try {
    if (!approvedByName || !approvedByName.trim()) {
      return { success: false as const, error: "Please enter your name for approval verification" };
    }

    const job = await prisma.jobOrder.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return { success: false as const, error: "Job order not found" };
    }

    const dateStr = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const approvalLog = `[Client Online Approval] Approved by "${approvedByName.trim()}" on ${dateStr}. Confirmed ready for press printing.`;
    const updatedNotes = job.designNotes ? `${job.designNotes}\n${approvalLog}` : approvalLog;

    const updated = await prisma.jobOrder.update({
      where: { id: jobId },
      data: {
        proofApproved: true,
        proofApprovedAt: new Date(),
        clientApprovedName: approvedByName.trim(),
        customerFeedback: null,
        status: JobStatus.PRINTING,
        designNotes: updatedNotes,
      },
    });

    revalidatePath(`/track/${job.jobOrderNumber}`);
    revalidatePath(`/track/${job.id}`);
    revalidatePath("/jobs");

    return { success: true as const, job: updated };
  } catch (error: any) {
    console.error("❌ Error approving proof:", error);
    return { success: false as const, error: error.message || "Failed to approve design proof" };
  }
}

export async function requestProofRevisionsByCustomer(jobId: string, feedback: string) {
  try {
    if (!feedback || !feedback.trim()) {
      return { success: false as const, error: "Please specify the changes needed for your design" };
    }

    const job = await prisma.jobOrder.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return { success: false as const, error: "Job order not found" };
    }

    const dateStr = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const revisionLog = `[Client Revision Request] on ${dateStr}: "${feedback.trim()}"`;
    const updatedNotes = job.designNotes ? `${job.designNotes}\n${revisionLog}` : revisionLog;

    const updated = await prisma.jobOrder.update({
      where: { id: jobId },
      data: {
        proofApproved: false,
        proofRejectedAt: new Date(),
        customerFeedback: feedback.trim(),
        status: JobStatus.DESIGNING,
        designNotes: updatedNotes,
      },
    });

    revalidatePath(`/track/${job.jobOrderNumber}`);
    revalidatePath(`/track/${job.id}`);
    revalidatePath("/jobs");

    return { success: true as const, job: updated };
  } catch (error: any) {
    console.error("❌ Error submitting proof revisions:", error);
    return { success: false as const, error: error.message || "Failed to submit revision request" };
  }
}
