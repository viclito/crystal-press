import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobOrderId = formData.get("jobOrderId") as string | null;
    const isProof = formData.get("isProof") === "true";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (!jobOrderId) {
      return NextResponse.json({ success: false, error: "No jobOrderId provided" }, { status: 400 });
    }

    // Verify job exists
    const job = await prisma.jobOrder.findUnique({
      where: { id: jobOrderId },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: "Job order not found" }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "proofs");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique sanitized filename
    const originalName = file.name || "proof.png";
    const ext = path.extname(originalName) || ".png";
    const sanitizedBase = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const uniqueFilename = `${Date.now()}-${uuidv4().slice(0, 8)}-${sanitizedBase}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/uploads/proofs/${uniqueFilename}`;
    const fileType = file.type || "application/octet-stream";

    // Create attachment in database
    const attachment = await prisma.jobOrderAttachment.create({
      data: {
        jobOrderId,
        fileUrl,
        fileName: originalName,
        fileType,
        isProof,
      },
    });

    // If marked as proof, also clear previous rejection note since a new proof was uploaded
    if (isProof) {
      await prisma.jobOrder.update({
        where: { id: jobOrderId },
        data: {
          proofApproved: false,
          proofApprovedAt: null,
          proofRejectedAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      attachment,
    });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "File upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get("id");

    if (!attachmentId) {
      return NextResponse.json({ success: false, error: "Missing attachment ID" }, { status: 400 });
    }

    const attachment = await prisma.jobOrderAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ success: false, error: "Attachment not found" }, { status: 404 });
    }

    // Try deleting physical file
    try {
      const filePath = path.join(process.cwd(), "public", attachment.fileUrl);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (fsErr) {
      console.warn("Could not delete file from disk:", fsErr);
    }

    // Delete DB record
    await prisma.jobOrderAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
