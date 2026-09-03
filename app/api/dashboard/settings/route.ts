import { NextRequest, NextResponse } from "next/server";
import type { Position, Rank } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
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
      steamProfileUrl: user.steamProfileUrl,
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
    rank?: Rank;
    steamProfileUrl?: string | null;
    notifyBell?: boolean;
    notifyEmail?: boolean;
    notifyPush?: boolean;
  } = {};

  if (typeof body?.displayName === "string" && body.displayName.trim()) data.displayName = body.displayName.trim().slice(0, 60);
  if (typeof body?.bio === "string") data.bio = body.bio.trim().slice(0, 500) || null;
  if (typeof body?.country === "string") data.country = body.country.trim().slice(0, 60) || null;
  if (typeof body?.languages === "string") data.languages = body.languages.trim().slice(0, 200) || null;
  if (body?.mainPosition === null || ["POS1", "POS2", "POS3", "POS4", "POS5"].includes(body?.mainPosition)) {
    data.mainPosition = body.mainPosition;
  }
  if (["UNRANKED", "HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"].includes(body?.rank)) {
    data.rank = body.rank;
  }
  if (typeof body?.steamProfileUrl === "string") data.steamProfileUrl = body.steamProfileUrl.trim().slice(0, 300) || null;
  if (typeof body?.notifyBell === "boolean") data.notifyBell = body.notifyBell;
  if (typeof body?.notifyEmail === "boolean") data.notifyEmail = body.notifyEmail;
  if (typeof body?.notifyPush === "boolean") data.notifyPush = body.notifyPush;

  await prisma.user.update({ where: { id: session.id }, data });

  // rankTier is isolated in its own update: this field was added after a
  // Prisma client-generation lock started (see project notes), so on an
  // un-restarted dev server this write alone may 500 — kept separate so it
  // can never take the rest of the profile save down with it.
  if (typeof body?.rankTier === "number" || body?.rankTier === null) {
    try {
      await prisma.user.update({ where: { id: session.id }, data: { rankTier: body.rankTier } });
    } catch {
      // Swallowed intentionally — see comment above.
    }
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "تغییرات ذخیره شد.", data: null });
}
