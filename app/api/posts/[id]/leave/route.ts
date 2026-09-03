import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);

  const member = await prisma.postMember.findUnique({
    where: { postId_userId: { postId, userId: session.id } },
  });

  if (!member) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "عضو این پست نیستی.", data: null }, { status: 404 });
  }

  await prisma.postMember.delete({ where: { id: member.id } });

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (post?.status === "FULL") {
    await prisma.post.update({ where: { id: postId }, data: { status: "ACTIVE" } });
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "از جلسه خارج شدی.", data: null });
}
