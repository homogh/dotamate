import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { dmChatKey, markWatchingChat, notifyChatMessage, stopWatchingChat } from "@/app/lib/chatNotifications";
import type { ApiResponse } from "@/app/types/api";

async function guardParticipant(conversationId: number, userId: number) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return participant;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = Number(id);
  const participant = await guardParticipant(conversationId, session.id);
  if (!participant) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const [messages, otherParticipant] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 300,
    }),
    prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: session.id } },
      select: { lastReadAt: true },
    }),
  ]);

  // The page sends viewing=0 while its tab is hidden or blurred: messages
  // still load, but nothing counts as read and notifications keep coming.
  const viewing = request.nextUrl.searchParams.get("viewing") !== "0";
  if (viewing) {
    await Promise.all([
      prisma.conversationParticipant.update({ where: { id: participant.id }, data: { lastReadAt: new Date() } }),
      markWatchingChat(session.id, dmChatKey(conversationId)),
    ]);
  } else {
    await stopWatchingChat(session.id, dmChatKey(conversationId));
  }

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      messages: messages.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, senderId: m.senderId })),
      otherLastReadAt: otherParticipant?.lastReadAt ?? null,
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = Number(id);
  const participant = await guardParticipant(conversationId, session.id);
  if (!participant) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });
  const other = conversation?.participants.find((p) => p.userId !== session.id);

  if (other) {
    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: session.id, blockedId: other.userId },
          { blockerId: other.userId, blockedId: session.id },
        ],
      },
    });
    if (blocked) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "ارسال پیام امکان‌پذیر نیست.", data: null }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "پیام خالیه.", data: null }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: session.id, body: text.slice(0, 1000) } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);

  if (other) {
    await notifyChatMessage({
      chatKey: dmChatKey(conversationId),
      recipientIds: [other.userId],
      senderId: session.id,
      senderName: session.displayName,
      text,
      link: `/dashboard/messages/${conversationId}`,
    });
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "ارسال شد.", data: { id: message.id } });
}
