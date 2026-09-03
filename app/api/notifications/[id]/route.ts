import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const notification = await prisma.notification.findUnique({ where: { id: Number(id) } });
  if (!notification || notification.userId !== session.id) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "پیدا نشد.", data: null }, { status: 404 });
  }

  await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "خونده شد.", data: null });
}
