import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { siteUrl } from "@/app/lib/emailLayout";
import { verifyUnsubscribeToken } from "@/app/lib/emailUnsubscribe";
import type { ApiResponse } from "@/app/types/api";

// Hit by the /unsubscribe page's form and by mail clients' one-click
// unsubscribe (RFC 8058 POST) — no session needed, the signed token is the auth.
export async function POST(request: NextRequest) {
  const userId = Number(request.nextUrl.searchParams.get("u"));
  const token = request.nextUrl.searchParams.get("t") ?? "";

  if (!Number.isInteger(userId) || userId <= 0 || !verifyUnsubscribeToken(userId, token)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "لینک لغو اشتراک نامعتبره.", data: null }, { status: 400 });
  }

  await prisma.user.updateMany({ where: { id: userId }, data: { notifyEmail: false } });

  // Built from NEXT_PUBLIC_API_URL because the VPS reverse proxy hides the public host.
  return NextResponse.redirect(siteUrl(`/unsubscribe?u=${userId}&t=${token}&done=1`), 303);
}
