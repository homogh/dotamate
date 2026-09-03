import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { hashPassword, signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/app/lib/auth";
import { getPlatformSettings } from "@/app/lib/platformSettings";
import type { ApiResponse } from "@/app/types/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^09\d{9}$/;

export async function POST(request: NextRequest) {
  const settings = await getPlatformSettings();
  if (!settings.signupsEnabled) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "ثبت‌نام کاربران جدید موقتاً توسط مدیریت غیرفعال شده.", data: null },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const displayName = String(body?.displayName ?? "").trim();
  const contact = String(body?.contact ?? "").trim();
  const password = String(body?.password ?? "");

  if (!displayName || !contact || !password) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "همه فیلدها الزامی هستن.", data: null },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "رمز عبور باید حداقل ۸ کاراکتر باشه.", data: null },
      { status: 400 },
    );
  }

  const isEmail = EMAIL_RE.test(contact);
  const isPhone = PHONE_RE.test(contact);

  if (!isEmail && !isPhone) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "ایمیل یا شماره موبایل معتبر وارد کن.", data: null },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findFirst({
    where: isEmail ? { email: contact } : { phone: contact },
  });

  if (existing) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "حسابی با این مشخصات قبلاً ثبت شده.", data: null },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      displayName,
      email: isEmail ? contact : null,
      phone: isPhone ? contact : null,
      passwordHash,
    },
  });

  const token = await signSession({ id: user.id, displayName: user.displayName, email: user.email });

  const response = NextResponse.json<ApiResponse>({
    status: "success",
    message: "ثبت‌نام با موفقیت انجام شد.",
    data: { id: user.id, displayName: user.displayName, email: user.email, phone: user.phone },
  });

  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  return response;
}
