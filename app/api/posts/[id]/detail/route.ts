import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وارد نشدی.", data: null },
      { status: 401 },
    );
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id: Number(id) },
    include: {
      author: true,
      members: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!post) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "پست پیدا نشد.", data: null },
      { status: 404 },
    );
  }

  const isAuthor = post.authorId === session.id;
  const myMembership = post.members.find((m) => m.userId === session.id);
  const isAcceptedMember = myMembership?.status === "ACCEPTED";

  if (!isAuthor && !isAcceptedMember) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "به این اتاق لابی دسترسی نداری.", data: null },
      { status: 403 },
    );
  }

  const accepted = post.members.filter((m) => m.status === "ACCEPTED");
  const pending = post.members.filter((m) => m.status === "PENDING");

  const data = {
    id: post.id,
    isAuthor,
    author: {
      id: post.author.id,
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
      rank: post.author.rank,
      rankTier: post.author.rankTier,
    },
    position: post.position,
    rank: post.rank,
    region: post.region,
    gameMode: post.gameMode,
    sessionType: post.sessionType,
    startAt: post.startAt,
    description: post.description,
    hasVoice: post.hasVoice,
    voiceLink: post.voiceLink,
    partySize: post.partySize,
    status: post.status,
    createdAt: post.createdAt,
    memberCount: accepted.length + 1,
    accepted: accepted.map((m) => ({
      memberId: m.id,
      userId: m.user.id,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      rank: m.user.rank,
      rankTier: m.user.rankTier,
      position: m.position,
    })),
    pending: isAuthor
      ? pending.map((m) => ({
          memberId: m.id,
          userId: m.user.id,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl,
          rank: m.user.rank,
          rankTier: m.user.rankTier,
        }))
      : [],
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
