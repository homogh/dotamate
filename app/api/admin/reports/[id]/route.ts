import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "REPORTS", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const reportId = Number(id);
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "گزارش پیدا نشد.", data: null }, { status: 404 });
  }

  const ops = [];

  if (action === "ban" && report.reportedUserId) {
    ops.push(
      prisma.user.update({
        where: { id: report.reportedUserId },
        data: { banned: true, bannedAt: new Date(), banReason: report.reason.slice(0, 500) },
      }),
      prisma.notification.create({
        data: { userId: report.reportedUserId, type: "SYSTEM", title: "حساب شما مسدود شد", body: report.reason.slice(0, 300) },
      }),
      prisma.auditLog.create({
        data: { actorId: session.id, action: "BAN_USER", targetType: "User", targetId: report.reportedUserId, detail: `از طریق گزارش #${report.id}` },
      }),
    );
    ops.push(prisma.report.update({ where: { id: reportId }, data: { status: "REVIEWED", action: "BANNED", resolvedById: session.id, resolvedAt: new Date() } }));
  } else if (action === "suspend" && report.reportedUserId) {
    ops.push(
      prisma.user.update({
        where: { id: report.reportedUserId },
        data: { suspendedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      }),
      prisma.notification.create({
        data: { userId: report.reportedUserId, type: "SYSTEM", title: "حساب شما به مدت ۳ روز تعلیق شد", body: report.reason.slice(0, 300) },
      }),
      prisma.auditLog.create({
        data: { actorId: session.id, action: "SUSPEND_USER", targetType: "User", targetId: report.reportedUserId, detail: `از طریق گزارش #${report.id}` },
      }),
    );
    ops.push(prisma.report.update({ where: { id: reportId }, data: { status: "REVIEWED", action: "SUSPENDED", resolvedById: session.id, resolvedAt: new Date() } }));
  } else if (action === "dismiss") {
    ops.push(
      prisma.report.update({ where: { id: reportId }, data: { status: "DISMISSED", action: "DISMISSED", resolvedById: session.id, resolvedAt: new Date() } }),
      prisma.auditLog.create({
        data: { actorId: session.id, action: "DISMISS_REPORT", targetType: "Report", targetId: reportId, detail: null },
      }),
    );
  } else {
    return NextResponse.json<ApiResponse>({ status: "error", message: "عملیات نامعتبره.", data: null }, { status: 400 });
  }

  await prisma.$transaction(ops);

  return NextResponse.json<ApiResponse>({ status: "success", message: "انجام شد.", data: null });
}
