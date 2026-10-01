import { createHmac } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { hashPassword } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

function hashToken(rawToken: string) {
  return createHmac("sha256", process.env.JWT_SECRET ?? "").update(rawToken).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");
  const password = String(body?.password ?? "");

  if (!token || password.length < 8) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "لینک نامعتبره یا رمز عبور خیلی کوتاهه (حداقل ۸ کاراکتر).", data: null },
      { status: 400 },
    );
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "این لینک منقضی شده یا قبلاً استفاده شده. دوباره درخواست بده.", data: null },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json<ApiResponse>({ status: "success", message: "رمز عبور با موفقیت تغییر کرد.", data: null });
}
