import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import {
  getHeroLookup,
  refreshOpenDotaPlayer,
  syncOpenDotaPlayer,
  decodeOpenDotaRankTier,
  type OpenDotaMatch,
  type OpenDotaRatingPoint,
  type OpenDotaTotals,
  type OpenDotaHeroPlayed,
} from "@/app/lib/opendota";
import { steamId64ToAccountId } from "@/app/lib/steam";
import { RANK_LABEL } from "@/components/dashboard/postLabels";
import type { ApiResponse } from "@/app/types/api";

// Re-pull OpenDota stats at most this often per profile — keeps every
// profile view reasonably fresh without hitting OpenDota on every request.
const STATS_STALE_MS = 10 * 60 * 1000;

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

  let matchStats = user.matchStats;
  let rank = user.rank;
  let rankTier = user.rankTier;
  let rankVerification = user.rankVerification;

  if (user.steamId && user.matchDataVerified) {
    const isStale = !matchStats?.lastSyncedAt || Date.now() - matchStats.lastSyncedAt.getTime() > STATS_STALE_MS;

    if (isStale) {
      const accountId = steamId64ToAccountId(user.steamId);
      refreshOpenDotaPlayer(accountId); // best-effort, not awaited — asks OpenDota to pull fresh matches for next time
      const sync = await syncOpenDotaPlayer(accountId).catch(() => null);

      if (sync) {
        matchStats = await prisma.dotaMatchStats.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            wins: sync.wins,
            losses: sync.losses,
            rankTierHint: sync.rankTierHint,
            matches: sync.matches as unknown as Prisma.InputJsonValue,
            ratings: sync.ratings as unknown as Prisma.InputJsonValue,
            totals: sync.totals as unknown as Prisma.InputJsonValue,
            heroesPlayed: sync.heroesPlayed as unknown as Prisma.InputJsonValue,
            lastSyncedAt: new Date(),
          },
          update: {
            wins: sync.wins,
            losses: sync.losses,
            rankTierHint: sync.rankTierHint,
            matches: sync.matches as unknown as Prisma.InputJsonValue,
            ratings: sync.ratings as unknown as Prisma.InputJsonValue,
            totals: sync.totals as unknown as Prisma.InputJsonValue,
            heroesPlayed: sync.heroesPlayed as unknown as Prisma.InputJsonValue,
            lastSyncedAt: new Date(),
          },
        });
      }

      // Rank is derived from OpenDota, never self-declared — every stale
      // view re-checks it here so a rank-up or rank-down shows immediately.
      const decoded = sync?.rankTierHint != null ? decodeOpenDotaRankTier(sync.rankTierHint) : null;
      if (decoded) {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { rank: decoded.rank, rankTier: decoded.star, rankVerification: "VERIFIED" },
          select: { rank: true, rankTier: true, rankVerification: true },
        });
        rank = updatedUser.rank;
        rankTier = updatedUser.rankTier;
        rankVerification = updatedUser.rankVerification;
      }
    }
  }

  const heroes = matchStats ? await getHeroLookup() : {};

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
    steamId: user.steamId,
    bio: user.bio,
    country: user.country,
    languages: user.languages ? user.languages.split(",").map((l) => l.trim()).filter(Boolean) : [],
    rank,
    rankTier,
    mainPosition: user.mainPosition,
    rankVerification,
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
    dotaStats: matchStats
      ? {
          wins: matchStats.wins,
          losses: matchStats.losses,
          winRate:
            matchStats.wins + matchStats.losses > 0
              ? Math.round((matchStats.wins / (matchStats.wins + matchStats.losses)) * 100)
              : 0,
          lastSyncedAt: matchStats.lastSyncedAt,
          matches: (matchStats.matches as unknown as OpenDotaMatch[]).map((m) => ({
            ...m,
            heroName: heroes[m.heroId]?.localizedName ?? `Hero ${m.heroId}`,
            heroIcon: heroes[m.heroId]?.icon ?? "",
            heroImg: heroes[m.heroId]?.img ?? "",
          })),
          ratings: ((matchStats.ratings as unknown as OpenDotaRatingPoint[] | null) ?? []).map((r) => {
            const decoded = decodeOpenDotaRankTier(r.rankTier);
            return {
              ...r,
              rankLabel: decoded ? `${RANK_LABEL[decoded.rank]}${decoded.star ? ` ${decoded.star}` : ""}` : `${r.rankTier}`,
            };
          }),
          totals: (matchStats.totals as unknown as OpenDotaTotals | null) ?? null,
          heroesPlayed: (matchStats.heroesPlayed as unknown as OpenDotaHeroPlayed[] | null) ?? [],
        }
      : null,
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
