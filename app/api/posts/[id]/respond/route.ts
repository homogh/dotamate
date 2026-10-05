import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

// The invited player accepts or declines the host's direct invite.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);
  const body = await request.json().catch(() => null);
  const accept = body?.action === "accept";
  if (!accept && body?.action !== "decline") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "عملیات نامعتبره.", data: null }, { status: 400 });
  }

  const member = await prisma.postMember.findUnique({
    where: { postId_userId: { postId, userId: session.id } },
    include: { post: true },
  });
  if (!member || member.status !== "INVITED") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دعوتی برای تو وجود نداره.", data: null }, { status: 404 });
  }

  const post = member.post;

  if (accept) {
    if (post.status !== "ACTIVE") {
      return NextResponse.json<ApiResponse>({ status: "error", message: "این لابی دیگه فعال نیست.", data: null }, { status: 409 });
    }

    const acceptedCount = await prisma.postMember.count({ where: { postId, status: "ACCEPTED" } });
    if (acceptedCount + 1 >= post.partySize) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "ظرفیت پارتی پره.", data: null }, { status: 409 });
    }

    const busy =
      (await prisma.post.findFirst({ where: { authorId: session.id, status: { in: ["ACTIVE", "FULL"] } } })) ??
      (await prisma.postMember.findFirst({
        where: { userId: session.id, status: "ACCEPTED", post: { status: { in: ["ACTIVE", "FULL"] } } },
      }));
    if (busy) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "تو الان تو یه لابی دیگه‌ای؛ اول از اون خارج شو.", data: null },
        { status: 409 },
      );
    }
  }

  await prisma.$transaction([
    prisma.postMember.update({ where: { id: member.id }, data: { status: accept ? "ACCEPTED" : "DECLINED" } }),
    prisma.notification.create({
      data: {
        userId: post.authorId,
        type: accept ? "REQUEST_ACCEPTED" : "REQUEST_DECLINED",
        title: accept ? "دعوتت قبول شد" : "دعوتت رد شد",
        body: `${session.displayName} دعوت به لابی رو ${accept ? "قبول" : "رد"} کرد.`,
        link: `/dashboard/post/${postId}`,
      },
    }),
    prisma.message.create({
      data: {
        postId,
        senderId: session.id,
        body: `${session.displayName} دعوت به پارتی رو ${accept ? "قبول کرد" : "رد کرد"}`,
        system: true,
      },
    }),
  ]);

  if (accept) {
    const acceptedCount = await prisma.postMember.count({ where: { postId, status: "ACCEPTED" } });
    if (acceptedCount + 1 >= post.partySize) {
      await prisma.post.update({ where: { id: postId }, data: { status: "FULL" } });
    }
    await prisma.postMember.updateMany({
      where: { userId: session.id, status: { in: ["PENDING", "INVITED"] }, NOT: { postId } },
      data: { status: "DECLINED" },
    });
  }

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: accept ? "به پارتی پیوستی." : "دعوت رد شد.",
    data: null,
  });
}
