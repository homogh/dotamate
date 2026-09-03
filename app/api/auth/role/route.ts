import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  // Guarded broadly: the Role/RolePermission tables are new, and a dev
  // server that hasn't restarted since they were added can't see them yet.
  // Failing safe to "no admin access" here (instead of throwing) keeps the
  // client dropdown working for every regular user regardless of that.
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: { include: { permissions: true } } },
    });

    if (!user?.role) {
      return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: null });
    }

    const permissions = Object.fromEntries(user.role.permissions.map((p) => [p.resource, p.level]));

    return NextResponse.json<ApiResponse>({
      status: "success",
      message: "ok",
      data: { roleId: user.role.id, roleName: user.role.name, permissions },
    });
  } catch {
    return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: null });
  }
}
