import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { notificationVisibilityFilter } from "@/app/lib/shopAccess";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.id, ...(await notificationVisibilityFilter()) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { friendship: { select: { id: true, status: true, addresseeId: true } } },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt,
      // Only the addressee can answer, and only while it's still pending.
      friendRequest:
        n.type === "FRIEND_REQUEST" && n.friendship && n.friendship.addresseeId === session.id
          ? { id: n.friendship.id, status: n.friendship.status }
          : null,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  await prisma.notification.updateMany({ where: { userId: session.id, read: false }, data: { read: true } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "همه خونده شدن.", data: null });
}
