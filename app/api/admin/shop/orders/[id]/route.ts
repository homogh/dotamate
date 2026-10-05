import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { refundOrderToWallet } from "@/app/lib/shopOrders";
import type { ApiResponse } from "@/app/types/api";

/**
 * { action: "refund", reason } — the order can't be fulfilled; the full amount goes back to «میت کیف».
 * Orders are delivered by stocking gift codes, never by this route.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const orderId = Number(id);
  const body = await request.json().catch(() => null);

  if (body?.action === "refund") {
    const reason = String(body?.reason ?? "").trim().slice(0, 300) || "سفارش توسط فروشگاه لغو شد.";

    const refunded = await prisma.$transaction(async (tx) => {
      // Claim the order first so a concurrent code delivery or second refund can't race this one.
      const { count } = await tx.shopOrder.updateMany({
        where: { id: orderId, status: "AWAITING_CODE" },
        data: { status: "REFUNDED" },
      });
      if (count === 0) return null;

      const order = await refundOrderToWallet(tx, orderId, reason);
      await tx.auditLog.create({
        data: { actorId: auth.session.id, action: "REFUND_SHOP_ORDER", targetType: "ShopOrder", targetId: orderId, detail: reason },
      });
      return order;
    });

    if (!refunded) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "فقط سفارش‌های «در انتظار فعال‌سازی کد» قابل بازگشت وجه هستند.", data: null }, { status: 409 });
    }
    return NextResponse.json<ApiResponse>({ status: "success", message: "مبلغ به میت کیف کاربر برگشت.", data: null });
  }

  return NextResponse.json<ApiResponse>({ status: "error", message: "عملیات نامعتبر است.", data: null }, { status: 400 });
}
