import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { assignGiftCode } from "@/app/lib/giftCodes";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  AWAITING_CODE: "در انتظار فعال‌سازی کد",
  DELIVERED: "تحویل شده",
  CANCELLED: "لغو شده",
  REFUNDED: "بازگشت وجه به میت کیف",
};

/**
 * PENDING_PAYMENT → AWAITING_CODE. Conditional on the current status so a
 * callback that fires twice (refresh, gateway retry) can only mark it paid
 * once. Returns true only for the call that actually made the transition.
 */
export async function markOrderPaid(tx: Prisma.TransactionClient, orderId: number) {
  const { count } = await tx.shopOrder.updateMany({
    where: { id: orderId, status: "PENDING_PAYMENT" },
    data: { status: "AWAITING_CODE", paidAt: new Date() },
  });
  return count === 1;
}

/** Owner-facing alert for anything that needs a human (e.g. an empty code bank). */
export async function notifyShopAdmins(title: string, body: string, link: string) {
  const admins = await prisma.user.findMany({ where: { role: { editable: false } }, select: { id: true } });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type: "SHOP_ORDER" as const, title, body, link })),
  });
}

/** Runs right after payment is confirmed: hands out a gift code, or alerts the admin when the bank is empty. */
export async function fulfillPaidOrder(orderId: number) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId }, include: { product: true } });
  if (!order || order.status !== "AWAITING_CODE") return;

  if ((await assignGiftCode(order.id, order.productId)) !== "bank-empty") return;
  await notifyShopAdmins(
    "سفارش گیفت کارت منتظر کد است",
    `سفارش #${order.id} (${order.product.title}) پرداخت شده ولی بانک کد خالی است.`,
    `/admin/shop/gift-codes?productId=${order.productId}`,
  );
}

/** Cancels a paid order by crediting the full amount back to the buyer's «میت کیف». */
export async function refundOrderToWallet(tx: Prisma.TransactionClient, orderId: number, reason: string) {
  const order = await tx.shopOrder.update({
    where: { id: orderId },
    data: { status: "REFUNDED" },
    include: { product: { select: { title: true } } },
  });
  await tx.walletTransaction.create({
    data: { userId: order.userId, type: "REFUND", amountToman: order.totalToman, orderId: order.id, note: reason },
  });
  await tx.notification.create({
    data: {
      userId: order.userId,
      type: "SHOP_ORDER",
      title: "مبلغ سفارش به میت کیف برگشت",
      body: `سفارش #${order.id} (${order.product.title}): ${reason}`,
      link: "/dashboard/wallet",
    },
  });
  return order;
}
