import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "USERS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  const [user, posts, reportsAgainst, auditLogs, roles] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { role: true } }),
    prisma.post.findMany({ where: { authorId: userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.report.findMany({
      where: { reportedUserId: userId },
      orderBy: { createdAt: "desc" },
      include: { reporter: true },
      take: 10,
    }),
    prisma.auditLog.findMany({
      where: { targetType: "User", targetId: userId },
      orderBy: { createdAt: "desc" },
      include: { actor: true },
      take: 10,
    }),
    prisma.role.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!user) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  const data = {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    country: user.country,
    languages: user.languages,
    rank: user.rank,
    rankTier: user.rankTier,
    mainPosition: user.mainPosition,
    rankVerification: user.rankVerification,
    steamProfileUrl: user.steamProfileUrl,
    avatarUrl: user.avatarUrl,
    steamId: user.steamId,
    matchDataVerified: user.matchDataVerified,
    matchGateOverride: user.matchGateOverride,
    profileCompletedAt: user.profileCompletedAt,
    banned: user.banned,
    bannedAt: user.bannedAt,
    banReason: user.banReason,
    suspendedUntil: user.suspendedUntil,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    roleId: user.roleId,
    roleName: user.role?.name ?? null,
    roles,
    posts: posts.map((p) => ({
      id: p.id,
      description: p.description,
      status: p.status,
      gameMode: p.gameMode,
      createdAt: p.createdAt,
    })),
    reports: reportsAgainst.map((r) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      severity: r.severity,
      reporterName: r.reporter.displayName,
      createdAt: r.createdAt,
    })),
    auditLogs: auditLogs.map((a) => ({
      id: a.id,
      action: a.action,
      detail: a.detail,
      actorName: a.actor.displayName,
      createdAt: a.createdAt,
    })),
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "USERS", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  let auditAction: string | null = null;
  let notifyTitle: string | null = null;
  let auditDetail: string | null = null;

  switch (action) {
    case "ban":
      updates.banned = true;
      updates.bannedAt = new Date();
      updates.banReason = String(body?.reason ?? "").slice(0, 500) || null;
      updates.suspendedUntil = null;
      auditAction = "BAN_USER";
      notifyTitle = "حساب شما مسدود شد";
      break;
    case "unban":
      updates.banned = false;
      updates.bannedAt = null;
      updates.banReason = null;
      auditAction = "UNBAN_USER";
      notifyTitle = "مسدودیت حساب شما رفع شد";
      break;
    case "suspend": {
      const days = Math.min(30, Math.max(1, Number(body?.days) || 3));
      updates.suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      auditAction = "SUSPEND_USER";
      notifyTitle = `حساب شما به مدت ${days} روز تعلیق شد`;
      break;
    }
    case "unsuspend":
      updates.suspendedUntil = null;
      auditAction = "UNSUSPEND_USER";
      notifyTitle = "تعلیق حساب شما رفع شد";
      break;
    case "warn":
      auditAction = "WARN_USER";
      notifyTitle = "اخطار رسمی از مدیریت دوتامیت";
      break;
    case "verify":
      updates.rankVerification = "VERIFIED";
      auditAction = "VERIFY_USER";
      notifyTitle = "رنک شما تایید شد";
      break;
    case "unverify":
      updates.rankVerification = "SELF_DECLARED";
      auditAction = "UNVERIFY_USER";
      break;
    case "assignRole": {
      const roleId = body?.roleId === null ? null : Number(body?.roleId);
      if (roleId === null) {
        auditDetail = "حذف نقش از کاربر";
      } else {
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) {
          return NextResponse.json<ApiResponse>({ status: "error", message: "نقش پیدا نشد.", data: null }, { status: 404 });
        }
        auditDetail = `تخصیص نقش: ${role.name}`;
      }
      updates.roleId = roleId;
      auditAction = "ASSIGN_ROLE";
      break;
    }
    case "toggleMatchGateOverride":
      updates.matchGateOverride = !target.matchGateOverride;
      auditDetail = updates.matchGateOverride ? "فعال‌سازی دسترسی بدون تایید مچ‌های استیم" : "غیرفعال‌سازی این استثنا";
      auditAction = "OVERRIDE_MATCH_GATE";
      break;
    default:
      return NextResponse.json<ApiResponse>({ status: "error", message: "عملیات نامعتبره.", data: null }, { status: 400 });
  }

  const ops = [];
  if (Object.keys(updates).length > 0) {
    ops.push(prisma.user.update({ where: { id: userId }, data: updates }));
  }
  if (auditAction) {
    ops.push(
      prisma.auditLog.create({
        data: {
          actorId: session.id,
          action: auditAction as never,
          targetType: "User",
          targetId: userId,
          detail: auditDetail ?? (body?.reason ? String(body.reason).slice(0, 500) : null),
        },
      }),
    );
  }
  if (notifyTitle) {
    ops.push(
      prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: notifyTitle,
          body: body?.reason ? String(body.reason).slice(0, 500) : null,
        },
      }),
    );
  }

  await prisma.$transaction(ops);

  return NextResponse.json<ApiResponse>({ status: "success", message: "انجام شد.", data: null });
}
