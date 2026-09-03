import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { verifyPassword, signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const contact = String(body?.contact ?? "").trim();
  const password = String(body?.password ?? "");

  if (!contact || !password) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "ایمیل/شماره موبایل و رمز عبور رو وارد کن.", data: null },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: contact }, { phone: contact }] },
  });

  if (!user) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "حسابی با این مشخصات پیدا نشد.", data: null },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "رمز عبور اشتباهه.", data: null },
      { status: 401 },
    );
  }

  const token = await signSession({ id: user.id, displayName: user.displayName, email: user.email });

  const response = NextResponse.json<ApiResponse>({
    status: "success",
    message: "ورود موفقیت‌آمیز بود.",
    data: { id: user.id, displayName: user.displayName, email: user.email, phone: user.phone },
  });

  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  return response;
}
