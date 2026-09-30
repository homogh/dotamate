import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

async function requireEditor(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 }) };
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "TESTIMONIALS", "EDIT")) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 }) };
  }

  return { session };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEditor(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const testimonialId = Number(id);
  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (status !== "APPROVED" && status !== "REJECTED" && status !== "PENDING") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وضعیت نامعتبره.", data: null }, { status: 400 });
  }

  const testimonial = await prisma.testimonial.findUnique({ where: { id: testimonialId } });
  if (!testimonial) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نظر پیدا نشد.", data: null }, { status: 404 });
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.testimonial.update({
      where: { id: testimonialId },
      data: { status, reviewedAt: status === "PENDING" ? null : new Date() },
    }),
  ];

  if (status !== "PENDING") {
    ops.push(
      prisma.auditLog.create({
        data: {
          actorId: auth.session.id,
          action: status === "APPROVED" ? "APPROVE_TESTIMONIAL" : "REJECT_TESTIMONIAL",
          targetType: "Testimonial",
          targetId: testimonialId,
        },
      }),
    );
  }

  if (status !== "PENDING" && status !== testimonial.status) {
    ops.push(
      prisma.notification.create({
        data: {
          userId: testimonial.userId,
          type: "SYSTEM",
          title:
            status === "APPROVED"
              ? "نظرت تایید شد و توی صفحه اصلی نمایش داده میشه"
              : "نظرت تایید نشد؛ می‌تونی ویرایشش کنی و دوباره بفرستی",
          link: "/testimonials",
        },
      }),
    );
  }

  await prisma.$transaction(ops);
  revalidatePath("/");

  return NextResponse.json<ApiResponse>({ status: "success", message: "انجام شد.", data: null });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEditor(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const testimonialId = Number(id);

  const deleted = await prisma.testimonial.deleteMany({ where: { id: testimonialId } });
  if (deleted.count === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نظر پیدا نشد.", data: null }, { status: 404 });
  }

  await prisma.auditLog.create({
    data: { actorId: auth.session.id, action: "DELETE_TESTIMONIAL", targetType: "Testimonial", targetId: testimonialId },
  });
  revalidatePath("/");

  return NextResponse.json<ApiResponse>({ status: "success", message: "حذف شد.", data: null });
}
