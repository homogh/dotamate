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
  if (!admin || !hasAccess(admin, "ROLES", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const role = await prisma.role.findUnique({ where: { id: Number(id) } });

  if (!role) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نقش پیدا نشد.", data: null }, { status: 404 });
  }
  if (!role.editable) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این نقش سیستمی و غیرقابل ویرایشه.", data: null }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const data: { name?: string; description?: string | null } = {};
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
  if (typeof body?.description === "string") data.description = body.description.trim().slice(0, 300) || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "چیزی برای ذخیره نبود.", data: null }, { status: 400 });
  }

  await prisma.role.update({ where: { id: role.id }, data });
  await prisma.auditLog.create({
    data: { actorId: session.id, action: "UPDATE_ROLE", targetType: "Role", targetId: role.id, detail: data.name ?? role.name },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "نقش به‌روزرسانی شد.", data: null });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const role = await prisma.role.findUnique({ where: { id: Number(id) }, include: { _count: { select: { users: true } } } });

  if (!role) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نقش پیدا نشد.", data: null }, { status: 404 });
  }
  if (!role.editable) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این نقش سیستمی و غیرقابل حذفه.", data: null }, { status: 403 });
  }
  if (role._count.users > 0) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: `${role._count.users} کاربر هنوز این نقش رو دارن — اول نقششون رو عوض کن.`, data: null },
      { status: 409 },
    );
  }

  await prisma.role.delete({ where: { id: role.id } });
  await prisma.auditLog.create({ data: { actorId: session.id, action: "DELETE_ROLE", targetType: "Role", targetId: role.id, detail: role.name } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "نقش حذف شد.", data: null });
}
