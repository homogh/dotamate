import { NextRequest, NextResponse } from "next/server";
import type { Prisma, TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "TICKETS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const query = searchParams.get("query")?.trim() ?? "";

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const where: Prisma.TicketWhereInput = {
    ...(status ? { status: status as TicketStatus } : {}),
    ...(category ? { category: category as TicketCategory } : {}),
    ...(priority ? { priority: priority as TicketPriority } : {}),
    ...(query ? { OR: [{ subject: { contains: query } }, { user: { displayName: { contains: query } } }] } : {}),
  };

  const [tickets, openCount, answeredTodayCount] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: { user: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.ticket.count({ where: { status: "ANSWERED", updatedAt: { gte: dayAgo } } }),
  ]);

  const data = {
    counts: { open: openCount, answeredToday: answeredTodayCount },
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt,
      userName: t.user.displayName,
      lastMessage: t.messages[0]?.body ?? null,
      lastMessageAt: t.messages[0]?.createdAt ?? t.createdAt,
    })),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
