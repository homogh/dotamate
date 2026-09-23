import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";

import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { resolveEvidencePath } from "@/app/lib/reportEvidence";
import type { ApiResponse } from "@/app/types/api";

// Streams one piece of report evidence to an admin. Honors Range requests
// so <video> can seek (Safari won't play a video at all without it).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "REPORTS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id, attachmentId } = await params;
  const attachment = await prisma.reportAttachment.findFirst({
    where: { id: Number(attachmentId), reportId: Number(id) },
  });
  const fullPath = attachment ? resolveEvidencePath(attachment.path) : null;
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
