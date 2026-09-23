import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { getShopSettings } from "@/app/lib/shopPricing";
import { completeMarketOrder, refundMarketOrder } from "@/app/lib/marketOrders";
import type { ApiResponse } from "@/app/types/api";

/**
 * Admin decision on a market order:
 *   "release" — the seller delivered; pay them (minus commission).
 *   "refund"  — the buyer didn't get the item; full amount back to the buyer.
 * Allowed on disputed orders and on any order still in progress.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const orderId = Number(id);
  const body = await request.json().catch(() => null);
  const note = String(body?.note ?? "").trim().slice(0, 500);
  const open = ["DISPUTED", "AWAITING_SELLER", "SELLER_SENT"] as const;

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
