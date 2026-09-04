import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وارد نشدی.", data: null },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
      bio: true,
      country: true,
      languages: true,
      rank: true,
      mainPosition: true,
      rankVerification: true,
      steamProfileUrl: true,
      avatarUrl: true,
      notifyBell: true,
      notifyEmail: true,
      notifyPush: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "کاربر پیدا نشد.", data: null },
      { status: 404 },
    );
  }

  // Lightweight presence signal for the admin "active users" metric. Wrapped
  // so a failure here (e.g. a dev server that hasn't restarted since
  // lastActiveAt was added) never breaks this widely-used endpoint.
  prisma.user.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } }).catch(() => {});

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: user });
}
