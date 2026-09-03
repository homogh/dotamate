import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

const GAME_MODE_LABEL: Record<string, string> = {
  RANKED_ALL_PICK: "Ranked All Pick",
  ALL_PICK: "All Pick",
  TURBO: "Turbo",
  CAPTAINS_MODE: "Captains Mode",
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const [user, hosted, joinedMemberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id } }),
    prisma.post.findMany({
      where: { authorId: session.id, sessionType: "SCHEDULED", status: { in: ["ACTIVE", "FULL"] } },
      include: { members: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.postMember.findMany({
      where: { userId: session.id, status: "ACCEPTED", post: { sessionType: "SCHEDULED", status: { in: ["ACTIVE", "FULL"] } } },
      include: { post: { include: { author: true, members: true } } },
      orderBy: { post: { startAt: "asc" } },
    }),
  ]);

  const mapSession = (post: {
    id: number;
    description: string;
    startAt: Date | null;
    gameMode: string;
    partySize: number;
    status: string;
    members: { status: string }[];
  }, hostName: string, isSelf: boolean) => ({
    id: post.id,
    title: post.description.slice(0, 60),
    startAt: post.startAt,
    gameMode: GAME_MODE_LABEL[post.gameMode],
    memberCount: post.members.filter((m) => m.status === "ACCEPTED").length + 1,
    partySize: post.partySize,
    confirmed: post.status === "FULL",
    hostName: isSelf ? "شما (میزبان)" : hostName,
  });

  const data = {
    reminderEnabled: user?.sessionReminderEnabled ?? true,
    reminderMinutes: user?.sessionReminderMinutes ?? 15,
    hosted: hosted.map((p) => mapSession(p, "شما", true)),
    joined: joinedMemberships.map((m) => mapSession(m.post, m.post.author.displayName, false)),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const data: { sessionReminderEnabled?: boolean; sessionReminderMinutes?: number } = {};
  if (typeof body?.reminderEnabled === "boolean") data.sessionReminderEnabled = body.reminderEnabled;
  if (typeof body?.reminderMinutes === "number") data.sessionReminderMinutes = body.reminderMinutes;

  await prisma.user.update({ where: { id: session.id }, data });

  return NextResponse.json<ApiResponse>({ status: "success", message: "ذخیره شد.", data: null });
}
