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
  const action =
    body?.action === "accept" ? "ACCEPTED" : body?.action === "reject" ? "DECLINED" : body?.action === "kick" ? "REMOVED" : null;

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

  const member = await prisma.postMember.findUnique({ where: { id: Number(memberId) }, include: { user: true } });
  if (!member || member.postId !== post.id) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "درخواست پیدا نشد.", data: null },
      { status: 404 },
    );
  }

  if ((action === "ACCEPTED" || action === "DECLINED") && member.status !== "PENDING") {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "این درخواست قبلاً بررسی شده.", data: null },
      { status: 409 },
    );
  }

  if (action === "REMOVED" && member.status !== "ACCEPTED") {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "این عضو در حال حاضر توی پارتی نیست.", data: null },
      { status: 409 },
    );
  }


  if (action === "ACCEPTED") {
    const otherMembership = await prisma.postMember.findFirst({
      where: {
        userId: member.userId,
        status: "ACCEPTED",
        post: { status: { in: ["ACTIVE", "FULL"] } },
        NOT: { id: member.id },
      },
    });

    if (otherMembership) {

      await prisma.postMember.update({
        where: { id: member.id },
        data: { status: "DECLINED" },
      });

      return NextResponse.json<ApiResponse>(
        { status: "error", message: "این پلیر هم اکنون عضو یه پارتی دیگست.", data: null },
        { status: 409 },
      );
    }
  }


  const logBody =
    action === "ACCEPTED"
      ? `${session.displayName} درخواست ${member.user.displayName} رو قبول کرد`
      : action === "DECLINED"
        ? `${session.displayName} درخواست ${member.user.displayName} رو رد کرد`
        : `${member.user.displayName} از پارتی کیک شد`;

  await prisma.$transaction([
    prisma.postMember.update({
      where: { id: member.id },
      data: {
        status: action,
        // Requests from before positions were recorded fall back to the profile's main position.
        ...(action === "ACCEPTED" && !member.position ? { position: member.user.mainPosition } : {}),
      },
    }),
    prisma.notification.create({
      data: {
        userId: member.userId,
        type: action === "ACCEPTED" ? "REQUEST_ACCEPTED" : action === "DECLINED" ? "REQUEST_DECLINED" : "SYSTEM",
        title: action === "ACCEPTED" ? "درخواستت قبول شد" : action === "DECLINED" ? "درخواستت رد شد" : "از پارتی حذف شدی",
        body:
          action === "ACCEPTED"
            ? "می‌تونی وارد اتاق لابی بشی."
            : action === "REMOVED"
              ? `میزبان (${session.displayName}) تو رو از پارتی حذف کرد.`
              : null,
        link: action === "ACCEPTED" ? `/dashboard/post/${post.id}` : null,
      },
    }),
    prisma.message.create({
      data: { postId: post.id, senderId: session.id, body: logBody, system: true },
    }),
  ]);

  if (action === "ACCEPTED") {
    const acceptedCount = await prisma.postMember.count({
      where: { postId: post.id, status: "ACCEPTED" },
    });

    if (acceptedCount + 1 >= post.partySize) {
      await prisma.post.update({ where: { id: post.id }, data: { status: "FULL" } });
    }

    await prisma.postMember.updateMany({
      where: {
        userId: member.userId,
        status: "PENDING",
        NOT: { postId: post.id },
      },
      data: { status: "DECLINED" },
    });
  }

  if (action === "REMOVED" && post.status === "FULL") {
    await prisma.post.update({ where: { id: post.id }, data: { status: "ACTIVE" } });
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "انجام شد.", data: null });
}