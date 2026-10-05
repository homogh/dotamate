import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);
  const body = await request.json().catch(() => null);
  const targetUserId = Number(body?.userId);

  const post = await prisma.post.findUnique({ where: { id: postId }, include: { members: true } });
  if (!post || post.authorId !== session.id) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "اجازه این کار رو نداری.", data: null }, { status: 403 });
  }

  const acceptedCount = post.members.filter((m) => m.status === "ACCEPTED").length + 1;
  if (acceptedCount >= post.partySize) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "ظرفیت پارتی پره.", data: null }, { status: 409 });
  }

  const existing = post.members.find((m) => m.userId === targetUserId);
  if (existing && ["PENDING", "ACCEPTED", "INVITED"].includes(existing.status)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این بازیکن قبلاً دعوت شده یا عضوه.", data: null }, { status: 409 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "بازیکن پیدا نشد.", data: null }, { status: 404 });
  }

  // Invitee is not a member yet — they see the lobby (chat blurred) and accept/decline from there.
  await prisma.$transaction([
    existing
      ? prisma.postMember.update({ where: { id: existing.id }, data: { status: "INVITED", position: targetUser.mainPosition ?? null } })
      : prisma.postMember.create({
          data: { postId, userId: targetUserId, status: "INVITED", position: targetUser.mainPosition ?? null },
        }),
    prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "REQUEST_ACCEPTED",
        title: "دعوت به لابی",
        body: `${session.displayName} تو رو به لابیش دعوت کرد. وارد لابی شو و قبول یا رد کن.`,
        link: `/dashboard/post/${postId}`,
      },
    }),
  ]);

  return NextResponse.json<ApiResponse>({ status: "success", message: "دعوت ارسال شد.", data: null });
}
