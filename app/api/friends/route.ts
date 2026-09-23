import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { isOnline } from "@/app/lib/friends";
import type { ApiResponse } from "@/app/types/api";

const USER_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
  rank: true,
  rankTier: true,
  mainPosition: true,
  behaviorScore: true,
  lastActiveAt: true,
} as const;

type FriendUser = {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  rank: string;
  rankTier: number | null;
  mainPosition: string | null;
  behaviorScore: number;
  lastActiveAt: Date | null;
};

function toFriendItem(user: FriendUser) {
  return {
    userId: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    rank: user.rank,
    rankTier: user.rankTier,
    mainPosition: user.mainPosition,
    behaviorScore: user.behaviorScore,
    online: isOnline(user.lastActiveAt),
    lastActiveAt: user.lastActiveAt,
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: session.id }, { addresseeId: session.id }] },
    include: { requester: { select: USER_SELECT }, addressee: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  const friends = friendships
    .filter((f) => f.status === "ACCEPTED")
    .map((f) => toFriendItem(f.requesterId === session.id ? f.addressee : f.requester))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName));

  const incoming = friendships
    .filter((f) => f.status === "PENDING" && f.addresseeId === session.id)
    .map((f) => ({ requestId: f.id, createdAt: f.createdAt, ...toFriendItem(f.requester) }));

  const outgoing = friendships
    .filter((f) => f.status === "PENDING" && f.requesterId === session.id)
    .map((f) => ({ requestId: f.id, createdAt: f.createdAt, ...toFriendItem(f.addressee) }));

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: { friends, incoming, outgoing } });
}
