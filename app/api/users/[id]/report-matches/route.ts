import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getHeroLookup, type OpenDotaMatch } from "@/app/lib/opendota";
import type { ApiResponse } from "@/app/types/api";

// The reporter's own recent matches to pick from in the report modal —
// ones that also show up in the reported player's recent matches are
// flagged as "shared" and sorted first, since those are the likely ones.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const targetId = Number(id);

  const [mine, theirs] = await Promise.all([
    prisma.dotaMatchStats.findUnique({ where: { userId: session.id }, select: { matches: true } }),
    prisma.dotaMatchStats.findUnique({ where: { userId: targetId }, select: { matches: true } }),
  ]);

  const myMatches = (mine?.matches as unknown as OpenDotaMatch[] | null) ?? [];
  const theirMatchIds = new Set(((theirs?.matches as unknown as OpenDotaMatch[] | null) ?? []).map((m) => m.matchId));
  const heroes = myMatches.length ? await getHeroLookup() : {};

  const matches = myMatches
    .map((m) => ({
      matchId: String(m.matchId),
      heroName: heroes[m.heroId]?.localizedName ?? `Hero ${m.heroId}`,
      heroIcon: heroes[m.heroId]?.icon ?? "",
      win: m.win,
      startAt: m.startAt,
      duration: m.duration,
      shared: theirMatchIds.has(m.matchId),
    }))
    .sort((a, b) => Number(b.shared) - Number(a.shared));

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: { matches } });
}
