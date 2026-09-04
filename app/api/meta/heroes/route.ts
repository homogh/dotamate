import { NextRequest, NextResponse } from "next/server";

import { getHeroStats } from "@/app/lib/opendota";
import type { ApiResponse } from "@/app/types/api";

const RANK_BRACKETS: Record<string, number[]> = {
  all: [1, 2, 3, 4, 5, 6, 7, 8],
  herald: [1],
  guardian: [2],
  crusader: [3],
  archon: [4],
  legend: [5],
  ancient: [6],
  divine: [7],
  immortal: [8],
};

export async function GET(request: NextRequest) {
  const rankParam = request.nextUrl.searchParams.get("rank") ?? "all";
  const brackets = RANK_BRACKETS[rankParam] ?? RANK_BRACKETS.all;

  const heroes = await getHeroStats();
  if (heroes.length === 0) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "دریافت آمار از OpenDota ناموفق بود، دوباره امتحان کن.", data: null },
      { status: 502 },
    );
  }

  // Pick rate needs a denominator OpenDota doesn't publish directly: every
  // match features exactly 10 hero picks, so summing all heroes' picks in
  // this bracket and dividing by 10 approximates total matches played.
  const totalPicksInBracket = heroes.reduce(
    (sum, h) => sum + h.brackets.filter((b) => brackets.includes(b.bracket)).reduce((s, b) => s + b.picks, 0),
    0,
  );
  const approxMatches = Math.max(1, totalPicksInBracket / 10);

  const computed = heroes.map((h) => {
    const relevant = h.brackets.filter((b) => brackets.includes(b.bracket));
    const picks = relevant.reduce((s, b) => s + b.picks, 0);
    const wins = relevant.reduce((s, b) => s + b.wins, 0);
    const winRate = picks > 0 ? (wins / picks) * 100 : 0;
    const pickRate = (picks / approxMatches) * 100;

    return {
      id: h.id,
      name: h.localizedName,
      img: h.img,
      icon: h.icon,
      primaryAttr: h.primaryAttr,
      attackType: h.attackType,
      roles: h.roles,
      picks,
      winRate: Math.round(winRate * 10) / 10,
      pickRate: Math.round(pickRate * 100) / 100,
    };
  });

  const withSample = computed.filter((h) => h.picks >= 20).sort((a, b) => b.winRate - a.winRate);

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: withSample });
}
