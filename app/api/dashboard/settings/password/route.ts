import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession, hashPassword, verifyPassword } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (newPassword.length < 8) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "رمز جدید باید حداقل ۸ کاراکتر باشه.", data: null },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "کاربر پیدا نشد.", data: null }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "رمز فعلی اشتباهه.", data: null }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: session.id }, data: { passwordHash } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "رمز عبور تغییر کرد.", data: null });
}
