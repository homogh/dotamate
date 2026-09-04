import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const [unreadNotifications, participants] = await Promise.all([
    prisma.notification.count({ where: { userId: session.id, read: false } }),
    prisma.conversationParticipant.findMany({
      where: { userId: session.id },
      select: {
        lastReadAt: true,
        conversation: { select: { messages: { select: { senderId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 } } },
      },
    }),
  ]);

  const unreadMessages = participants.reduce((sum, participant) => {
    const unread = participant.conversation.messages.filter(
      (message) =>
        message.senderId !== session.id && (!participant.lastReadAt || message.createdAt > participant.lastReadAt),
    ).length;
    return sum + unread;
  }, 0);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: { unreadNotifications, unreadMessages },
  });
}
