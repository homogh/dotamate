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
  const conversation = await prisma.conversation.findUnique({
    where: { id: Number(id) },
    include: { participants: { include: { user: true } } },
  });

  const myParticipant = conversation?.participants.find((p) => p.userId === session.id);
  if (!conversation || !myParticipant) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const other = conversation.participants.find((p) => p.userId !== session.id)?.user;
  if (!other) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  const isBlocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: session.id, blockedId: other.id },
        { blockerId: other.id, blockedId: session.id },
      ],
    },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      id: conversation.id,
      other: { id: other.id, displayName: other.displayName, avatarUrl: other.avatarUrl, rank: other.rank, rankTier: other.rankTier },
      blocked: Boolean(isBlocked),
      blockedByMe: isBlocked?.blockerId === session.id,
    },
  });
}
