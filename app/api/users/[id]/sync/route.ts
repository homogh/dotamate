import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { MANUAL_SYNC_COOLDOWN_MS, isStatsStale, serializeDotaStats, syncProfileStats } from "@/app/lib/profileStats";
import type { ApiResponse } from "@/app/types/api";

// Re-pulls a profile's OpenDota stats (recent matches, W/L, heroes, rank).
// `{ auto: true }` is the page's own refresh right after it opens — a no-op
// unless the stats are stale; a manual click is rate-limited per profile.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number(id);
  const body = await request.json().catch(() => null);
  const auto = Boolean(body?.auto);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      steamId: true,
      matchDataVerified: true,
      rank: true,
      rankTier: true,
      rankVerification: true,
      matchStats: { select: { lastSyncedAt: true } },
    },
  });
  if (!user) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }
  if (!user.steamId || !user.matchDataVerified) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "آمار دوتای این بازیکن هنوز وصل نشده.", data: null },
      { status: 400 },
    );
  }

  const lastSyncedAt = user.matchStats?.lastSyncedAt ?? null;

  if (auto) {
    if (!isStatsStale(lastSyncedAt)) {
      return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: null });
    }
  } else if (lastSyncedAt && Date.now() - lastSyncedAt.getTime() < MANUAL_SYNC_COOLDOWN_MS) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "همین الان به‌روز شد؛ یه دقیقه دیگه دوباره امتحان کن.", data: null },
      { status: 429 },
    );
  }

  const synced = await syncProfileStats(user.id, user.steamId);
  if (!synced) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "الان به OpenDota وصل نشدیم؛ چند دقیقه دیگه دوباره امتحان کن.", data: null },
      { status: 502 },
    );
  }

  const rank = synced.rank ?? { rank: user.rank, rankTier: user.rankTier, rankVerification: user.rankVerification };

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "آمار به‌روز شد.",
    data: { ...rank, dotaStats: await serializeDotaStats(synced.matchStats) },
  });
}
