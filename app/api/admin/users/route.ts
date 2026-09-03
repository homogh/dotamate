import { NextRequest, NextResponse } from "next/server";
import type { Prisma, Rank } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

const PAGE_SIZE = 8;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "USERS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query")?.trim() ?? "";
  const status = searchParams.get("status") ?? "";
  const rank = searchParams.get("rank") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const where: Prisma.UserWhereInput = {
    ...(query
      ? { OR: [{ displayName: { contains: query } }, { email: { contains: query } }] }
      : {}),
    ...(rank ? { rank: rank as Rank } : {}),
    ...(status === "active" ? { banned: false, suspendedUntil: null } : {}),
    ...(status === "suspended" ? { suspendedUntil: { gt: new Date() } } : {}),
    ...(status === "banned" ? { banned: true } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const data = {
    users: users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      rank: u.rank,
      rankTier: u.rankTier,
      rankVerification: u.rankVerification,
      banned: u.banned,
      suspendedUntil: u.suspendedUntil,
      createdAt: u.createdAt,
    })),
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
    pageSize: PAGE_SIZE,
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
