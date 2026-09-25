import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { findFriendship } from "@/app/lib/friends";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const targetUserId = Number(body?.userId);

  if (!targetUserId || targetUserId === session.id) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر نامعتبره.", data: null }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser || targetUser.banned) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: session.id, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: session.id },
      ],
    },
  });
  if (block) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "امکان ارسال درخواست دوستی به این کاربر نیست.", data: null }, { status: 403 });
  }

  const existing = await findFriendship(session.id, targetUserId);

  if (existing?.status === "ACCEPTED") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "از قبل با هم دوستید.", data: null }, { status: 409 });
  }

  if (existing && existing.requesterId === session.id) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "درخواستت قبلاً ارسال شده.", data: null }, { status: 409 });
  }

  // They already asked us. Never turn this into an accept — only an explicit
  // PATCH from the addressee (/api/friends/requests/[id]) creates a friendship.
  if (existing) {
    return NextResponse.json<ApiResponse>(
      {
        status: "error",
        message: "این کاربر قبلاً برات درخواست دوستی فرستاده — از اعلان‌ها یا صفحه دوستان جوابش رو بده.",
        data: { state: "INCOMING", requestId: existing.id },
      },
      { status: 409 },
    );
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: session.id, addresseeId: targetUserId },
  });

  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: "FRIEND_REQUEST",
      title: `${session.displayName} برات درخواست دوستی فرستاد`,
      link: `/dashboard/profile/${session.id}`,
      friendshipId: friendship.id,
    },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "درخواست دوستی ارسال شد.", data: { state: "OUTGOING", requestId: friendship.id } });
}
