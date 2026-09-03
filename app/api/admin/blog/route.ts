import { NextRequest, NextResponse } from "next/server";
import type { BlogStatus } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

function slugify(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^؀-ۿa-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || `post-${Date.now()}`
  );
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "BLOG", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const category = request.nextUrl.searchParams.get("category") ?? "";

  const posts = await prisma.blogPost.findMany({
    where: category ? { category } : {},
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: posts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category,
      status: p.status,
      authorName: p.author.displayName,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "BLOG", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const category = String(body?.category ?? "").trim();
  const bodyText = String(body?.body ?? "").trim();
  const publishNow = Boolean(body?.publishNow);
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;

  if (!title || !category || !bodyText) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "عنوان، دسته‌بندی و متن مقاله رو کامل کن.", data: null }, { status: 400 });
  }

  let slug = slugify(title);
  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const status: BlogStatus = publishNow ? "PUBLISHED" : scheduledAt ? "SCHEDULED" : "DRAFT";

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      category,
      body: bodyText,
      excerpt: bodyText.slice(0, 160),
      coverSeed: title,
      status,
      authorId: session.id,
      publishedAt: publishNow ? new Date() : scheduledAt,
    },
  });

  await prisma.auditLog.create({
    data: { actorId: session.id, action: "PUBLISH_BLOG_POST", targetType: "BlogPost", targetId: post.id, detail: title },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "مقاله ذخیره شد.", data: { id: post.id } });
}
