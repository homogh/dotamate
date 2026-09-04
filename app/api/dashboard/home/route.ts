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

const REGION_LABEL: Record<string, string> = {
  EU_WEST: "اروپا غربی",
  EU_EAST: "اروپا شرقی",
  RUSSIA: "روسیه",
  DUBAI: "دبی",
};

// Dota matches average ~40min; used only to turn "accepted joins this week"
// into a rough playtime estimate since we don't track real match duration.
const AVG_SESSION_HOURS = 0.66;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وارد نشدی.", data: null },
      { status: 401 },
    );
  }

  const userId = session.id;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [user, activePost, recommendedPosts, upcomingSessions, activePostCount, acceptedJoinsTotal, acceptedJoinsThisWeek] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.post.findFirst({
        where: { authorId: userId, status: "ACTIVE" },
        include: { members: true },
        orderBy: { bumpedAt: "desc" },
      }),
      prisma.post.findMany({
        where: { authorId: { not: userId }, status: "ACTIVE" },
        include: { author: true, members: true },
        orderBy: { bumpedAt: "desc" },
        take: 3,
      }),
      prisma.postMember.findMany({
        where: { userId, status: "ACCEPTED", post: { sessionType: "SCHEDULED", startAt: { gte: new Date() } } },
        include: { post: true },
        orderBy: { post: { startAt: "asc" } },
        take: 2,
      }),
      prisma.post.count({ where: { authorId: userId, status: "ACTIVE" } }),
      prisma.postMember.count({ where: { userId, status: "ACCEPTED" } }),
      prisma.postMember.count({
        where: { userId, status: "ACCEPTED", createdAt: { gte: weekAgo } },
      }),
    ]);

  if (!user) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "کاربر پیدا نشد.", data: null },
      { status: 404 },
    );
  }

  const data = {
    user: {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      rank: user.rank,
      rankLabel: RANK_LABEL[user.rank],
      rankTier: user.rankTier,
      rankVerification: user.rankVerification,
      mainPosition: user.mainPosition,
    },
    stats: {
      rankLabel: RANK_LABEL[user.rank],
      rankTier: user.rankTier,
      hoursThisWeek: Math.round(acceptedJoinsThisWeek * AVG_SESSION_HOURS * 10) / 10,
      gamesFoundTotal: acceptedJoinsTotal,
    },
    activePost: activePost
      ? {
          id: activePost.id,
          description: activePost.description,
          createdAt: activePost.createdAt,
          partySize: activePost.partySize,
          memberCount: activePost.members.filter((m) => m.status === "ACCEPTED").length + 1,
          emptyPositions: [] as string[],
        }
      : null,
    activePostCount,
    recommendedPosts: recommendedPosts.map((post) => ({
      id: post.id,
      authorId: post.author.id,
      authorName: post.author.displayName,
      authorAvatarUrl: post.author.avatarUrl,
      authorRank: RANK_LABEL[post.rank],
      authorRankTier: post.author.rankTier,
      position: POSITION_LABEL[post.position],
      region: REGION_LABEL[post.region],
      memberCount: post.members.filter((m) => m.status === "ACCEPTED").length + 1,
      partySize: post.partySize,
      createdAt: post.createdAt,
      myRequestStatus: post.members.find((m) => m.userId === userId)?.status ?? null,
    })),
    upcomingSessions: upcomingSessions.map((member) => ({
      id: member.post.id,
      title: member.post.description.slice(0, 40),
      gameMode: member.post.gameMode,
      startAt: member.post.startAt,
    })),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
