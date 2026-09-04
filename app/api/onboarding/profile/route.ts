import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

const VALID_RANKS = ["UNRANKED", "HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"];
const VALID_POSITIONS = ["POS1", "POS2", "POS3", "POS4", "POS5"];

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }
  if (!user.matchDataVerified && !user.matchGateOverride) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "اول باید اتصال استیمت تایید بشه.", data: null },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const rank = String(body?.rank ?? "");
  const mainPosition = String(body?.mainPosition ?? "");
  const rankTier = body?.rankTier != null ? Number(body.rankTier) : null;

  if (!VALID_RANKS.includes(rank) || !VALID_POSITIONS.includes(mainPosition)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "رنک و پز رو درست انتخاب کن.", data: null }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.id },
    data: {
      rank: rank as never,
      mainPosition: mainPosition as never,
      rankTier: rankTier && rankTier >= 1 && rankTier <= 5 ? rankTier : null,
      profileCompletedAt: new Date(),
    },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "پروفایلت آماده شد.", data: null });
}
