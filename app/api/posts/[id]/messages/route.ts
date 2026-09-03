import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

async function guardAccess(postId: number, userId: number) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { members: { where: { userId, status: "ACCEPTED" } } },
  });
  if (!post) return null;
  if (post.authorId === userId || post.members.length > 0) return post;
  return null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);
  const post = await guardAccess(postId, session.id);
  if (!post) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { postId },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      senderId: m.senderId,
      senderName: m.sender.displayName,
      senderRank: m.sender.rank,
      senderRankTier: m.sender.rankTier,
    })),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);
  const post = await guardAccess(postId, session.id);
  if (!post) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "پیام خالیه.", data: null }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: { postId, senderId: session.id, body: text.slice(0, 1000) },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "ارسال شد.", data: { id: message.id } });
}
