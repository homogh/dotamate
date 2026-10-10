import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { siteUrl } from "@/app/lib/emailLayout";
import { verifyClickSignature } from "@/app/lib/emailTracking";

export async function GET(request: NextRequest) {
  const logId = Number(request.nextUrl.searchParams.get("id"));
  const path = request.nextUrl.searchParams.get("to") ?? "";
  const signature = request.nextUrl.searchParams.get("s") ?? "";

  if (!Number.isInteger(logId) || logId <= 0 || !verifyClickSignature(logId, path, signature)) {
    return NextResponse.redirect(siteUrl("/"), 302);
  }

  const now = new Date();
  await prisma.emailLog.updateMany({ where: { id: logId, clickedAt: null }, data: { clickedAt: now } });
  // A click proves the email was opened even when its images were blocked.
  await prisma.emailLog.updateMany({ where: { id: logId, openedAt: null }, data: { openedAt: now } });

  // Built from NEXT_PUBLIC_API_URL because the VPS reverse proxy hides the public host.
  return NextResponse.redirect(siteUrl(path), 302);
}
