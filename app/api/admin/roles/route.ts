import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess, type AdminResource } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

const RESOURCES: AdminResource[] = [
  "USERS",
  "POSTS",
  "REPORTS",
  "SESSIONS",
  "REFERENCE_DATA",
  "ANNOUNCEMENTS",
  "AUDIT_LOG",
  "BLOG",
  "ROLES",
  "TICKETS",
];

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "ROLES", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { id: "asc" },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      resources: RESOURCES,
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        editable: r.editable,
        userCount: r._count.users,
        permissions: Object.fromEntries(r.permissions.map((p) => [p.resource, p.level])),
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "ROLES", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نام نقش رو وارد کن.", data: null }, { status: 400 });
  }

  const role = await prisma.role.create({
    data: {
      name,
      description: typeof body?.description === "string" ? body.description.slice(0, 300) : null,
      permissions: { create: RESOURCES.map((resource) => ({ resource, level: "NONE" as const })) },
    },
  });

  await prisma.auditLog.create({ data: { actorId: session.id, action: "CREATE_ROLE", targetType: "Role", targetId: role.id, detail: name } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "نقش ایجاد شد.", data: { id: role.id } });
}
