import { NextRequest, NextResponse } from "next/server";
import type { TicketCategory, TicketPriority } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt,
      lastMessage: t.messages[0]?.body ?? null,
      lastMessageIsStaff: t.messages[0]?.isStaff ?? false,
    })),
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "برای ثبت تیکت اول وارد حساب شو.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const subject = String(body?.subject ?? "").trim();
  const category = String(body?.category ?? "GENERAL") as TicketCategory;
  const priority = String(body?.priority ?? "MEDIUM") as TicketPriority;
  const message = String(body?.message ?? "").trim();

  if (!subject || !message) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "موضوع و متن پیام رو کامل کن.", data: null }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId: session.id,
      subject: subject.slice(0, 200),
      category,
      priority,
      messages: { create: { senderId: session.id, body: message.slice(0, 2000), isStaff: false } },
    },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "تیکت شما ثبت شد.", data: { id: ticket.id } });
}
