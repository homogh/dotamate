import { NextRequest, NextResponse } from "next/server";
import type { GameMode, Position, Prisma, Rank, Region } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

const RANK_LABEL: Record<string, string> = {
  UNRANKED: "بدون رنک",
  HERALD: "Herald",
  GUARDIAN: "Guardian",
  CRUSADER: "Crusader",
  ARCHON: "Archon",
  LEGEND: "Legend",
  ANCIENT: "Ancient",
  DIVINE: "Divine",
  IMMORTAL: "Immortal",
};

const POSITION_LABEL: Record<string, string> = {
  POS1: "Pos 1 - Carry",
  POS2: "Pos 2 - Mid",
  POS3: "Pos 3 - Offlane",
  POS4: "Pos 4 - Soft Support",
  POS5: "Pos 5 - Hard Support",
};

const REGION_LABEL: Record<string, string> = {
  EU_WEST: "اروپا غربی",
  EU_EAST: "اروپا شرقی",
  RUSSIA: "روسیه",
  DUBAI: "دبی",
};

const GAME_MODE_LABEL: Record<string, string> = {
  RANKED_ALL_PICK: "Ranked All Pick",
  ALL_PICK: "All Pick",
  TURBO: "Turbo",
  CAPTAINS_MODE: "Captains Mode",
};

const PAGE_SIZE = 6;

// Public counterpart of /api/dashboard/browse — same real Post data, but
// reachable without a session (guests browsing /search-lobby before signup).
// A session, if present, still gets myRequestStatus so a logged-in visitor
// who lands here instead of /dashboard/browse sees accurate button state.
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query")?.trim() ?? "";
  const onlyNow = searchParams.get("onlyNow") === "1";
  const hasVoice = searchParams.get("hasVoice") === "1";
  const gameMode = searchParams.get("gameMode") ?? "";
  const region = searchParams.get("region") ?? "";
  const rank = searchParams.get("rank") ?? "";
  const position = searchParams.get("position") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const where: Prisma.PostWhereInput = {
    status: "ACTIVE",
    ...(onlyNow ? { sessionType: "NOW" as const } : {}),
    ...(hasVoice ? { hasVoice: true } : {}),
    ...(gameMode ? { gameMode: gameMode as GameMode } : {}),
    ...(region ? { region: region as Region } : {}),
    ...(rank ? { rank: rank as Rank } : {}),
    ...(position ? { position: position as Position } : {}),
    ...(query
      ? {
          OR: [
            { description: { contains: query } },
            { author: { displayName: { contains: query } } },
          ],
        }
      : {}),
  };

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      include: { author: true, members: true },
      orderBy: { bumpedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const data = {
    posts: posts.map((post) => ({
      id: post.id,
      authorId: post.author.id,
      authorName: post.author.displayName,
      authorAvatarUrl: post.author.avatarUrl,
      authorRank: RANK_LABEL[post.rank],
      authorRankTier: post.author.rankTier,
      position: POSITION_LABEL[post.position],
      region: REGION_LABEL[post.region],
      gameMode: GAME_MODE_LABEL[post.gameMode],
      description: post.description,
      hasVoice: post.hasVoice,
      sessionType: post.sessionType,
      startAt: post.startAt,
      createdAt: post.createdAt,
      memberCount: post.members.filter((m) => m.status === "ACCEPTED").length + 1,
      partySize: post.partySize,
      isSelf: session ? post.authorId === session.id : false,
      myRequestStatus: session ? (post.members.find((m) => m.userId === session.id)?.status ?? null) : null,
    })),
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
    isLoggedIn: Boolean(session),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
