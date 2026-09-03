import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "AUDIT_LOG", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      page,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        actorName: l.actor.displayName,
        targetType: l.targetType,
        targetId: l.targetId,
        detail: l.detail,
        createdAt: l.createdAt,
      })),
    },
  });
}
