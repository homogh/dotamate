import { NextRequest, NextResponse } from "next/server";
import type { BlogStatus, Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { slugify, uniqueSlug } from "@/app/lib/blogSlug";
import type { ContentBlock } from "@/app/lib/blogPosts";
import type { ApiResponse } from "@/app/types/api";

async function requireEditAccess(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return { error: NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 }) };

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "BLOG", "EDIT")) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "BLOG", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id: Number(id) } });
  if (!post) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "مقاله پیدا نشد.", data: null }, { status: 404 });
  }

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      categories: post.categories.split(",").map((c) => c.trim()).filter(Boolean),
      heroIds: post.heroIds ? post.heroIds.split(",").map(Number).filter((n) => !Number.isNaN(n)) : [],
      tags: post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      excerpt: post.excerpt ?? "",
      body: post.body as unknown as ContentBlock[],
      coverImageUrl: post.coverImageUrl,
      coverImageAlt: post.coverImageAlt,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      status: post.status,
      publishedAt: post.publishedAt,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEditAccess(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const postId = Number(id);
  const existing = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!existing) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "مقاله پیدا نشد.", data: null }, { status: 404 });
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
  const saveAsDraft = Boolean(body?.saveAsDraft);
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;
  const hasText = blocks.some((b) => b.type !== "image" && b.text?.trim());

  if (!title || categories.length === 0 || !hasText) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "عنوان، حداقل یک دسته‌بندی و متن مقاله رو کامل کن.", data: null }, { status: 400 });
  }

  let slug = existing.slug;
  if (body?.slug && slugify(String(body.slug)) !== existing.slug) {
    slug = await uniqueSlug(slugify(String(body.slug)), postId);
  }

  let status: BlogStatus = existing.status;
  let publishedAt = existing.publishedAt;
  if (saveAsDraft) {
    status = "DRAFT";
  } else if (publishNow) {
    status = "PUBLISHED";
    publishedAt = existing.publishedAt ?? new Date();
  } else if (scheduledAt) {
    status = "SCHEDULED";
    publishedAt = scheduledAt;
  }

  const firstParagraph = blocks.find((b) => b.type === "paragraph")?.text ?? "";

  const post = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      title,
      slug,
      categories: categories.join(","),
      heroIds: heroIds.length ? heroIds.join(",") : null,
      tags: tags.length ? tags.join(",") : null,
      body: blocks as unknown as Prisma.InputJsonValue,
      excerpt: excerpt || firstParagraph.slice(0, 160),
      coverImageUrl,
      coverImageAlt,
      metaTitle,
      metaDescription,
      status,
      publishedAt,
    },
  });

  await prisma.auditLog.create({
    data: { actorId: auth.session!.id, action: "UPDATE_BLOG_POST", targetType: "BlogPost", targetId: post.id, detail: title },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "تغییرات ذخیره شد.", data: { id: post.id, slug: post.slug } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEditAccess(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  await prisma.blogPost.delete({ where: { id: Number(id) } });
  await prisma.auditLog.create({
    data: { actorId: auth.session!.id, action: "DELETE_BLOG_POST", targetType: "BlogPost", targetId: Number(id) },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "مقاله حذف شد.", data: null });
}
