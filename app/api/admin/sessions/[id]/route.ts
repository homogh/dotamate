import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "SESSIONS", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const postId = Number(id);
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "جلسه پیدا نشد.", data: null }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.post.update({ where: { id: postId }, data: { status: "CANCELLED" } }),
    prisma.notification.create({
      data: { userId: post.authorId, type: "SYSTEM", title: "جلسه شما توسط مدیریت لغو شد", body: post.description.slice(0, 200) },
    }),
    prisma.auditLog.create({ data: { actorId: session.id, action: "DELETE_POST", targetType: "Post", targetId: postId, detail: "لغو جلسه توسط ادمین" } }),
  ]);

  return NextResponse.json<ApiResponse>({ status: "success", message: "جلسه لغو شد.", data: null });
}
