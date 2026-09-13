import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "REPORTS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id: Number(id) } });

  if (!report) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "گزارش پیدا نشد.", data: null }, { status: 404 });
  }
  if (!report.reportedConversationId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این گزارش به گفتگویی لینک نشده.", data: null }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: report.reportedConversationId },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      reportedUserId: report.reportedUserId,
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        senderId: m.senderId,
        senderName: m.sender.displayName,
      })),
    },
  });
}
