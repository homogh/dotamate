import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

async function requireOwnedPost(request: NextRequest, id: string) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return { error: NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 }) };

  const post = await prisma.post.findUnique({ where: { id: Number(id) } });
  if (!post) return { error: NextResponse.json<ApiResponse>({ status: "error", message: "پست پیدا نشد.", data: null }, { status: 404 }) };
  if (post.authorId !== session.id) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "این پست مال تو نیست.", data: null }, { status: 403 }) };
  }

  return { post, session };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireOwnedPost(request, id);
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const data: {
    description?: string;
    hasVoice?: boolean;
    partySize?: number;
    voiceLink?: string | null;
    status?: "ACTIVE" | "COMPLETED" | "CANCELLED";
  } = {};

  if (typeof body?.description === "string" && body.description.trim().length >= 10) {
    data.description = body.description.trim();
  }
  if (typeof body?.hasVoice === "boolean") data.hasVoice = body.hasVoice;
  if (typeof body?.partySize === "number") data.partySize = Math.min(5, Math.max(2, body.partySize));
  if (typeof body?.voiceLink === "string") data.voiceLink = body.voiceLink.trim().slice(0, 300) || null;
  if (body?.status === "COMPLETED" || body?.status === "CANCELLED") data.status = body.status;

  const updated = await prisma.post.update({
    where: { id: guard.post.id },
    data,
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "پست به‌روزرسانی شد.", data: { id: updated.id } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireOwnedPost(request, id);
  if ("error" in guard) return guard.error;

  await prisma.post.delete({ where: { id: guard.post.id } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "پست حذف شد.", data: null });
}
