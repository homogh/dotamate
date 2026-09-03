import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

const SEVERITY_LABEL: Record<string, string> = { LOW: "پایین", MEDIUM: "متوسط", HIGH: "بالا", CRITICAL: "بحرانی" };

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const fiveWeeksAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeToday,
    activePosts,
    sessionsToday,
    openReports,
    recentReports,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: dayAgo } } }),
    prisma.post.count({ where: { status: { in: ["ACTIVE", "FULL"] } } }),
    prisma.post.count({ where: { sessionType: "SCHEDULED", startAt: { gte: startOfToday, lt: endOfToday } } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.findMany({
      where: { status: "PENDING" },
      include: { reportedUser: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.user.findMany({ where: { createdAt: { gte: fiveWeeksAgo } }, select: { createdAt: true } }),
  ]);

  const weeks = Array.from({ length: 5 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (4 - i) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = recentUsers.filter((u) => u.createdAt >= weekStart && u.createdAt < weekEnd).length;
    return { label: `هفته ${i + 1}`, count };
  });

  const data = {
    metrics: {
      totalUsers,
      activeToday,
      activePosts,
      sessionsToday,
      openReports,
    },
    recentReports: recentReports.map((r) => ({
      id: r.id,
      userName: r.reportedUser?.displayName ?? "کاربر حذف‌شده",
      reason: r.reason.slice(0, 80),
      severity: r.severity,
      severityLabel: SEVERITY_LABEL[r.severity],
      createdAt: r.createdAt,
    })),
    weeklySignups: weeks,
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
