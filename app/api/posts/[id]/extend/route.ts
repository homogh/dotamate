import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { POST_LIFETIME_MS, effectivePostExpiry, isInExpiryWarning } from "@/app/lib/postExpiry";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وارد نشدی.", data: null },
      { status: 401 },
    );
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id: Number(id) } });

  if (!post || post.authorId !== session.id) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "پست پیدا نشد.", data: null },
      { status: 404 },
    );
  }

  if (post.status !== "ACTIVE" && post.status !== "FULL") {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "این پست دیگه فعال نیست.", data: null },
      { status: 409 },
    );
  }

  if (!isInExpiryWarning(post)) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "هنوز وقت تمدید پست نرسیده.", data: null },
      { status: 400 },
    );
  }

  const expiresAt = new Date(effectivePostExpiry(post).getTime() + POST_LIFETIME_MS);

  // Conditional on the current expiry so a double click can't extend twice.
  const { count } = await prisma.post.updateMany({
    where: { id: post.id, status: { in: ["ACTIVE", "FULL"] }, expiresAt: post.expiresAt },
    data: { expiresAt, expiryWarnedAt: null },
  });

  if (count !== 1) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "وضعیت پست تغییر کرده، صفحه رو رفرش کن.", data: null },
      { status: 409 },
    );
  }

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "پستت ۲۴ ساعت دیگه تمدید شد.",
    data: { expiresAt },
  });
}
