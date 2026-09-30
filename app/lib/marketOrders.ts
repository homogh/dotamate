import type { MarketListingStatus, MarketOrderStatus, Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { notifyShopAdmins } from "@/app/lib/shopOrders";

type Tx = Prisma.TransactionClient;

export const MARKET_STATUS_LABELS: Record<MarketOrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  AWAITING_ADMIN: "در انتظار پذیرش ادمین",
  AWAITING_SELLER: "در جریان ترید",
  SELLER_SENT: "ارسال شده به دوتامیت؛ منتظر تأیید ادمین",
  ADMIN_RECEIVED: "دریافت شده توسط دوتامیت؛ در حال تحویل به خریدار",
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
export async function startSellerClock(tx: Tx, orderId: number, sellerDeadlineHours: number, mutualConfirmHours?: number) {
  const now = new Date();
  const order = await tx.marketOrder.update({
    where: { id: orderId },
    data: {
      status: "AWAITING_SELLER",
      paidAt: now,
      reservedUntil: null,
      sellerDeadlineAt: new Date(now.getTime() + sellerDeadlineHours * 3_600_000),
      // DIRECT mode: the mutual-confirm window runs alongside the trade itself —
      // if neither side confirms by this time, the order auto-refunds.
      ...(mutualConfirmHours ? { mutualConfirmDeadlineAt: new Date(now.getTime() + mutualConfirmHours * 3_600_000) } : {}),
    },
    include: { listing: { select: { itemName: true } } },
  });
  const tip = order.tradeMode === "ESCROW" ? "آیتم را برای ادمین دوتامیت ارسال کن." : "آن را مستقیم برای خریدار ترید کن.";
  await notify(
    tx,
    order.sellerId,
    "آیتمت فروخته شد؛ ترید را انجام بده",
    `«${order.listing.itemName}» خریده شد. تا ${sellerDeadlineHours.toLocaleString("fa-IR")} ساعت فرصت داری — ${tip}`,
    marketOrderHref(order.id),
  );
}

/**
 * ESCROW mode: money is in, but there's no admin trade link yet — the order
 * just waits for an admin to pick it up. The seller is told an admin hasn't
 * accepted yet (nowhere to send the item), and admins are notified there's a
 * new order needing acceptance.
 */
export async function openEscrowOrder(tx: Tx, orderId: number) {
  const now = new Date();
  const order = await tx.marketOrder.update({
    where: { id: orderId },
    data: { status: "AWAITING_ADMIN", paidAt: now, reservedUntil: null },
    include: { listing: { select: { itemName: true } } },
  });
  await notify(
    tx,
    order.sellerId,
    "آیتمت فروخته شد",
    `«${order.listing.itemName}» خریده شد، اما هنوز یک ادمین دوتامیت سفارش را نپذیرفته. صبر کن تا ادمین لینک ترید خودش را برایت بفرستد؛ قبل از آن چیزی ارسال نکن.`,
    marketOrderHref(order.id),
  );
  return order;
}

/**
 * ESCROW mode: an admin accepts the order and hands over their own Steam
 * trade link. Starts the seller's delivery clock. Conditional on the order
 * still being AWAITING_ADMIN, so two admins can't both accept the same order.
 */
export async function acceptEscrowOrder(tx: Tx, orderId: number, adminId: number, adminTradeUrl: string, sellerDeadlineHours: number) {
  const now = new Date();
  const { count } = await tx.marketOrder.updateMany({
    where: { id: orderId, status: "AWAITING_ADMIN", tradeMode: "ESCROW" },
    data: {
      status: "AWAITING_SELLER",
      sellerDeadlineAt: new Date(now.getTime() + sellerDeadlineHours * 3_600_000),
      acceptedById: adminId,
      acceptedAt: now,
      adminTradeUrl,
    },
  });
  if (count === 0) return false;

  const order = await tx.marketOrder.findUniqueOrThrow({ where: { id: orderId }, include: { listing: { select: { itemName: true } } } });
  await notify(
    tx,
    order.sellerId,
    "ادمین دوتامیت سفارش را پذیرفت؛ آیتمت را ارسال کن",
    `برای «${order.listing.itemName}» تا ${sellerDeadlineHours.toLocaleString("fa-IR")} ساعت فرصت داری آیتم را به این Trade URL ادمین دوتامیت ارسال کنی: ${adminTradeUrl}`,
    marketOrderHref(order.id),
  );
  return true;
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

/**
 * DIRECT mode: seller confirms they traded the item directly with the buyer in
 * Steam. Starts the mutual-confirm window (if not already started) so the order
 * auto-refunds if neither side ever confirms.
 */
export async function sellerConfirmDirect(tx: Tx, orderId: number, payoutHoldHours: number) {
  const order = await tx.marketOrder.findFirst({ where: { id: orderId, tradeMode: "DIRECT", status: "AWAITING_SELLER" } });
  if (!order) return false;

  if (order.buyerConfirmedAt) {
    // Buyer already confirmed — this closes it out.
    return completeMarketOrder(tx, orderId, ["AWAITING_SELLER"], payoutHoldHours, "هر دو طرف ترید را تأیید کردند.");
  }
  await tx.marketOrder.update({ where: { id: orderId }, data: { sellerConfirmedAt: new Date() } });
  await notify(tx, order.buyerId, "فروشنده ترید را تأیید کرد", "فروشنده اعلام کرده آیتم را برایت ترید کرده. اگر دریافتش کردی، تأییدش کن.", marketOrderHref(order.id));
  return true;
}

/**
 * DIRECT mode: buyer confirms they received the item directly from the seller
 * in Steam. Mirrors sellerConfirmDirect.
 */
export async function buyerConfirmDirect(tx: Tx, orderId: number, payoutHoldHours: number) {
  const order = await tx.marketOrder.findFirst({ where: { id: orderId, tradeMode: "DIRECT", status: "AWAITING_SELLER" } });
  if (!order) return false;

  if (order.sellerConfirmedAt) {
    return completeMarketOrder(tx, orderId, ["AWAITING_SELLER"], payoutHoldHours, "هر دو طرف ترید را تأیید کردند.");
  }
  await tx.marketOrder.update({ where: { id: orderId }, data: { buyerConfirmedAt: new Date() } });
  await notify(tx, order.sellerId, "خریدار دریافت آیتم را تأیید کرد", "اگر ترید را انجام داده‌ای، تأییدش کن تا سفارش بسته شود.", marketOrderHref(order.id));
  return true;
}

/**
 * ESCROW mode: seller marked the item sent; admin confirms it actually arrived
 * in the admin's Steam inventory. Funds stay held until the admin also confirms
 * delivery to the buyer (via completeMarketOrder / the admin "release" action).
 */
export async function adminReceivedEscrow(tx: Tx, orderId: number) {
  const now = new Date();
  const { count } = await tx.marketOrder.updateMany({
    where: { id: orderId, tradeMode: "ESCROW", status: "SELLER_SENT" },
    data: { status: "ADMIN_RECEIVED", adminReceivedAt: now },
  });
  if (count === 0) return false;
  const order = await tx.marketOrder.findUniqueOrThrow({ where: { id: orderId }, include: { listing: { select: { itemName: true } } } });
  await notify(tx, order.buyerId, "آیتمت به دوتامیت رسید", `«${order.listing.itemName}» را ادمین دوتامیت از فروشنده تحویل گرفت و به‌زودی برایت ترید می‌شود.`, marketOrderHref(order.id));
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
  const [expired, lateEscrowSellers, mutualDeadlineDirect] = await Promise.all([
    prisma.marketOrder.findMany({ where: { status: "PENDING_PAYMENT", reservedUntil: { lt: now } }, select: { id: true } }),
    // ESCROW: seller never sent the item to the admin.
    prisma.marketOrder.findMany({ where: { status: "AWAITING_SELLER", tradeMode: "ESCROW", sellerDeadlineAt: { lt: now } }, select: { id: true } }),
    // DIRECT: the mutual-confirm window ran out.
    prisma.marketOrder.findMany({
      where: { status: "AWAITING_SELLER", tradeMode: "DIRECT", mutualConfirmDeadlineAt: { lt: now } },
      select: { id: true, buyerConfirmedAt: true, sellerConfirmedAt: true },
    }),
  ]);
  if (expired.length + lateEscrowSellers.length + mutualDeadlineDirect.length === 0) return;

  for (const { id } of expired) await prisma.$transaction((tx) => cancelPendingMarketOrder(tx, id));
  for (const { id } of lateEscrowSellers) {
    await prisma.$transaction((tx) => refundMarketOrder(tx, id, ["AWAITING_SELLER"], "فروشنده در مهلت مقرر آیتم را برای ادمین دوتامیت ارسال نکرد.", "CANCELLED"));
  }
  for (const order of mutualDeadlineDirect) {
    if (!order.buyerConfirmedAt && !order.sellerConfirmedAt) {
      // Neither side confirmed: nothing to adjudicate, refund the buyer.
      await prisma.$transaction((tx) => refundMarketOrder(tx, order.id, ["AWAITING_SELLER"], "هیچ‌کدام از طرفین ترید مستقیم را تا مهلت مقرر تأیید نکردند.", "CANCELLED"));
    } else {
      // One side confirmed, the other didn't — don't auto-resolve, open a dispute for admin review.
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.marketOrder.updateMany({
          where: { id: order.id, status: "AWAITING_SELLER" },
          data: { status: "DISPUTED", disputeReason: "مهلت تأیید متقابل ترید مستقیم تمام شد؛ فقط یک طرف تأیید کرده بود." },
        });
        if (count === 0) return;
        const full = await tx.marketOrder.findUniqueOrThrow({ where: { id: order.id }, include: { listing: { select: { itemName: true } } } });
        await notify(tx, full.buyerId, "مهلت تأیید متقابل تمام شد", `«${full.listing.itemName}» برای بررسی پشتیبانی به اختلاف منتقل شد.`, marketOrderHref(full.id));
        await notify(tx, full.sellerId, "مهلت تأیید متقابل تمام شد", `«${full.listing.itemName}» برای بررسی پشتیبانی به اختلاف منتقل شد.`, marketOrderHref(full.id));
      });
    }
  }
}

/** Either side disputes (DIRECT trade gone wrong, or anything else): freeze the order (no timers apply to DISPUTED) and bring in an admin. */
export async function disputeMarketOrder(orderId: number, filerId: number, reason: string) {
  const changed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.marketOrder.updateMany({
      where: { id: orderId, status: { in: ["AWAITING_SELLER", "SELLER_SENT", "ADMIN_RECEIVED"] } },
      data: { status: "DISPUTED", disputeReason: reason },
    });
    if (count === 0) return null;
    const order = await tx.marketOrder.findUniqueOrThrow({ where: { id: orderId }, include: { listing: { select: { itemName: true } } } });
    const otherPartyId = filerId === order.buyerId ? order.sellerId : order.buyerId;
    await notify(tx, otherPartyId, "طرف مقابل اعتراض ثبت کرد", `«${order.listing.itemName}» — پشتیبانی دوتامیت بررسی می‌کند.`, marketOrderHref(order.id));
    return order;
  });
  if (changed) {
    await notifyShopAdmins("اعتراض جدید در بازار کاربران", `سفارش بازار #${changed.id} («${changed.listing.itemName}»): ${reason}`, "/admin/shop/market");
  }
  return Boolean(changed);
}
