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
  const blockedId = Number(id);
  if (blockedId === session.id) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نمی‌تونی خودت رو مسدود کنی.", data: null }, { status: 400 });
  }

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: session.id, blockedId } },
    create: { blockerId: session.id, blockedId },
    update: {},
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "کاربر مسدود شد.", data: null });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  await prisma.block.deleteMany({ where: { blockerId: session.id, blockedId: Number(id) } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "رفع مسدودیت شد.", data: null });
}
