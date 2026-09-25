import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وارد نشدی.", data: null },
      { status: 401 },
    );
  }

  const { id } = await params;
  const postId = Number(id);

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post || post.status !== "ACTIVE") {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "این پست دیگه فعال نیست.", data: null },
      { status: 404 },
    );
  }

  if (post.authorId === session.id) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "نمی‌تونی به پست خودت درخواست بدی.", data: null },
      { status: 400 },
    );
  }

  
  const ownPost = await prisma.post.findFirst({
    where: {
      authorId: session.id,
      status: { in: ["ACTIVE", "FULL"] },
    },
  });

  if (ownPost) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "شما الان یه پارتی فعال دارید.", data: null },
      { status: 409 },
    );
  }


  const otherMembership = await prisma.postMember.findFirst({
    where: {
      userId: session.id,
      status: "ACCEPTED",
      post: { status: { in: ["ACTIVE", "FULL"] } },
    },
  });

  if (otherMembership) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "شما در حال حاضر عضو یه پارتی هستید.", data: null },
      { status: 409 },
    );
  }

  const existing = await prisma.postMember.findUnique({
    where: { postId_userId: { postId, userId: session.id } },
  });

  if (existing) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "قبلاً برای این پست درخواست دادی.", data: null },
      { status: 409 },
    );
  }

  // The joiner's profile main position is the slot they'll fill on accept.
  const joiner = await prisma.user.findUnique({ where: { id: session.id }, select: { mainPosition: true } });

  const [member] = await prisma.$transaction([
    prisma.postMember.create({
      data: { postId, userId: session.id, status: "PENDING", position: joiner?.mainPosition ?? null },
    }),
    prisma.notification.create({
      data: {
        userId: post.authorId,
        type: "POST_REQUEST",
        title: "درخواست عضویت جدید",
        body: `${session.displayName} درخواست عضویت به پستت داد.`,
        link: `/dashboard/post/${postId}`,
      },
    }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "درخواست عضویت ارسال شد.",
    data: { id: member.id, status: member.status },
  });
}