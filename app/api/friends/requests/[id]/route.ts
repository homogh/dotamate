import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

// Addressee accepts or declines.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "درخواست نامعتبره.", data: null }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: Number(id) } });
  if (!friendship || friendship.addresseeId !== session.id || friendship.status !== "PENDING") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این درخواست دیگه معتبر نیست.", data: null }, { status: 404 });
  }

  if (action === "decline") {
    await prisma.friendship.delete({ where: { id: friendship.id } });
    return NextResponse.json<ApiResponse>({ status: "success", message: "درخواست دوستی رد شد.", data: { state: "NONE" } });
  }

  await prisma.$transaction([
    prisma.friendship.update({ where: { id: friendship.id }, data: { status: "ACCEPTED", respondedAt: new Date() } }),
    prisma.notification.updateMany({ where: { friendshipId: friendship.id, userId: session.id }, data: { read: true } }),
    prisma.notification.create({
      data: {
        userId: friendship.requesterId,
        type: "FRIEND_ACCEPTED",
        title: `${session.displayName} درخواست دوستیت رو قبول کرد`,
        link: `/dashboard/friends?user=${session.id}`,
      },
    }),
  ]);

  return NextResponse.json<ApiResponse>({ status: "success", message: "درخواست دوستی قبول شد.", data: { state: "FRIENDS" } });
}

// Requester cancels a request that hasn't been answered yet.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id: Number(id) } });
  if (!friendship || friendship.requesterId !== session.id || friendship.status !== "PENDING") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این درخواست دیگه معتبر نیست.", data: null }, { status: 404 });
  }

  // Its FRIEND_REQUEST notification goes with it — nothing left to answer.
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { friendshipId: friendship.id } }),
    prisma.friendship.delete({ where: { id: friendship.id } }),
  ]);

  return NextResponse.json<ApiResponse>({ status: "success", message: "درخواست دوستی لغو شد.", data: { state: "NONE" } });
}
