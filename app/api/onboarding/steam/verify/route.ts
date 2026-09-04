import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { refreshOpenDotaPlayer, syncOpenDotaPlayer } from "@/app/lib/opendota";
import { fetchSteamPlayerSummary, steamId64ToAccountId } from "@/app/lib/steam";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user?.steamId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "هنوز استیمت رو وصل نکردی.", data: null }, { status: 400 });
  }

  const accountId = steamId64ToAccountId(user.steamId);

  const [, summary, sync] = await Promise.all([
    refreshOpenDotaPlayer(accountId),
    fetchSteamPlayerSummary(user.steamId),
    syncOpenDotaPlayer(accountId),
  ]);

  if (summary) {
    await prisma.user.update({
      where: { id: session.id },
      data: { avatarUrl: summary.avatarfull ?? null, displayName: summary.personaname || undefined },
    });
  }

  if (!sync) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "ارتباط با سرویس آمار دوتا برقرار نشد. دوباره تلاش کن.", data: { verified: false } },
      { status: 502 },
    );
  }

  const verified = sync.matches.length > 0;
  const matchesJson = sync.matches as unknown as Prisma.InputJsonValue;

  await prisma.$transaction([
    prisma.dotaMatchStats.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        wins: sync.wins,
        losses: sync.losses,
        rankTierHint: sync.rankTierHint,
        matches: matchesJson,
        lastSyncedAt: new Date(),
      },
      update: {
        wins: sync.wins,
        losses: sync.losses,
        rankTierHint: sync.rankTierHint,
        matches: matchesJson,
        lastSyncedAt: new Date(),
      },
    }),
    prisma.user.update({ where: { id: session.id }, data: { matchDataVerified: verified } }),
  ]);

  if (!verified) {
    return NextResponse.json<ApiResponse>({
      status: "error",
      message: "هنوز مچی برای این اکانت پیدا نکردیم. مطمئن شو تنظیم Expose Public Match Data رو توی دوتا فعال کردی.",
      data: { verified: false },
    });
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "اطلاعات مچ‌هات تایید شد.", data: { verified: true } });
}
