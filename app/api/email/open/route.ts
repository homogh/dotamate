import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { verifyOpenSignature } from "@/app/lib/emailTracking";

// 1×1 transparent GIF.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: NextRequest) {
  const logId = Number(request.nextUrl.searchParams.get("id"));
  const signature = request.nextUrl.searchParams.get("s") ?? "";

  if (Number.isInteger(logId) && logId > 0 && verifyOpenSignature(logId, signature)) {
    await prisma.emailLog.updateMany({ where: { id: logId, openedAt: null }, data: { openedAt: new Date() } });
  }

  // Always answer with the pixel so a bad link never shows a broken image.
  return new NextResponse(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" },
  });
}
