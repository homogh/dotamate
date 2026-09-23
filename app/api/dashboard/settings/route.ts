import { NextRequest, NextResponse } from "next/server";
import type { Position } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

const TRADE_URL_PATTERN = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=(\d+)&token=([A-Za-z0-9_-]+)$/;
// A Trade URL's `partner` is the 32-bit account ID: SteamID64 minus this base.
const STEAM_ID64_BASE = BigInt("76561197960265728");

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

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      displayName: user.displayName,
      bio: user.bio,
      country: user.country,
      languages: user.languages,
      mainPosition: user.mainPosition,
      rank: user.rank,
      rankTier: user.rankTier,
      rankVerification: user.rankVerification,
      steamProfileUrl: user.steamProfileUrl,
      steamTradeUrl: user.steamTradeUrl,
      avatarUrl: user.avatarUrl,
      notifyBell: user.notifyBell,
      notifyEmail: user.notifyEmail,
      notifyPush: user.notifyPush,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const data: {
    displayName?: string;
    bio?: string | null;
    country?: string | null;
    languages?: string | null;
    mainPosition?: Position | null;
    notifyBell?: boolean;
    notifyEmail?: boolean;
    notifyPush?: boolean;
    steamTradeUrl?: string | null;
  } = {};

  if (typeof body?.displayName === "string" && body.displayName.trim()) data.displayName = body.displayName.trim().slice(0, 60);
  if (typeof body?.bio === "string") data.bio = body.bio.trim().slice(0, 500) || null;
  if (typeof body?.country === "string") data.country = body.country.trim().slice(0, 60) || null;
  if (typeof body?.languages === "string") data.languages = body.languages.trim().slice(0, 200) || null;
  if (body?.mainPosition === null || ["POS1", "POS2", "POS3", "POS4", "POS5"].includes(body?.mainPosition)) {
    data.mainPosition = body.mainPosition;
  }
  if (typeof body?.notifyBell === "boolean") data.notifyBell = body.notifyBell;
  if (typeof body?.notifyEmail === "boolean") data.notifyEmail = body.notifyEmail;
  if (typeof body?.notifyPush === "boolean") data.notifyPush = body.notifyPush;

  if (typeof body?.steamTradeUrl === "string") {
    const url = body.steamTradeUrl.trim();
    if (!url) {
      data.steamTradeUrl = null;
    } else {
      const match = url.match(TRADE_URL_PATTERN);
      if (!match) {
        return NextResponse.json<ApiResponse>({ status: "error", message: "Trade URL معتبر نیست.", data: null }, { status: 400 });
      }
      const owner = await prisma.user.findUnique({ where: { id: session.id }, select: { steamId: true } });
      if (owner?.steamId && BigInt(owner.steamId) - STEAM_ID64_BASE !== BigInt(match[1])) {
        return NextResponse.json<ApiResponse>(
          { status: "error", message: "این Trade URL متعلق به اکانت استیمی که به حسابت وصل است نیست.", data: null },
          { status: 400 },
        );
      }
      data.steamTradeUrl = url;
    }
  }

  // rank / rankTier are never accepted here — they're derived from OpenDota
  // (see /api/onboarding/steam/verify and /api/users/[id]), never self-declared.
  await prisma.user.update({ where: { id: session.id }, data });

  return NextResponse.json<ApiResponse>({ status: "success", message: "تغییرات ذخیره شد.", data: null });
}
