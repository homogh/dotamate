import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { TESTIMONIAL_MAX_LENGTH, TESTIMONIAL_MIN_LENGTH } from "@/app/lib/testimonials";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const mine = await prisma.testimonial.findUnique({ where: { userId: session.id } });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: mine ? { id: mine.id, body: mine.body, status: mine.status, updatedAt: mine.updatedAt } : null,
  });
}

/** Creates the player's testimonial, or edits it — either way it goes back to the moderation queue. */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "برای ثبت نظر اول وارد حساب شو.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();

  if (text.length < TESTIMONIAL_MIN_LENGTH) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: `نظرت رو کمی کامل‌تر بنویس (حداقل ${TESTIMONIAL_MIN_LENGTH} حرف).`, data: null },
      { status: 400 },
    );
  }
  if (text.length > TESTIMONIAL_MAX_LENGTH) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: `نظر نباید بیشتر از ${TESTIMONIAL_MAX_LENGTH} حرف باشه.`, data: null },
      { status: 400 },
    );
  }

  const testimonial = await prisma.testimonial.upsert({
    where: { userId: session.id },
    create: { userId: session.id, body: text },
    update: { body: text, status: "PENDING", reviewedAt: null },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "نظرت ثبت شد و بعد از تایید تیم دوتامیت توی صفحه اصلی نمایش داده میشه.",
    data: { id: testimonial.id, status: testimonial.status },
  });
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  await prisma.testimonial.deleteMany({ where: { userId: session.id } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "نظرت حذف شد.", data: null });
}
