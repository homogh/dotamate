import { NextRequest, NextResponse } from "next/server";
import type { Position, Prisma, Rank } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { ONLINE_WINDOW_MS, isOnline, relationFrom } from "@/app/lib/friends";
import type { ApiResponse } from "@/app/types/api";

const PAGE_SIZE = 12;

// Same bands as scoreTier() in app/lib/behavior.ts.
const BEHAVIOR_RANGE: Record<string, Prisma.IntFilter> = {
  excellent: { gte: 10000 },
  good: { gte: 8000, lt: 10000 },
  average: { gte: 5000, lt: 8000 },
  poor: { lt: 5000 },
};

// Public, like /api/search-lobby — guests can browse players, a session
// only adds friend state and lobby-invite info for the action buttons.
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query")?.trim() ?? "";
  const rank = searchParams.get("rank") ?? "";
  const position = searchParams.get("position") ?? "";
  const behavior = searchParams.get("behavior") ?? "";
  const onlineOnly = searchParams.get("online") === "1";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const where: Prisma.UserWhereInput = {
    banned: false,
    profileCompletedAt: { not: null },
    // Only players who've connected Steam show up here.
    steamId: { not: null },
    ...(rank ? { rank: rank as Rank } : {}),
    ...(position ? { mainPosition: position as Position } : {}),
    ...(BEHAVIOR_RANGE[behavior] ? { behaviorScore: BEHAVIOR_RANGE[behavior] } : {}),
    ...(onlineOnly ? { lastActiveAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) } } : {}),
    ...(query ? { displayName: { contains: query } } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        rank: true,
        rankTier: true,
        mainPosition: true,
        rankVerification: true,
        behaviorScore: true,
        lastActiveAt: true,
      },
      // Most recently active first, which also puts everyone online on top.
      orderBy: [{ lastActiveAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const ids = users.map((u) => u.id);

  const [friendships, myActivePost] = session
    ? await Promise.all([
        prisma.friendship.findMany({
          where: {
            OR: [
              { requesterId: session.id, addresseeId: { in: ids } },
              { addresseeId: session.id, requesterId: { in: ids } },
            ],
          },
        }),
        prisma.post.findFirst({
          where: { authorId: session.id, status: "ACTIVE" },
          include: { members: true },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], null];

  const data = {
    players: users.map((u) => {
      const friendship = session
        ? friendships.find((f) => f.requesterId === u.id || f.addresseeId === u.id)
        : null;
      return {
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        rank: u.rank,
        rankTier: u.rankTier,
        mainPosition: u.mainPosition,
        verified: u.rankVerification === "VERIFIED",
        behaviorScore: u.behaviorScore,
        online: isOnline(u.lastActiveAt),
        lastActiveAt: u.lastActiveAt,
        isSelf: session?.id === u.id,
        friend: session && session.id !== u.id ? relationFrom(friendship, session.id) : null,
        inMyLobby: Boolean(myActivePost?.members.some((m) => m.userId === u.id)),
      };
    }),
    myActivePost: myActivePost
      ? {
          id: myActivePost.id,
          hasOpenSlot: myActivePost.members.filter((m) => m.status === "ACCEPTED").length + 1 < myActivePost.partySize,
        }
      : null,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
    isLoggedIn: Boolean(session),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
