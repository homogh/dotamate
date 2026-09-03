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
  if (!admin || !hasAccess(admin, "TICKETS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(id) },
    include: { user: true, messages: { include: { sender: true }, orderBy: { createdAt: "asc" } } },
  });

  if (!ticket) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "تیکت پیدا نشد.", data: null }, { status: 404 });
  }

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt,
      userName: ticket.user.displayName,
      userId: ticket.user.id,
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "TICKETS", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const ticketId = Number(id);
  const body = await request.json().catch(() => null);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "تیکت پیدا نشد.", data: null }, { status: 404 });
  }

  const ops = [];
  const replyBody = typeof body?.reply === "string" ? body.reply.trim() : "";

  if (replyBody) {
    ops.push(
      prisma.ticketMessage.create({ data: { ticketId, senderId: session.id, isStaff: true, body: replyBody.slice(0, 2000) } }),
      prisma.notification.create({
        data: { userId: ticket.userId, type: "SYSTEM", title: "پاسخ جدید برای تیکت پشتیبانی", link: "/contact" },
      }),
      prisma.auditLog.create({ data: { actorId: session.id, action: "REPLY_TICKET", targetType: "Ticket", targetId: ticketId } }),
    );
  }

  const newStatus = body?.status === "CLOSED" ? "CLOSED" : replyBody ? "ANSWERED" : body?.status;
  if (newStatus) {
    ops.push(prisma.ticket.update({ where: { id: ticketId }, data: { status: newStatus, updatedAt: new Date() } }));
    if (newStatus === "CLOSED") {
      ops.push(prisma.auditLog.create({ data: { actorId: session.id, action: "CLOSE_TICKET", targetType: "Ticket", targetId: ticketId } }));
    }
  } else if (replyBody) {
    ops.push(prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } }));
  }

  if (ops.length === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "چیزی برای اعمال نبود.", data: null }, { status: 400 });
  }

  await prisma.$transaction(ops);

  return NextResponse.json<ApiResponse>({ status: "success", message: "انجام شد.", data: null });
}
