import type { MarketListingStatus, MarketOrderStatus, Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { getShopSettings } from "@/app/lib/shopPricing";
import { notifyShopAdmins } from "@/app/lib/shopOrders";

type Tx = Prisma.TransactionClient;

export const MARKET_STATUS_LABELS: Record<MarketOrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  AWAITING_SELLER: "در انتظار ارسال فروشنده",
  SELLER_SENT: "ارسال شده؛ منتظر تأیید خریدار",
  COMPLETED: "تکمیل شده",
  DISPUTED: "در حال بررسی اختلاف",
  REFUNDED: "بازگشت وجه به خریدار",
  CANCELLED: "لغو شده",
};

/** How long a gateway checkout holds a listing before another buyer can take it. */
export const RESERVATION_MINUTES = 20;
export const MIN_LISTING_PRICE = 10_000;
export const MAX_LISTING_PRICE = 500_000_000;
export const MAX_ACTIVE_LISTINGS = 50;

export function parseListingPrice(value: unknown) {
  const price = Number(value);
  return Number.isInteger(price) && price >= MIN_LISTING_PRICE && price <= MAX_LISTING_PRICE ? price : null;
}

export function splitCommission(priceToman: number, commissionPercent: number) {
  const commissionToman = Math.round((priceToman * commissionPercent) / 100);
  return { commissionToman, sellerPayoutToman: priceToman - commissionToman };
}

export const marketOrderHref = (id: number) => `/dashboard/market-orders/${id}`;

async function notify(tx: Tx, userId: number, title: string, body: string, link: string) {
  await tx.notification.create({ data: { userId, type: "SHOP_ORDER", title, body, link } });
}

/** Money is in: start the seller's delivery clock and tell them to trade the item. */
export async function startSellerClock(tx: Tx, orderId: number, sellerDeadlineHours: number) {
  const now = new Date();
  const order = await tx.marketOrder.update({
    where: { id: orderId },
    data: { status: "AWAITING_SELLER", paidAt: now, reservedUntil: null, sellerDeadlineAt: new Date(now.getTime() + sellerDeadlineHours * 3_600_000) },
    include: { listing: { select: { itemName: true } } },
  });
  await notify(
    tx,
    order.sellerId,
    "آیتمت فروخته شد؛ برای خریدار ارسالش کن",
    `«${order.listing.itemName}» خریده شد. تا ${sellerDeadlineHours.toLocaleString("fa-IR")} ساعت فرصت داری آن را برای خریدار ترید کنی.`,
    marketOrderHref(order.id),
  );
}

/**
 * Releases the buyer's money to the seller (minus commission). Conditional on
 * the order still being in one of `from`, so a buyer confirmation racing the
 * auto-complete timer or an admin decision can only pay out once.
 */
export async function completeMarketOrder(tx: Tx, orderId: number, from: MarketOrderStatus[], payoutHoldHours: number, note?: string) {
  const { count } = await tx.marketOrder.updateMany({
    where: { id: orderId, status: { in: from } },
    data: { status: "COMPLETED", completedAt: new Date(), ...(note ? { resolutionNote: note } : {}) },
  });
  if (count === 0) return false;

  const order = await tx.marketOrder.findUniqueOrThrow({ where: { id: orderId }, include: { listing: { select: { id: true, itemName: true } } } });
  await tx.marketListing.update({ where: { id: order.listingId }, data: { status: "SOLD", soldAt: new Date() } });
  await tx.walletTransaction.create({
    data: {
      userId: order.sellerId,
      type: "SALE_INCOME",
      amountToman: order.sellerPayoutToman,
      withdrawable: true,
      availableAt: new Date(Date.now() + payoutHoldHours * 3_600_000),
      marketOrderId: order.id,
      note: `فروش «${order.listing.itemName}» (کمیسیون ${order.commissionToman.toLocaleString("fa-IR")} تومان)`,
    },
  });
  await notify(tx, order.sellerId, "پول فروش به میت کیف واریز شد", `${order.sellerPayoutToman.toLocaleString("fa-IR")} تومان بابت «${order.listing.itemName}»`, "/dashboard/wallet");
  await notify(tx, order.buyerId, "خرید تکمیل شد", `خرید «${order.listing.itemName}» نهایی شد.`, marketOrderHref(order.id));
  return true;
}

