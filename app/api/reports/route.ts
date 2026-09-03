import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const reportedUserId = Number(body?.reportedUserId) || null;
  const reportedPostId = Number(body?.reportedPostId) || null;
  const context = typeof body?.context === "string" ? body.context.slice(0, 100) : null;
  const reason = String(body?.reason ?? "").trim();

  if (!reason) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دلیل گزارش رو بنویس.", data: null }, { status: 400 });
  }

  await prisma.report.create({
    data: { reporterId: session.id, reportedUserId, reportedPostId, context, reason: reason.slice(0, 1000) },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "گزارش شما ثبت شد.", data: null });
}
