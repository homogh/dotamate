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
  if (!admin || !hasAccess(admin, "REFERENCE_DATA", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const data: { label?: string; active?: boolean; sortOrder?: number } = {};
  if (typeof body?.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (typeof body?.active === "boolean") data.active = body.active;
  if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;

  await prisma.referenceEntry.update({ where: { id: Number(id) }, data });
  await prisma.auditLog.create({
    data: { actorId: session.id, action: "UPDATE_REFERENCE_DATA", targetType: "ReferenceEntry", targetId: Number(id) },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "ذخیره شد.", data: null });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "REFERENCE_DATA", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  await prisma.referenceEntry.delete({ where: { id: Number(id) } });
  await prisma.auditLog.create({
    data: { actorId: session.id, action: "UPDATE_REFERENCE_DATA", targetType: "ReferenceEntry", targetId: Number(id), detail: "حذف" },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "حذف شد.", data: null });
}
