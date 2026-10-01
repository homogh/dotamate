import { randomBytes, createHmac } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { sendPasswordResetEmail } from "@/app/lib/mailer";
import type { ApiResponse } from "@/app/types/api";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string) {
  return createHmac("sha256", process.env.JWT_SECRET ?? "").update(rawToken).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const contact = String(body?.contact ?? "").trim();

  // Always return the same generic message, matching or not, so emails/phones can't be enumerated.
  const genericResponse = NextResponse.json<ApiResponse>({
    status: "success",
    message: "اگه این ایمیل یا شماره توی دوتامیت ثبت شده باشه، لینک بازیابی رمز براش ارسال می‌شه.",
    data: null,
  });

  if (!contact) {
    return genericResponse;
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: contact }, { phone: contact }] },
  });

  if (!user || !user.email) {
    return genericResponse;
  }

  const rawToken = randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_API_URL}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (error) {
    console.error("Failed to send password reset email", error);
  }

  return genericResponse;
}
