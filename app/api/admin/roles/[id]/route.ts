import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

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
  const role = await prisma.role.findUnique({ where: { id: Number(id) } });

  if (!role) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نقش پیدا نشد.", data: null }, { status: 404 });
  }
  if (!role.editable) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این نقش سیستمی و غیرقابل حذفه.", data: null }, { status: 403 });
  }

  await prisma.role.delete({ where: { id: role.id } });
  await prisma.auditLog.create({ data: { actorId: session.id, action: "DELETE_ROLE", targetType: "Role", targetId: role.id, detail: role.name } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "نقش حذف شد.", data: null });
}
