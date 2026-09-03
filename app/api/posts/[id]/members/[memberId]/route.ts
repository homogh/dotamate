import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وارد نشدی.", data: null },
      { status: 401 },
    );
  }

  const { id, memberId } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action === "accept" ? "ACCEPTED" : body?.action === "reject" ? "DECLINED" : null;

  if (!action) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "عملیات نامعتبره.", data: null },
      { status: 400 },
    );
  }

  const post = await prisma.post.findUnique({ where: { id: Number(id) } });
  if (!post || post.authorId !== session.id) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "اجازه این کار رو نداری.", data: null },
      { status: 403 },
    );
  }

  const member = await prisma.postMember.findUnique({ where: { id: Number(memberId) } });
  if (!member || member.postId !== post.id) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "درخواست پیدا نشد.", data: null },
      { status: 404 },
    );
  }

  await prisma.$transaction([
    prisma.postMember.update({ where: { id: member.id }, data: { status: action } }),
    prisma.notification.create({
      data: {
        userId: member.userId,
        type: action === "ACCEPTED" ? "REQUEST_ACCEPTED" : "REQUEST_DECLINED",
        title: action === "ACCEPTED" ? "درخواستت قبول شد" : "درخواستت رد شد",
        body: action === "ACCEPTED" ? "می‌تونی وارد اتاق لابی بشی." : null,
        link: action === "ACCEPTED" ? `/dashboard/post/${post.id}` : null,
      },
    }),
  ]);

  if (action === "ACCEPTED") {
    const acceptedCount = await prisma.postMember.count({ where: { postId: post.id, status: "ACCEPTED" } });
    if (acceptedCount + 1 >= post.partySize) {
      await prisma.post.update({ where: { id: post.id }, data: { status: "FULL" } });
    }
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "انجام شد.", data: null });
}
