import { Prisma, type DotaMatchStats, type User } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { getPlatformSettings } from "@/app/lib/platformSettings";
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
import { heroCropUrl } from "@/app/lib/cdnUrls";
import { RANK_LABEL } from "@/components/dashboard/postLabels";

// A profile's OpenDota stats count as stale after this long; the profile page
// then re-syncs them right after it opens.
export const STATS_STALE_MS = 10 * 60 * 1000;
// Floor between two manual "refresh" clicks on the same profile.
export const MANUAL_SYNC_COOLDOWN_MS = 60 * 1000;

export function isStatsStale(lastSyncedAt: Date | null | undefined) {
  return !lastSyncedAt || Date.now() - lastSyncedAt.getTime() > STATS_STALE_MS;
}

type SyncResult = {
  matchStats: DotaMatchStats;
  rank: Pick<User, "rank" | "rankTier" | "rankVerification"> | null;
};

// One sync per user at a time — everyone opening the same stale profile
// shares the same OpenDota round-trip instead of each firing their own.
const inFlight = new Map<number, Promise<SyncResult | null>>();

export function syncProfileStats(userId: number, steamId: string) {
  const running = inFlight.get(userId);
  if (running) return running;

  const job = runSync(userId, steamId)
    .catch((error) => {
      console.error("[profile] OpenDota sync failed", error);
      return null;
    })
    .finally(() => inFlight.delete(userId));
  inFlight.set(userId, job);
  return job;
}

// Pulls fresh OpenDota stats into DotaMatchStats. Matches/W-L always refresh;
// re-deriving the rank from OpenDota (never self-declared) is the admin
// "automatic rank climb" switch, steamAutoSyncEnabled.
async function runSync(userId: number, steamId: string): Promise<SyncResult | null> {
  const accountId = steamId64ToAccountId(steamId);
  const sync = await syncOpenDotaPlayer(accountId);
  // Ask OpenDota to pull the newest matches from Steam only after reading, so
  // it never competes with the reads above. A match that just ended can show
  // up on the next sync instead.
  void refreshOpenDotaPlayer(accountId);
  if (!sync) return null;

  // Fields left undefined (that endpoint failed this time) keep their stored value.
  const stats = {
    wins: sync.wins,
    losses: sync.losses,
    rankTierHint: sync.rankTierHint,
    matches: sync.matches as unknown as Prisma.InputJsonValue,
    ratings: sync.ratings as unknown as Prisma.InputJsonValue | undefined,
    totals: sync.totals === null ? Prisma.DbNull : (sync.totals as unknown as Prisma.InputJsonValue | undefined),
    heroesPlayed: sync.heroesPlayed as unknown as Prisma.InputJsonValue | undefined,
    lastSyncedAt: new Date(),
  };
  const matchStats = await prisma.dotaMatchStats.upsert({
    where: { userId },
    create: { userId, ...stats },
    update: stats,
  });

  const decoded = sync.rankTierHint != null ? decodeOpenDotaRankTier(sync.rankTierHint) : null;
  const rank = decoded && (await getPlatformSettings()).steamAutoSyncEnabled
    ? await prisma.user.update({
        where: { id: userId },
        data: { rank: decoded.rank, rankTier: decoded.star, rankVerification: "VERIFIED" },
        select: { rank: true, rankTier: true, rankVerification: true },
      })
    : null;

  return { matchStats, rank };
}

/** Shapes a DotaMatchStats row for the profile page, joining hero names/art. */
export async function serializeDotaStats(matchStats: DotaMatchStats) {
  const heroes = await getHeroLookup();
  const totalGames = matchStats.wins + matchStats.losses;

  return {
    wins: matchStats.wins,
    losses: matchStats.losses,
    winRate: totalGames > 0 ? Math.round((matchStats.wins / totalGames) * 100) : 0,
    lastSyncedAt: matchStats.lastSyncedAt,
    stale: isStatsStale(matchStats.lastSyncedAt),
    matches: (matchStats.matches as unknown as OpenDotaMatch[]).map((m) => ({
      ...m,
      heroName: heroes[m.heroId]?.localizedName ?? `Hero ${m.heroId}`,
      heroIcon: heroes[m.heroId]?.icon ?? "",
      heroImg: heroes[m.heroId]?.img ?? "",
      heroCrop: heroCropUrl(heroes[m.heroId]?.name),
    })),
    ratings: ((matchStats.ratings as unknown as OpenDotaRatingPoint[] | null) ?? []).map((r) => {
      const decoded = decodeOpenDotaRankTier(r.rankTier);
      return {
        ...r,
        rankLabel: decoded ? `${RANK_LABEL[decoded.rank]}${decoded.star ? ` ${decoded.star}` : ""}` : `${r.rankTier}`,
      };
    }),
    totals: (matchStats.totals as unknown as OpenDotaTotals | null) ?? null,
    heroesPlayed: ((matchStats.heroesPlayed as unknown as OpenDotaHeroPlayed[] | null) ?? []).map((h) => ({
      ...h,
      heroImg: heroes[h.heroId]?.img ?? "",
      heroCrop: heroCropUrl(heroes[h.heroId]?.name),
    })),
  };
}
