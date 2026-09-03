import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(id) },
    include: { messages: { include: { sender: true }, orderBy: { createdAt: "asc" } } },
  });

  if (!ticket || ticket.userId !== session.id) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "تیکت پیدا نشد.", data: null }, { status: 404 });
  }

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        body: m.body,
        isStaff: m.isStaff,
        senderName: m.sender.displayName,
        createdAt: m.createdAt,
      })),
    },
  });
}
