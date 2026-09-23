import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { refundOrderToWallet } from "@/app/lib/shopOrders";
import type { ApiResponse } from "@/app/types/api";

/**
 * { action: "deliver" } — item was traded to the buyer by hand.
 * { action: "refund", reason } — order can't be fulfilled; full amount goes back to «میت کیف».
 * Gift-card orders are delivered by stocking codes, never by this route.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const orderId = Number(id);
  const body = await request.json().catch(() => null);

  if (body?.action === "deliver") {
    const order = await prisma.$transaction(async (tx) => {
      const { count } = await tx.shopOrder.updateMany({
        where: { id: orderId, status: "AWAITING_DELIVERY" },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      if (count === 0) return null;

      const updated = await tx.shopOrder.findUniqueOrThrow({ where: { id: orderId }, include: { product: { select: { title: true } } } });
      await tx.notification.create({
        data: {
          userId: updated.userId,
          type: "SHOP_ORDER",
          title: "آیتم شما ترید شد",
          body: `${updated.product.title} — پیشنهاد ترید را در استیم قبول کن.`,
          link: `/dashboard/orders/${orderId}`,
        },
      });
      await tx.auditLog.create({
        data: { actorId: auth.session.id, action: "DELIVER_SHOP_ORDER", targetType: "ShopOrder", targetId: orderId },
      });
      return updated;
    });

    if (!order) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "فقط سفارش‌های «در انتظار ارسال آیتم» قابل تحویل دستی هستند.", data: null }, { status: 409 });
    }
    return NextResponse.json<ApiResponse>({ status: "success", message: "سفارش تحویل‌شده ثبت شد.", data: null });
  }

  if (body?.action === "refund") {
    const reason = String(body?.reason ?? "").trim().slice(0, 300) || "سفارش توسط فروشگاه لغو شد.";

    const refunded = await prisma.$transaction(async (tx) => {
      // Claim the order first so a concurrent code delivery or second refund can't race this one.
      const { count } = await tx.shopOrder.updateMany({
        where: { id: orderId, status: { in: ["AWAITING_CODE", "AWAITING_DELIVERY"] } },
        data: { status: "REFUNDED" },
      });
      if (count === 0) return null;

      const order = await refundOrderToWallet(tx, orderId, reason);
      const product = await tx.shopProduct.findUnique({ where: { id: order.productId }, select: { type: true, stock: true } });
      if (product?.type === "ITEM" && product.stock !== null) {
        await tx.shopProduct.update({ where: { id: order.productId }, data: { stock: { increment: 1 } } });
      }
      await tx.auditLog.create({
        data: { actorId: auth.session.id, action: "REFUND_SHOP_ORDER", targetType: "ShopOrder", targetId: orderId, detail: reason },
      });
      return order;
    });

    if (!refunded) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "فقط سفارش‌های پرداخت‌شده و تحویل‌نشده قابل بازگشت وجه هستند.", data: null }, { status: 409 });
    }
    return NextResponse.json<ApiResponse>({ status: "success", message: "مبلغ به میت کیف کاربر برگشت.", data: null });
  }

  return NextResponse.json<ApiResponse>({ status: "error", message: "عملیات نامعتبر است.", data: null }, { status: 400 });
}
