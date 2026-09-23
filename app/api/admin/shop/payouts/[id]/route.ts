import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import type { ApiResponse } from "@/app/types/api";

/**
 * { action: "paid", trackingRef } — the bank transfer was made.
 * { action: "reject", note }      — not paid; the amount returns to the user's withdrawable balance.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const requestId = Number(id);
  const body = await request.json().catch(() => null);
  const now = new Date();

  if (body?.action === "paid") {
    const trackingRef = String(body?.trackingRef ?? "").trim().slice(0, 100);
    if (!trackingRef) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "کد پیگیری واریز را وارد کن.", data: null }, { status: 400 });
    }

    const done = await prisma.$transaction(async (tx) => {
      const { count } = await tx.withdrawalRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: "PAID", trackingRef, processedById: auth.session.id, processedAt: now },
      });
      if (count === 0) return false;
      const w = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id: requestId } });
      await tx.notification.create({
        data: { userId: w.userId, type: "SHOP_ORDER", title: "برداشت شما واریز شد", body: `${w.amountToman.toLocaleString("fa-IR")} تومان — کد پیگیری: ${trackingRef}`, link: "/dashboard/wallet" },
      });
      await tx.auditLog.create({ data: { actorId: auth.session.id, action: "PAY_WITHDRAWAL", targetType: "WithdrawalRequest", targetId: requestId, detail: trackingRef } });
      return true;
    });
    return done
      ? NextResponse.json<ApiResponse>({ status: "success", message: "واریز ثبت شد.", data: null })
      : NextResponse.json<ApiResponse>({ status: "error", message: "این درخواست دیگر در انتظار نیست.", data: null }, { status: 409 });
  }

  if (body?.action === "reject") {
    const note = String(body?.note ?? "").trim().slice(0, 300) || "درخواست برداشت رد شد.";
    const done = await prisma.$transaction(async (tx) => {
      const { count } = await tx.withdrawalRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: "REJECTED", adminNote: note, processedById: auth.session.id, processedAt: now },
      });
      if (count === 0) return false;
      const w = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id: requestId } });
      // Back into the withdrawable balance, exactly where it came from.
      await tx.walletTransaction.create({
        data: { userId: w.userId, type: "ADJUSTMENT", amountToman: w.amountToman, withdrawable: true, withdrawalId: w.id, note: `برگشت درخواست برداشت: ${note}` },
      });
      await tx.notification.create({
        data: { userId: w.userId, type: "SHOP_ORDER", title: "درخواست برداشت رد شد", body: `${note} مبلغ به میت کیف برگشت.`, link: "/dashboard/wallet" },
      });
      await tx.auditLog.create({ data: { actorId: auth.session.id, action: "REJECT_WITHDRAWAL", targetType: "WithdrawalRequest", targetId: requestId, detail: note } });
      return true;
    });
    return done
      ? NextResponse.json<ApiResponse>({ status: "success", message: "درخواست رد شد و مبلغ به کیف کاربر برگشت.", data: null })
      : NextResponse.json<ApiResponse>({ status: "error", message: "این درخواست دیگر در انتظار نیست.", data: null }, { status: 409 });
  }

  return NextResponse.json<ApiResponse>({ status: "error", message: "عملیات نامعتبر است.", data: null }, { status: 400 });
}
