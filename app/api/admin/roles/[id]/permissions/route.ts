import { NextRequest, NextResponse } from "next/server";
import type { AdminResource as PrismaAdminResource, PermissionLevel as PrismaPermissionLevel } from "@prisma/client";

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
  if (!admin || !hasAccess(admin, "ROLES", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const roleId = Number(id);
  const role = await prisma.role.findUnique({ where: { id: roleId } });

  if (!role) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نقش پیدا نشد.", data: null }, { status: 404 });
  }
  if (!role.editable) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی‌های این نقش سیستمی و ثابته.", data: null }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const resource = body?.resource as PrismaAdminResource | undefined;
  const level = body?.level as PrismaPermissionLevel | undefined;

  if (!resource || !level) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "ورودی نامعتبره.", data: null }, { status: 400 });
  }

  await prisma.rolePermission.upsert({
    where: { roleId_resource: { roleId, resource } },
    create: { roleId, resource, level },
    update: { level },
  });

  await prisma.auditLog.create({
    data: { actorId: session.id, action: "UPDATE_ROLE", targetType: "Role", targetId: roleId, detail: `${resource} -> ${level}` },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "ذخیره شد.", data: null });
}
