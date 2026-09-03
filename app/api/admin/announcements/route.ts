import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { getPlatformSettings } from "@/app/lib/platformSettings";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "ANNOUNCEMENTS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const [settings, history] = await Promise.all([
    getPlatformSettings(),
    prisma.announcement.findMany({ include: { author: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      settings,
      history: history.map((h) => ({ id: h.id, title: h.title, active: h.active, authorName: h.author.displayName, createdAt: h.createdAt })),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "ANNOUNCEMENTS", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  await getPlatformSettings();

  const data: Record<string, unknown> = {};
  for (const key of [
    "bannerText",
    "bannerActive",
    "maintenanceMode",
    "maintenanceMessage",
    "signupsEnabled",
    "lobbyChatEnabled",
    "scheduledSessionsEnabled",
    "steamAutoSyncEnabled",
  ]) {
    if (key in (body ?? {})) data[key] = body[key];
  }

  const updated = await prisma.platformSetting.update({ where: { id: 1 }, data });

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.auditLog.create({ data: { actorId: session.id, action: "UPDATE_ANNOUNCEMENT", targetType: "PlatformSetting", detail: JSON.stringify(data) } }),
  ];

  if ("bannerText" in data || "bannerActive" in data) {
    const title = updated.bannerText?.slice(0, 200) || "بنر خالی شد";
    ops.push(
      prisma.announcement.create({
        data: { title, body: title, active: updated.bannerActive, authorId: session.id },
      }),
    );
  }

  await prisma.$transaction(ops);

  return NextResponse.json<ApiResponse>({ status: "success", message: "ذخیره شد.", data: null });
}
