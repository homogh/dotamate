import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { getShopSettings } from "@/app/lib/shopPricing";
import { acceptEscrowOrder, adminReceivedEscrow, completeMarketOrder, refundMarketOrder } from "@/app/lib/marketOrders";
import type { ApiResponse } from "@/app/types/api";

/**
 * Admin actions on a market order:
 *   "accept"  — ESCROW only: admin accepts the order and hands over their own Steam trade link.
 *   "receive" — ESCROW only: admin confirms the item actually arrived from the seller.
 *   "release" — pay the seller (minus commission); allowed once the item is confirmed delivered.
 *   "refund"  — the buyer didn't get the item; full amount back to the buyer.
 * "release"/"refund" are allowed on disputed orders and on any order still in progress.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const orderId = Number(id);
  const body = await request.json().catch(() => null);
  const note = String(body?.note ?? "").trim().slice(0, 500);
  const open = ["DISPUTED", "AWAITING_SELLER", "SELLER_SENT", "ADMIN_RECEIVED"] as const;

  if (body?.action === "accept") {
    const adminTradeUrl = String(body?.adminTradeUrl ?? "").trim();
    if (!adminTradeUrl) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "لینک ترید ادمین را وارد کن.", data: null }, { status: 400 });
    }
    const settings = await getShopSettings();
    const done = await prisma.$transaction(async (tx) => {
      const ok = await acceptEscrowOrder(tx, orderId, auth.session.id, adminTradeUrl, settings.sellerDeadlineHours);
      if (ok) {
        await tx.auditLog.create({
          data: { actorId: auth.session.id, action: "RESOLVE_MARKET_DISPUTE", targetType: "MarketOrder", targetId: orderId, detail: `accept: ${adminTradeUrl}` },
        });
      }
      return ok;
    });
    return done
      ? NextResponse.json<ApiResponse>({ status: "success", message: "سفارش پذیرفته شد و لینک ترید برای فروشنده ارسال شد.", data: null })
      : NextResponse.json<ApiResponse>({ status: "error", message: "این سفارش در مرحله «در انتظار پذیرش ادمین» نیست.", data: null }, { status: 409 });
  }

  if (body?.action === "receive") {
    const done = await prisma.$transaction((tx) => adminReceivedEscrow(tx, orderId));
    return done
      ? NextResponse.json<ApiResponse>({ status: "success", message: "دریافت آیتم از فروشنده ثبت شد.", data: null })
      : NextResponse.json<ApiResponse>({ status: "error", message: "این سفارش در مرحله «ارسال‌شده» نیست.", data: null }, { status: 409 });
  }

  if (body?.action !== "release" && body?.action !== "refund") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "عملیات نامعتبر است.", data: null }, { status: 400 });
  }

  const settings = await getShopSettings();
  const done = await prisma.$transaction(async (tx) => {
    const ok =
      body.action === "release"
        ? await completeMarketOrder(tx, orderId, [...open], settings.payoutHoldHours, note || "با بررسی پشتیبانی، مبلغ به فروشنده پرداخت شد.")
        : await refundMarketOrder(tx, orderId, [...open], note || "با بررسی پشتیبانی، مبلغ به خریدار برگشت.", "CANCELLED");
    if (ok) {
      await tx.auditLog.create({
        data: { actorId: auth.session.id, action: "RESOLVE_MARKET_DISPUTE", targetType: "MarketOrder", targetId: orderId, detail: `${body.action}: ${note}` },
      });
    }
    return ok;
  });

  if (!done) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این سفارش دیگر باز نیست.", data: null }, { status: 409 });
  }
  return NextResponse.json<ApiResponse>({
    status: "success",
    message: body.action === "release" ? "مبلغ به فروشنده پرداخت شد." : "مبلغ به خریدار برگشت.",
    data: null,
  });
}
