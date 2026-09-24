import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getItemLookup, openDotaFetch } from "@/app/lib/opendota";
import { steamId64ToAccountId } from "@/app/lib/steam";
import type { ApiResponse } from "@/app/types/api";

const ITEM_SLOTS = ["item_0", "item_1", "item_2", "item_3", "item_4", "item_5"] as const;

// A finished match's own stats never change, so this is safe to let Next
// cache — unlike the profile's own live sync, which intentionally isn't.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id, matchId } = await params;
  const userId = Number(id);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { steamId: true } });
  if (!user?.steamId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  const accountId = steamId64ToAccountId(user.steamId);

  const res = await openDotaFetch(`/matches/${matchId}`);
  if (!res?.ok) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "دریافت جزئیات مچ از OpenDota ناموفق بود.", data: null },
      { status: 502 },
    );
  }

  const match = await res.json().catch(() => null);
  const players = Array.isArray(match?.players) ? (match.players as Record<string, unknown>[]) : [];
  const player = players.find((p) => Number(p.account_id) === accountId);

  if (!player) {
    return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: { items: [], neutralItem: null } });
  }

  const itemLookup = await getItemLookup();

  const items = ITEM_SLOTS.map((slot) => Number(player[slot] ?? 0))
    .filter((itemId) => itemId > 0)
    .map((itemId) => itemLookup[itemId] ?? { id: itemId, name: `Item ${itemId}`, img: "", cost: null });

  const neutralItemId = Number(player.item_neutral ?? 0);
  const neutralItem = neutralItemId > 0 ? (itemLookup[neutralItemId] ?? null) : null;

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: { items, neutralItem } });
}
