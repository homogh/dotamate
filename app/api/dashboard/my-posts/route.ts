import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

const TAB_STATUS: Record<string, string[]> = {
  active: ["ACTIVE", "FULL"],
  completed: ["COMPLETED"],
  expired: ["EXPIRED", "CANCELLED"],
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وارد نشدی.", data: null },
      { status: 401 },
    );
  }

  const tab = request.nextUrl.searchParams.get("tab") ?? "active";
  const statuses = TAB_STATUS[tab] ?? TAB_STATUS.active;

  const [posts, totalCount, activeCount, completedCount, expiredCount] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: session.id, status: { in: statuses as never[] } },
      include: { members: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.count({ where: { authorId: session.id } }),
    prisma.post.count({ where: { authorId: session.id, status: { in: ["ACTIVE", "FULL"] } } }),
    prisma.post.count({ where: { authorId: session.id, status: "COMPLETED" } }),
    prisma.post.count({ where: { authorId: session.id, status: { in: ["EXPIRED", "CANCELLED"] } } }),
  ]);

  const data = {
    posts: posts.map((post) => ({
      id: post.id,
      position: post.position,
      rank: post.rank,
      gameMode: post.gameMode,
      region: post.region,
      sessionType: post.sessionType,
      startAt: post.startAt,
      status: post.status,
      description: post.description,
      hasVoice: post.hasVoice,
      partySize: post.partySize,
      createdAt: post.createdAt,
      filledPositions: post.members.filter((m) => m.status === "ACCEPTED" && m.position).map((m) => m.position),
      memberCount: post.members.filter((m) => m.status === "ACCEPTED").length + 1,
      pendingCount: post.members.filter((m) => m.status === "PENDING").length,
    })),
    counts: { total: totalCount, active: activeCount, completed: completedCount, expired: expiredCount },
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
