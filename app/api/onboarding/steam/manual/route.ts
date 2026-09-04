import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { fetchSteamPlayerSummary, resolveSteamInput } from "@/app/lib/steam";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const input = String(body?.input ?? "").trim();
  if (!input) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "لینک یا آیدی استیم رو وارد کن.", data: null }, { status: 400 });
  }

  const steamId64 = await resolveSteamInput(input);
  if (!steamId64) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "لینک یا آیدی استیم معتبر نیست. لینک کامل پروفایلت رو امتحان کن.", data: null },
      { status: 400 },
    );
  }

  const existingOwner = await prisma.user.findUnique({ where: { steamId: steamId64 } });
  if (existingOwner && existingOwner.id !== session.id) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "این اکانت استیم قبلاً به یه حساب دیگه توی دوتامیت وصل شده.", data: null },
      { status: 409 },
    );
  }

  const summary = await fetchSteamPlayerSummary(steamId64);

  await prisma.user.update({
    where: { id: session.id },
    data: {
      steamId: steamId64,
      steamProfileUrl: summary?.profileurl ?? `https://steamcommunity.com/profiles/${steamId64}`,
      avatarUrl: summary?.avatarfull ?? null,
      displayName: summary?.personaname || undefined,
      matchDataVerified: false,
    },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "استیم متصل شد.", data: null });
}