/** Gives the buyer their full payment back in «میت کیف» and settles what happens to the listing. */
export async function refundMarketOrder(tx: Tx, orderId: number, from: MarketOrderStatus[], reason: string, listingStatus: MarketListingStatus) {
  const { count } = await tx.marketOrder.updateMany({
    where: { id: orderId, status: { in: from } },
    data: { status: "REFUNDED", resolutionNote: reason },
  });
  if (count === 0) return false;

  const order = await tx.marketOrder.findUniqueOrThrow({ where: { id: orderId }, include: { listing: { select: { itemName: true } } } });
  await tx.marketListing.update({ where: { id: order.listingId }, data: { status: listingStatus } });
  await tx.walletTransaction.create({
    data: { userId: order.buyerId, type: "REFUND", amountToman: order.priceToman, marketOrderId: order.id, note: reason },
  });
  await notify(tx, order.buyerId, "مبلغ خرید به میت کیف برگشت", `«${order.listing.itemName}»: ${reason}`, marketOrderHref(order.id));
  await notify(tx, order.sellerId, "سفارش بازار لغو شد", `«${order.listing.itemName}»: ${reason}`, marketOrderHref(order.id));
  return true;
}

/** An unpaid gateway checkout gave up (cancelled or timed out): put the listing back on sale. */
export async function cancelPendingMarketOrder(tx: Tx, orderId: number) {
  const { count } = await tx.marketOrder.updateMany({ where: { id: orderId, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
  if (count === 0) return false;
  const order = await tx.marketOrder.findUniqueOrThrow({ where: { id: orderId }, select: { listingId: true } });
  await tx.marketListing.updateMany({ where: { id: order.listingId, status: "RESERVED" }, data: { status: "ACTIVE" } });
  return true;
}

let lastSweep = 0;

/**
 * Enforces every market deadline: expired checkouts release their listing,
 * sellers who miss the delivery window refund the buyer, and buyers who never
 * confirm or dispute get auto-completed. Runs from a timer (instrumentation.ts)
 * and opportunistically before market pages; throttled to once a minute.
 */
export async function processMarketTimeouts({ force = false } = {}) {
  if (!force && Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();

  const now = new Date();
  const [expired, lateSellers, silentBuyers] = await Promise.all([
    prisma.marketOrder.findMany({ where: { status: "PENDING_PAYMENT", reservedUntil: { lt: now } }, select: { id: true } }),
    prisma.marketOrder.findMany({ where: { status: "AWAITING_SELLER", sellerDeadlineAt: { lt: now } }, select: { id: true } }),
    prisma.marketOrder.findMany({ where: { status: "SELLER_SENT", autoCompleteAt: { lt: now } }, select: { id: true } }),
  ]);
  if (expired.length + lateSellers.length + silentBuyers.length === 0) return;

  const settings = await getShopSettings();
  for (const { id } of expired) await prisma.$transaction((tx) => cancelPendingMarketOrder(tx, id));
  for (const { id } of lateSellers) {
    await prisma.$transaction((tx) => refundMarketOrder(tx, id, ["AWAITING_SELLER"], "فروشنده در مهلت مقرر آیتم را ارسال نکرد.", "CANCELLED"));
  }
  for (const { id } of silentBuyers) {
    await prisma.$transaction((tx) => completeMarketOrder(tx, id, ["SELLER_SENT"], settings.payoutHoldHours, "تأیید خودکار: خریدار در مهلت مقرر اعتراضی ثبت نکرد."));
  }
}

/** Buyer disputes: freeze the order (no timers apply to DISPUTED) and bring in an admin. */
export async function disputeMarketOrder(orderId: number, reason: string) {
  const changed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.marketOrder.updateMany({
      where: { id: orderId, status: { in: ["AWAITING_SELLER", "SELLER_SENT"] } },
      data: { status: "DISPUTED", disputeReason: reason },
    });
    if (count === 0) return null;
    const order = await tx.marketOrder.findUniqueOrThrow({ where: { id: orderId }, include: { listing: { select: { itemName: true } } } });
    await notify(tx, order.sellerId, "خریدار اعتراض ثبت کرد", `«${order.listing.itemName}» — پشتیبانی دوتامیت بررسی می‌کند.`, marketOrderHref(order.id));
    return order;
  });
  if (changed) {
    await notifyShopAdmins("اعتراض جدید در بازار کاربران", `سفارش بازار #${changed.id} («${changed.listing.itemName}»): ${reason}`, "/admin/shop/market");
  }
  return Boolean(changed);
}
