import { NextRequest, NextResponse } from "next/server";
import type { BlogStatus, Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { slugify, uniqueSlug } from "@/app/lib/blogSlug";
import type { ContentBlock } from "@/app/lib/blogPosts";
import type { ApiResponse } from "@/app/types/api";

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

  const categoryFilter = request.nextUrl.searchParams.get("category") ?? "";

  const posts = await prisma.blogPost.findMany({
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const mapped = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    categories: p.categories.split(",").map((c) => c.trim()).filter(Boolean),
    heroIds: p.heroIds ? p.heroIds.split(",").map(Number).filter((n) => !Number.isNaN(n)) : [],
    tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    status: p.status,
    coverImageUrl: p.coverImageUrl,
    coverSeed: p.coverSeed,
    authorName: p.author.displayName,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
  }));

  const filtered = categoryFilter ? mapped.filter((p) => p.categories.includes(categoryFilter)) : mapped;

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: filtered.slice(0, 50) });
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
  const categories = Array.isArray(body?.categories) ? (body.categories as string[]).map((c) => c.trim()).filter(Boolean) : [];
  const heroIds = Array.isArray(body?.heroIds) ? (body.heroIds as number[]).filter((n) => Number.isFinite(n)) : [];
  const blocks = Array.isArray(body?.body) ? (body.body as ContentBlock[]) : [];
  const excerpt = String(body?.excerpt ?? "").trim();
  const tags = Array.isArray(body?.tags) ? (body.tags as string[]).map((t) => t.trim()).filter(Boolean) : [];
  const coverImageUrl = body?.coverImageUrl ? String(body.coverImageUrl) : null;
  const coverImageAlt = body?.coverImageAlt ? String(body.coverImageAlt) : null;
  const metaTitle = body?.metaTitle ? String(body.metaTitle).trim() : null;
  const metaDescription = body?.metaDescription ? String(body.metaDescription).trim() : null;
  const publishNow = Boolean(body?.publishNow);
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;
  const hasText = blocks.some((b) => b.type !== "image" && b.text?.trim());

  if (!title || categories.length === 0 || !hasText) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "عنوان، حداقل یک دسته‌بندی و متن مقاله رو کامل کن.", data: null }, { status: 400 });
  }

  const requestedSlug = body?.slug ? slugify(String(body.slug)) : slugify(title);
  const slug = await uniqueSlug(requestedSlug);

  const status: BlogStatus = publishNow ? "PUBLISHED" : scheduledAt ? "SCHEDULED" : "DRAFT";
  const firstParagraph = blocks.find((b) => b.type === "paragraph")?.text ?? "";

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      categories: categories.join(","),
      heroIds: heroIds.length ? heroIds.join(",") : null,
      tags: tags.length ? tags.join(",") : null,
      body: blocks as unknown as Prisma.InputJsonValue,
      excerpt: excerpt || firstParagraph.slice(0, 160),
      coverSeed: title,
      coverImageUrl,
      coverImageAlt,
      metaTitle,
      metaDescription,
      status,
      authorId: session.id,
      publishedAt: publishNow ? new Date() : scheduledAt,
    },
  });

  await prisma.auditLog.create({
    data: { actorId: session.id, action: "PUBLISH_BLOG_POST", targetType: "BlogPost", targetId: post.id, detail: title },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "مقاله ذخیره شد.", data: { id: post.id, slug: post.slug } });
}
