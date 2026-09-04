import { NextRequest, NextResponse } from "next/server";

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

const ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const [favorites, myActivePost] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: session.id },
      include: { favoriteUser: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findFirst({
      where: { authorId: session.id, status: "ACTIVE" },
      include: { members: true },
    }),
  ]);

  const data = await Promise.all(
    favorites.map(async (fav) => {
      const target = fav.favoriteUser;

      const [lastTogetherAsMember, lastTogetherAsHost, activePost] = await Promise.all([
        prisma.postMember.findFirst({
          where: { userId: target.id, status: "ACCEPTED", post: { authorId: session.id } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.postMember.findFirst({
          where: { userId: session.id, status: "ACCEPTED", post: { authorId: target.id } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.post.findFirst({
          where: { authorId: target.id, status: "ACTIVE", sessionType: "NOW", createdAt: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } },
        }),
      ]);

      const lastTogether = [lastTogetherAsMember?.createdAt, lastTogetherAsHost?.createdAt]
        .filter(Boolean)
        .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;

      return {
        favoriteId: fav.id,
        userId: target.id,
        displayName: target.displayName,
        avatarUrl: target.avatarUrl,
        rank: RANK_LABEL[target.rank],
        rankTier: target.rankTier,
        mainPosition: target.mainPosition ? POSITION_LABEL[target.mainPosition] : null,
        languages: target.languages ? target.languages.split(",").map((l) => l.trim()).filter(Boolean) : [],
        note: fav.note,
        lastPlayedTogether: lastTogether ?? null,
        online: Boolean(activePost),
      };
    }),
  );

  const myActivePostData = myActivePost
    ? {
        id: myActivePost.id,
        hasOpenSlot: myActivePost.members.filter((m) => m.status === "ACCEPTED").length + 1 < myActivePost.partySize,
      }
    : null;

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: { favorites: data, myActivePost: myActivePostData } });
}
