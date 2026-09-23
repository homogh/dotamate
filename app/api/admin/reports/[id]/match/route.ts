import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { getHeroLookup, getItemLookup } from "@/app/lib/opendota";
import { steamId64ToAccountId } from "@/app/lib/steam";
import type { ApiResponse } from "@/app/types/api";

const OPENDOTA_BASE = "https://api.opendota.com/api";
const ITEM_SLOTS = ["item_0", "item_1", "item_2", "item_3", "item_4", "item_5"] as const;

// The full scoreboard of the match a behavior report points at, with the
// reporter and the reported player marked — this is what the admin judges.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "REPORTS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id: Number(id) },
    include: { reporter: { select: { steamId: true } }, reportedUser: { select: { steamId: true } } },
  });

  if (!report?.matchId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این گزارش به مچی لینک نشده.", data: null }, { status: 404 });
  }

  const res = await fetch(`${OPENDOTA_BASE}/matches/${report.matchId}`);
  if (!res.ok) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "دریافت جزئیات مچ از OpenDota ناموفق بود.", data: null },
      { status: 502 },
    );
  }

  const match = await res.json().catch(() => null);
  const players = Array.isArray(match?.players) ? (match.players as Record<string, unknown>[]) : [];
  const [heroes, items] = await Promise.all([getHeroLookup(), getItemLookup()]);

  const reporterAccountId = report.reporter.steamId ? steamId64ToAccountId(report.reporter.steamId) : null;
  const reportedAccountId = report.reportedUser?.steamId ? steamId64ToAccountId(report.reportedUser.steamId) : null;

  const data = {
    matchId: report.matchId,
    radiantWin: Boolean(match?.radiant_win),
    duration: Number(match?.duration ?? 0),
    startAt: match?.start_time ? new Date(Number(match.start_time) * 1000).toISOString() : null,
    radiantScore: Number(match?.radiant_score ?? 0),
    direScore: Number(match?.dire_score ?? 0),
    players: players.map((p) => {
      const accountId = typeof p.account_id === "number" ? p.account_id : null;
      const heroId = Number(p.hero_id);
      return {
        isRadiant: Number(p.player_slot) < 128,
        personaName: typeof p.personaname === "string" ? p.personaname : null,
        heroName: heroes[heroId]?.localizedName ?? `Hero ${heroId}`,
        heroIcon: heroes[heroId]?.icon ?? "",
        kills: Number(p.kills ?? 0),
        deaths: Number(p.deaths ?? 0),
        assists: Number(p.assists ?? 0),
        lastHits: Number(p.last_hits ?? 0),
        goldPerMin: Number(p.gold_per_min ?? 0),
        heroDamage: Number(p.hero_damage ?? 0),
        abandoned: Number(p.leaver_status ?? 0) > 1,
        items: ITEM_SLOTS.map((slot) => Number(p[slot] ?? 0))
          .filter((itemId) => itemId > 0)
          .map((itemId) => items[itemId]?.img ?? ""),
        isReporter: accountId !== null && accountId === reporterAccountId,
        isReported: accountId !== null && accountId === reportedAccountId,
      };
    }),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
