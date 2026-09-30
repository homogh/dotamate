import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";

import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { resolveMarketEvidencePath } from "@/app/lib/marketOrderEvidence";
import type { ApiResponse } from "@/app/types/api";

// Streams one piece of market-order dispute evidence to an admin. Mirrors
// app/api/admin/reports/[id]/attachments/[attachmentId]/route.ts, including
// Range support so <video> can seek.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id, attachmentId } = await params;
  const attachment = await prisma.marketOrderAttachment.findFirst({ where: { id: Number(attachmentId), marketOrderId: Number(id) } });
  const fullPath = attachment ? resolveMarketEvidencePath(attachment.path) : null;
  const fileStat = fullPath ? await stat(fullPath).catch(() => null) : null;

  if (!attachment || !fullPath || !fileStat) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فایل پیدا نشد.", data: null }, { status: 404 });
  }

  const size = fileStat.size;
  const headers: Record<string, string> = {
    "Content-Type": attachment.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }

    const stream = Readable.toWeb(createReadStream(fullPath, { start, end })) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(createReadStream(fullPath)) as ReadableStream;
  return new NextResponse(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
