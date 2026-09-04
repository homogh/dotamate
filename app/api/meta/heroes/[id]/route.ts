import { NextRequest, NextResponse } from "next/server";

import { getHeroItemPopularity, getHeroStats, getItemLookup } from "@/app/lib/opendota";
import type { ApiResponse } from "@/app/types/api";

const BRACKET_LABEL: Record<number, string> = {
  1: "Herald",
  2: "Guardian",
  3: "Crusader",
  4: "Archon",
  5: "Legend",
  6: "Ancient",
  7: "Divine",
  8: "Immortal",
};

const PHASE_LABEL: Record<string, string> = {
  start_game_items: "شروع بازی",
  early_game_items: "اوایل بازی",
  mid_game_items: "میان‌بازی",
  late_game_items: "پایان بازی",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const heroId = Number(id);

  const [heroes, itemPopularity, items] = await Promise.all([
    getHeroStats(),
    getHeroItemPopularity(heroId),
    getItemLookup(),
  ]);

  const hero = heroes.find((h) => h.id === heroId);
  if (!hero) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "هیرو پیدا نشد.", data: null }, { status: 404 });
  }

  const totalPicks = hero.brackets.reduce((s, b) => s + b.picks, 0);
  const totalWins = hero.brackets.reduce((s, b) => s + b.wins, 0);

  const data = {
    id: hero.id,
    name: hero.localizedName,
    img: hero.img,
    icon: hero.icon,
    primaryAttr: hero.primaryAttr,
    attackType: hero.attackType,
    roles: hero.roles,
    overallWinRate: totalPicks > 0 ? Math.round((totalWins / totalPicks) * 1000) / 10 : 0,
    byBracket: hero.brackets.map((b) => ({
      bracket: BRACKET_LABEL[b.bracket],
      picks: b.picks,
      winRate: b.picks > 0 ? Math.round((b.wins / b.picks) * 1000) / 10 : 0,
    })),
    pro: {
      picks: hero.proPicks,
      wins: hero.proWins,
      bans: hero.proBans,
      winRate: hero.proPicks > 0 ? Math.round((hero.proWins / hero.proPicks) * 1000) / 10 : 0,
    },
    itemBuild: Object.entries(itemPopularity).map(([phase, entries]) => ({
      phase: PHASE_LABEL[phase] ?? phase,
      items: entries.map((e) => ({
        id: e.itemId,
        count: e.count,
        name: items[e.itemId]?.name ?? `Item ${e.itemId}`,
        img: items[e.itemId]?.img ?? "",
        cost: items[e.itemId]?.cost ?? null,
      })),
    })),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
