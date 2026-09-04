import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getHeroLookup, type OpenDotaMatch } from "@/app/lib/opendota";
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

  const heroes = user.matchStats ? await getHeroLookup() : {};

  const [teammatesAsHost, teammatesAsMember, activePostCount, recentPosts, isFavorited] = await Promise.all([
    prisma.postMember.count({ where: { post: { authorId: userId }, status: "ACCEPTED" } }),
    prisma.postMember.count({ where: { userId, status: "ACCEPTED" } }),
    prisma.post.count({ where: { authorId: userId, status: { in: ["ACTIVE", "FULL"] } } }),
    prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    session.id === userId
      ? Promise.resolve(false)
      : prisma.favorite.findFirst({ where: { userId: session.id, favoriteUserId: userId } }).then(Boolean),
  ]);

  const data = {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    steamProfileUrl: user.steamProfileUrl,
    bio: user.bio,
    country: user.country,
    languages: user.languages ? user.languages.split(",").map((l) => l.trim()).filter(Boolean) : [],
    rank: user.rank,
    rankTier: user.rankTier,
    mainPosition: user.mainPosition,
    rankVerification: user.rankVerification,
    createdAt: user.createdAt,
    isSelf: session.id === userId,
    isFavorited,
    stats: {
      teammatesFound: teammatesAsHost + teammatesAsMember,
      activePosts: activePostCount,
      totalPosts: recentPosts.length,
    },
    recentPosts: recentPosts.map((p) => ({
      id: p.id,
      position: p.position,
      region: p.region,
      gameMode: p.gameMode,
      status: p.status,
      createdAt: p.createdAt,
    })),
    dotaStats: user.matchStats
      ? {
          wins: user.matchStats.wins,
          losses: user.matchStats.losses,
          winRate:
            user.matchStats.wins + user.matchStats.losses > 0
              ? Math.round((user.matchStats.wins / (user.matchStats.wins + user.matchStats.losses)) * 100)
              : 0,
          lastSyncedAt: user.matchStats.lastSyncedAt,
          matches: (user.matchStats.matches as unknown as OpenDotaMatch[]).map((m) => ({
            ...m,
            heroName: heroes[m.heroId]?.localizedName ?? `Hero ${m.heroId}`,
          })),
        }
      : null,
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
