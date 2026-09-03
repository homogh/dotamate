import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { userId } = await params;
  const favoriteUserId = Number(userId);

  if (favoriteUserId === session.id) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نمی‌تونی خودت رو علاقه‌مند کنی.", data: null }, { status: 400 });
  }

  await prisma.favorite.upsert({
    where: { userId_favoriteUserId: { userId: session.id, favoriteUserId } },
    create: { userId: session.id, favoriteUserId },
    update: {},
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "به علاقه‌مندی‌ها اضافه شد.", data: null });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { userId } = await params;
  const favoriteUserId = Number(userId);

  await prisma.favorite.deleteMany({ where: { userId: session.id, favoriteUserId } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "از علاقه‌مندی‌ها حذف شد.", data: null });
}
