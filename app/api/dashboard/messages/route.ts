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

  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: session.id },
    include: {
      conversation: {
        include: {
          participants: { include: { user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const conversations = participants
    .map((p) => {
      const other = p.conversation.participants.find((cp) => cp.userId !== session.id)?.user;
      const lastMessage = p.conversation.messages[0];
      if (!other) return null;

      const unread = Boolean(lastMessage && lastMessage.senderId !== session.id && (!p.lastReadAt || lastMessage.createdAt > p.lastReadAt));

      return {
        conversationId: p.conversation.id,
        userId: other.id,
        displayName: other.displayName,
        avatarUrl: other.avatarUrl,
        rank: other.rank,
        rankTier: other.rankTier,
        lastMessage: lastMessage?.body ?? "هنوز پیامی رد و بدل نشده",
        lastMessageAt: lastMessage?.createdAt ?? p.conversation.createdAt,
        unread,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: conversations });
}
