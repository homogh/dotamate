import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { RANK_LABEL } from "@/components/dashboard/postLabels";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "POSTS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const statusFilter = request.nextUrl.searchParams.get("status") ?? "";

  const posts = await prisma.post.findMany({
    where: statusFilter ? { status: statusFilter as never } : { status: { in: ["ACTIVE", "FULL"] } },
    include: { author: true, reports: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const sorted = posts
    .map((p) => ({
      id: p.id,
      description: p.description,
      authorName: p.author.displayName,
      authorRank: RANK_LABEL[p.rank],
      reportCount: p.reports.length,
      createdAt: p.createdAt,
    }))
    .sort((a, b) => b.reportCount - a.reportCount);

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: sorted });
}
