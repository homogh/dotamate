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
  if (existing) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این بازیکن قبلاً دعوت شده یا عضوه.", data: null }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.postMember.create({ data: { postId, userId: targetUserId, status: "ACCEPTED" } }),
    prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "REQUEST_ACCEPTED",
        title: "دعوت به لابی",
        body: "میزبان مستقیم تو رو به پارتیش اضافه کرد.",
        link: `/dashboard/post/${postId}`,
      },
    }),
  ]);

  return NextResponse.json<ApiResponse>({ status: "success", message: "دعوت ارسال شد.", data: null });
}
