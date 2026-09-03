import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
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
  const original = await prisma.post.findUnique({ where: { id: Number(id) } });

  if (!original || original.authorId !== session.id) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "پست پیدا نشد.", data: null },
      { status: 404 },
    );
  }

  const existingActive = await prisma.post.findFirst({
    where: { authorId: session.id, status: "ACTIVE" },
  });

  if (existingActive) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "فقط یک پست فعال می‌تونی داشته باشی.", data: null },
      { status: 409 },
    );
  }

  const republished = await prisma.post.create({
    data: {
      authorId: session.id,
      position: original.position,
      rank: original.rank,
      gameMode: original.gameMode,
      region: original.region,
      sessionType: "NOW",
      partySize: original.partySize,
      hasVoice: original.hasVoice,
      description: original.description,
    },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "پست دوباره منتشر شد.",
    data: { id: republished.id },
  });
}
