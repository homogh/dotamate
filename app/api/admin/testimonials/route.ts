import { NextRequest, NextResponse } from "next/server";
import type { Prisma, TestimonialStatus } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { testimonialRankLabel } from "@/app/lib/testimonials";
import type { ApiResponse } from "@/app/types/api";

const STATUSES: TestimonialStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "TESTIMONIALS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "";
  const where: Prisma.TestimonialWhereInput = STATUSES.includes(status as TestimonialStatus)
    ? { status: status as TestimonialStatus }
    : {};

  const [items, pending, approved, rejected] = await Promise.all([
    prisma.testimonial.findMany({
      where,
      include: { user: { select: { id: true, displayName: true, avatarUrl: true, rank: true, rankTier: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.testimonial.count({ where: { status: "PENDING" } }),
    prisma.testimonial.count({ where: { status: "APPROVED" } }),
    prisma.testimonial.count({ where: { status: "REJECTED" } }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      counts: { pending, approved, rejected },
      testimonials: items.map((t) => ({
        id: t.id,
        body: t.body,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        userId: t.user.id,
        userName: t.user.displayName,
        avatarUrl: t.user.avatarUrl,
        rankLabel: testimonialRankLabel(t.user.rank, t.user.rankTier),
      })),
    },
  });
}
