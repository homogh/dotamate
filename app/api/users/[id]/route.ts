import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { findFriendship, isOnline, relationFrom } from "@/app/lib/friends";
import { serializeDotaStats } from "@/app/lib/profileStats";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number(id);

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { matchStats: true } });
  if (!user) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  // Never waits on OpenDota: stored stats are served as-is and the page pulls
  // fresh ones right after through POST /api/users/[id]/sync, so a slow or
  // down OpenDota can't hold the profile up.
  const matchStats = user.matchStats;

  const [teammatesAsHost, teammatesAsMember, activePostCount, totalPostCount, recentPosts, isFavorited, commendsByType, friendship] =
    await Promise.all([
      prisma.postMember.count({ where: { post: { authorId: userId }, status: "ACCEPTED" } }),
      prisma.postMember.count({ where: { userId, status: "ACCEPTED" } }),
      prisma.post.count({ where: { authorId: userId, status: { in: ["ACTIVE", "FULL"] } } }),
      prisma.post.count({ where: { authorId: userId } }),
      prisma.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      session.id === userId
        ? Promise.resolve(false)
        : prisma.favorite.findFirst({ where: { userId: session.id, favoriteUserId: userId } }).then(Boolean),
      prisma.commend.groupBy({ by: ["type"], where: { targetId: userId }, _count: { _all: true } }),
      session.id === userId ? Promise.resolve(null) : findFriendship(session.id, userId),
    ]);

  const data = {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    steamProfileUrl: user.steamProfileUrl,
    steamId: user.steamId,
    bio: user.bio,
    country: user.country,
    languages: user.languages ? user.languages.split(",").map((l) => l.trim()).filter(Boolean) : [],
    rank: user.rank,
    rankTier: user.rankTier,
    mainPosition: user.mainPosition,
    rankVerification: user.rankVerification,
    behaviorScore: user.behaviorScore,
    communicationScore: user.communicationScore,
    commends: {
      total: commendsByType.reduce((sum, c) => sum + c._count._all, 0),
      byType: Object.fromEntries(commendsByType.map((c) => [c.type, c._count._all])),
      progress: user.commendProgress,
    },
    createdAt: user.createdAt,
    isSelf: session.id === userId,
    isFavorited,
    friend: relationFrom(friendship, session.id),
    online: isOnline(user.lastActiveAt),
    stats: {
      teammatesFound: teammatesAsHost + teammatesAsMember,
      activePosts: activePostCount,
      totalPosts: totalPostCount,
    },
    recentPosts: recentPosts.map((p) => ({
      id: p.id,
      position: p.position,
      region: p.region,
      gameMode: p.gameMode,
      status: p.status,
      createdAt: p.createdAt,
    })),
    // Has a verified Steam account, so /sync can pull OpenDota stats for it.
    syncable: Boolean(user.steamId && user.matchDataVerified),
    dotaStats: matchStats ? await serializeDotaStats(matchStats) : null,
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
