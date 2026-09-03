import { NextRequest, NextResponse } from "next/server";
import type { GameMode, Position, Rank, Region, SessionType } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

const POSITIONS = ["POS1", "POS2", "POS3", "POS4", "POS5"];
const RANKS = ["UNRANKED", "HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"];
const GAME_MODES = ["RANKED_ALL_PICK", "ALL_PICK", "TURBO", "CAPTAINS_MODE"];
const REGIONS = ["EU_WEST", "EU_EAST", "RUSSIA", "DUBAI"];

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وارد نشدی.", data: null },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const position = String(body?.position ?? "");
  const rank = String(body?.rank ?? "");
  const gameMode = String(body?.gameMode ?? "");
  const region = String(body?.region ?? "");
  const sessionType = body?.sessionType === "SCHEDULED" ? "SCHEDULED" : "NOW";
  const startAt = body?.startAt ? new Date(body.startAt) : null;
  const partySize = Math.min(5, Math.max(2, Number(body?.partySize) || 5));
  const hasVoice = Boolean(body?.hasVoice);
  const description = String(body?.description ?? "").trim();

  if (!POSITIONS.includes(position) || !RANKS.includes(rank) || !GAME_MODES.includes(gameMode) || !REGIONS.includes(region)) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "اطلاعات پست ناقصه.", data: null },
      { status: 400 },
    );
  }

  if (!description || description.length < 10) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "توضیحات پست باید حداقل ۱۰ کاراکتر باشه.", data: null },
      { status: 400 },
    );
  }

  if (sessionType === "SCHEDULED" && (!startAt || Number.isNaN(startAt.getTime()))) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "زمان جلسه رو مشخص کن.", data: null },
      { status: 400 },
    );
  }

  const existingActive = await prisma.post.findFirst({
    where: { authorId: session.id, status: "ACTIVE" },
  });

  if (existingActive) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "فقط یک پست فعال می‌تونی داشته باشی.", data: null },
      { status: 409 },
    );
  }

  const post = await prisma.post.create({
    data: {
      authorId: session.id,
      position: position as Position,
      rank: rank as Rank,
      gameMode: gameMode as GameMode,
      region: region as Region,
      sessionType: sessionType as SessionType,
      startAt: sessionType === "SCHEDULED" ? startAt : null,
      partySize,
      hasVoice,
      description,
    },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "پست با موفقیت ساخته شد.",
    data: { id: post.id },
  });
}
