import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/app/lib/auth";
import { getAdminSession } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

type GuardResult = { session: SessionPayload; error?: never } | { session?: never; error: NextResponse<ApiResponse> };

/** API guard for owner-only routes (the shop): only the non-editable «مدیر کل» role passes. */
export async function requireSuperAdmin(request: NextRequest): Promise<GuardResult> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 }) };
  }

  const admin = await getAdminSession(session.id);
  if (!admin?.isSuperAdmin) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "فقط مدیر کل به این بخش دسترسی دارد.", data: null }, { status: 403 }) };
  }

  return { session };
}

/** Same check for server components (layouts/pages), reading the session cookie directly. */
export async function isSuperAdminViewer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const admin = session ? await getAdminSession(session.id) : null;
  return Boolean(admin?.isSuperAdmin);
}
