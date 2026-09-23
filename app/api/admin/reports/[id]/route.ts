import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { REPORT_REASON_MAP, SCORE_MAX } from "@/app/lib/behavior";
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

  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { reportedUser: true } });
  if (!report) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "گزارش پیدا نشد.", data: null }, { status: 404 });
  }
  if (report.status !== "PENDING") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این گزارش قبلاً بررسی شده.", data: null }, { status: 409 });
  }

  // Confirming a behavior report (on its own, or together with a ban or
  // suspension) is what lowers the reported player's score — the admin can
  // override the reason's default penalty from the review card.
  const reasonMeta = report.reasonCode ? REPORT_REASON_MAP[report.reasonCode] : null;
  const requestedPenalty = Number(body?.penalty);
  const penalty = reasonMeta
    ? Math.min(SCORE_MAX, Math.max(0, Number.isFinite(requestedPenalty) ? Math.round(requestedPenalty) : reasonMeta.penalty))
    : 0;

  const ops = [];

  if (["confirm", "ban", "suspend"].includes(action ?? "") && report.reportedUser && reasonMeta && penalty > 0) {
    const scoreField = reasonMeta.category === "COMMUNICATION" ? "communicationScore" : "behaviorScore";
    const current = report.reportedUser[scoreField];
    ops.push(
      prisma.user.update({ where: { id: report.reportedUser.id }, data: { [scoreField]: Math.max(0, current - penalty) } }),
    );
    if (action === "confirm") {
      ops.push(
        prisma.notification.create({
          data: {
            userId: report.reportedUser.id,
            type: "SYSTEM",
            title: reasonMeta.category === "COMMUNICATION" ? "امتیاز ارتباطات شما کاهش یافت" : "امتیاز رفتار شما کاهش یافت",
            body: `به دلیل گزارش تاییدشده «${reasonMeta.label}» در مچ ${report.matchId}، ${penalty.toLocaleString("fa-IR")} امتیاز کسر شد.`,
          },
        }),
      );
    }
  }

  if (action === "confirm") {
    if (!report.reportedUserId || !reasonMeta) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "این گزارش امتیازی نداره.", data: null }, { status: 400 });
    }
    ops.push(
      prisma.report.update({
        where: { id: reportId },
        data: { status: "REVIEWED", action: "SCORE_REDUCED", scorePenalty: penalty, resolvedById: session.id, resolvedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorId: session.id,
          action: "RESOLVE_REPORT",
          targetType: "Report",
          targetId: reportId,
          detail: `کسر ${penalty} امتیاز (${reasonMeta.label})`,
        },
      }),
    );
  } else if (action === "ban" && report.reportedUserId) {
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
    ops.push(
      prisma.report.update({
        where: { id: reportId },
        data: { status: "REVIEWED", action: "BANNED", scorePenalty: penalty || null, resolvedById: session.id, resolvedAt: new Date() },
      }),
    );
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
    ops.push(
      prisma.report.update({
        where: { id: reportId },
        data: { status: "REVIEWED", action: "SUSPENDED", scorePenalty: penalty || null, resolvedById: session.id, resolvedAt: new Date() },
      }),
    );
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

  // Like Dota's "thanks for your report" — the reporter hears back when
  // their behavior report actually led to action.
  if (reasonMeta && action !== "dismiss") {
    ops.push(
      prisma.notification.create({
        data: {
          userId: report.reporterId,
          type: "SYSTEM",
          title: "گزارش شما تایید شد",
          body: `گزارشی که برای مچ ${report.matchId} ثبت کردی بررسی شد و برای بازیکن متخلف اقدام شد. ممنون که به سالم‌تر شدن جامعه کمک می‌کنی.`,
        },
      }),
    );
  }

  await prisma.$transaction(ops);

  return NextResponse.json<ApiResponse>({ status: "success", message: "انجام شد.", data: null });
}
