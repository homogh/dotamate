import { NextRequest, NextResponse } from "next/server";
import type { ReportSeverity } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import {
  EVIDENCE_MAX_FILES,
  EVIDENCE_VIDEO_TYPES,
  REPORT_CATEGORY_LABEL,
  REPORT_REASON_MAP,
  REPORTS_PER_DAY,
  type ReportReasonValue,
} from "@/app/lib/behavior";
import { saveEvidence, validateEvidence, type SavedEvidence } from "@/app/lib/reportEvidence";
import type { ApiResponse } from "@/app/types/api";

function severityForPenalty(penalty: number): ReportSeverity {
  if (penalty >= 1000) return "CRITICAL";
  if (penalty >= 600) return "HIGH";
  if (penalty >= 400) return "MEDIUM";
  return "LOW";
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  // Multipart = the in-game behavior report from a profile (reason + match +
  // evidence files); JSON = the older free-text report from a chat thread.
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return createBehaviorReport(request, session.id);
  }

  const body = await request.json().catch(() => null);
  const reportedUserId = Number(body?.reportedUserId) || null;
  const reportedPostId = Number(body?.reportedPostId) || null;
  const conversationId = Number(body?.conversationId) || null;
  const context = typeof body?.context === "string" ? body.context.slice(0, 100) : null;
  const reason = String(body?.reason ?? "").trim();

  if (!reason) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دلیل گزارش رو بنویس.", data: null }, { status: 400 });
  }

  let reportedConversationId: number | null = null;
  if (conversationId) {
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: session.id },
    });
    if (isParticipant) reportedConversationId = conversationId;
  }

  await prisma.report.create({
    data: { reporterId: session.id, reportedUserId, reportedPostId, reportedConversationId, context, reason: reason.slice(0, 1000) },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "گزارش شما ثبت شد.", data: null });
}

async function createBehaviorReport(request: NextRequest, reporterId: number) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "درخواست نامعتبره.", data: null }, { status: 400 });
  }

  const reportedUserId = Number(form.get("reportedUserId")) || 0;
  const reasonCode = String(form.get("reasonCode") ?? "") as ReportReasonValue;
  const matchId = String(form.get("matchId") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  const reasonMeta = REPORT_REASON_MAP[reasonCode];
  if (!reasonMeta) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دلیل گزارش رو انتخاب کن.", data: null }, { status: 400 });
  }
  if (!/^\d{6,20}$/.test(matchId)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "مچ مربوط به گزارش رو انتخاب کن.", data: null }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "توضیحات گزارش رو بنویس.", data: null }, { status: 400 });
  }
  if (reportedUserId === reporterId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نمی‌تونی خودت رو گزارش کنی.", data: null }, { status: 400 });
  }
  if (files.length > EVIDENCE_MAX_FILES) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "حداکثر ۴ فایل می‌تونی بفرستی.", data: null }, { status: 400 });
  }
  if (files.filter((f) => f.type in EVIDENCE_VIDEO_TYPES).length > 1) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فقط یک ویدیو می‌تونی بفرستی.", data: null }, { status: 400 });
  }
  for (const file of files) {
    const error = validateEvidence(file);
    if (error) return NextResponse.json<ApiResponse>({ status: "error", message: error, data: null }, { status: 400 });
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [reportedUser, recentCount, duplicate] = await Promise.all([
    prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true } }),
    prisma.report.count({ where: { reporterId, createdAt: { gte: dayAgo } } }),
    prisma.report.findFirst({ where: { reporterId, reportedUserId, matchId } }),
  ]);

  if (!reportedUser) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }
  if (duplicate) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "این بازیکن رو برای همین مچ قبلاً گزارش کردی.", data: null },
      { status: 409 },
    );
  }
  if (recentCount >= REPORTS_PER_DAY) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "امروز به سقف گزارش‌هات رسیدی. فردا دوباره امتحان کن.", data: null },
      { status: 429 },
    );
  }

  const saved: SavedEvidence[] = [];
  for (const file of files) {
    const result = await saveEvidence(file);
    if ("error" in result) {
      return NextResponse.json<ApiResponse>({ status: "error", message: result.error, data: null }, { status: 400 });
    }
    saved.push(result);
  }

  await prisma.report.create({
    data: {
      reporterId,
      reportedUserId,
      category: reasonMeta.category,
      reasonCode,
      matchId,
      severity: severityForPenalty(reasonMeta.penalty),
      context: REPORT_CATEGORY_LABEL[reasonMeta.category],
      reason: description.slice(0, 1000),
      attachments: { create: saved },
    },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "گزارش شما ثبت شد و بعد از بررسی نتیجه‌اش رو خبر می‌دیم.", data: null });
}
