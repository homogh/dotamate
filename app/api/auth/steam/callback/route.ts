import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { fetchSteamPlayerSummary, verifySteamOpenIdCallback } from "@/app/lib/steam";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const steamId64 = await verifySteamOpenIdCallback(request.nextUrl.searchParams);
  if (!steamId64) {
    return NextResponse.redirect(new URL("/signup/steam?error=steam_verify_failed", request.url));
  }

  const existingOwner = await prisma.user.findUnique({ where: { steamId: steamId64 } });
  if (existingOwner && existingOwner.id !== session.id) {
    return NextResponse.redirect(new URL("/signup/steam?error=steam_already_linked", request.url));
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

  return NextResponse.redirect(new URL("/signup/steam?connected=1", request.url));
}
