import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "REFERENCE_DATA", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const entries = await prisma.referenceEntry.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });

  const grouped: Record<string, typeof entries> = {};
  for (const e of entries) {
    grouped[e.category] ??= [];
    grouped[e.category].push(e);
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: grouped });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "REFERENCE_DATA", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const category = String(body?.category ?? "").trim().slice(0, 40);
  const key = String(body?.key ?? "").trim().slice(0, 60);
  const label = String(body?.label ?? "").trim();

  if (!category || !key || !label) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "همه فیلدها لازمه.", data: null }, { status: 400 });
  }

  const maxOrder = await prisma.referenceEntry.aggregate({ where: { category }, _max: { sortOrder: true } });

  const entry = await prisma.referenceEntry.create({
    data: { category, key, label, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  });

  await prisma.auditLog.create({
    data: { actorId: session.id, action: "UPDATE_REFERENCE_DATA", targetType: "ReferenceEntry", targetId: entry.id, detail: `افزودن ${category}/${key}` },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "افزوده شد.", data: { id: entry.id } });
}
