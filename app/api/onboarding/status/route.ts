import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { fetchSteamPlayerSummary } from "@/app/lib/steam";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  const steamSummary = user.steamId ? await fetchSteamPlayerSummary(user.steamId) : null;

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      steamConnected: Boolean(user.steamId),
      matchDataVerified: user.matchDataVerified,
      matchGateOverride: user.matchGateOverride,
      profileCompletedAt: user.profileCompletedAt,
      steamName: steamSummary?.personaname ?? null,
      steamAvatar: steamSummary?.avatarfull ?? null,
    },
  });
}
