import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path || [];
    // Sanitize against directory traversal
    const safeSegments = pathSegments.map((s) => path.basename(s));
    const filePath = path.join(process.cwd(), "public", "uploads", ...safeSegments);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) {
      return new NextResponse("Not a file", { status: 400 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const fileBuffer = await fs.promises.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    console.error("Error serving uploaded file:", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
