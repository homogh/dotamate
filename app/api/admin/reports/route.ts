import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

const SEVERITY_LABEL: Record<string, string> = { LOW: "پایین", MEDIUM: "متوسط", HIGH: "بالا", CRITICAL: "بحرانی" };

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "REPORTS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const tab = request.nextUrl.searchParams.get("tab") ?? "pending";
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [pendingCount, bannedCount, reviewedTodayCount, reports] = await Promise.all([
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { banned: true } }),
    prisma.report.count({ where: { status: { not: "PENDING" }, resolvedAt: { gte: dayAgo } } }),
    prisma.report.findMany({
      where: {
        status: tab === "pending" ? "PENDING" : { not: "PENDING" },
        ...(query
          ? { reportedUser: { displayName: { contains: query } } }
          : {}),
      },
      include: { reporter: true, reportedUser: true, reportedPost: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const data = {
    counts: { pending: pendingCount, banned: bannedCount, reviewedToday: reviewedTodayCount },
    reports: reports.map((r) => ({
      id: r.id,
      reportedUserName: r.reportedUser?.displayName ?? "کاربر حذف‌شده",
      reportedUserId: r.reportedUserId,
      reporterName: r.reporter.displayName,
      severity: r.severity,
      severityLabel: SEVERITY_LABEL[r.severity],
      context: r.context ?? (r.reportedPostId ? "پست/لابی" : "پروفایل کاربر"),
      reason: r.reason,
      status: r.status,
      action: r.action,
      createdAt: r.createdAt,
    })),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
