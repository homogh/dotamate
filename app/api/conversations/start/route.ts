import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
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
  if (!targetUser) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: session.id } } },
        { participants: { some: { userId: targetUserId } } },
      ],
    },
    include: { participants: true },
  });

  const existingDirect = existing && existing.participants.length === 2 ? existing : null;

  if (existingDirect) {
    return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: { id: existingDirect.id } });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: session.id }, { userId: targetUserId }],
      },
    },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: { id: conversation.id } });
}
