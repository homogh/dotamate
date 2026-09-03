import { NextRequest, NextResponse } from "next/server";
import type { GameMode } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { GAME_MODE_LABEL } from "@/components/dashboard/postLabels";
import type { ApiResponse } from "@/app/types/api";

function statusLabel(status: string) {
  if (status === "CANCELLED") return { label: "لغو‌شده توسط مدیر", cls: "bg-danger/[0.12] text-danger" };
  if (status === "COMPLETED") return { label: "کامل‌شده", cls: "bg-transparent text-text-dim" };
  return null;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "SESSIONS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const gameMode = request.nextUrl.searchParams.get("gameMode") ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "";

  const [activeCount, sessions] = await Promise.all([
    prisma.post.count({ where: { sessionType: "SCHEDULED", status: { in: ["ACTIVE", "FULL"] } } }),
    prisma.post.findMany({
      where: {
        sessionType: "SCHEDULED",
        ...(gameMode ? { gameMode: gameMode as GameMode } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: { author: true, members: true },
      orderBy: { startAt: "asc" },
      take: 50,
    }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      activeCount,
      sessions: sessions.map((s) => {
        const accepted = s.members.filter((m) => m.status === "ACCEPTED").length + 1;
        return {
          id: s.id,
          status: s.status,
          statusOverride: statusLabel(s.status),
          memberCount: accepted,
          partySize: s.partySize,
          gameMode: GAME_MODE_LABEL[s.gameMode],
          startAt: s.startAt,
          hostName: s.author.displayName,
        };
      }),
    },
  });
}
