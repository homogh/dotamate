import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireMarketUser } from "@/app/lib/shopAccess";
import { getShopSettings } from "@/app/lib/shopPricing";
import { getWalletBalance, lockWallet } from "@/app/lib/wallet";
import { gatewayName, requestPayment } from "@/app/lib/paymentGateway";
import { fetchDotaInventory } from "@/app/lib/steamInventory";
import { cancelPendingMarketOrder, marketOrderHref, RESERVATION_MINUTES, splitCommission, startSellerClock } from "@/app/lib/marketOrders";
import type { ApiResponse } from "@/app/types/api";

class CheckoutError extends Error {}

export async function POST(request: NextRequest) {
  const auth = await requireMarketUser(request);
  if (auth.error) return auth.error;
  const buyerId = auth.session.id;

  const body = await request.json().catch(() => null);
  const listingId = Number(body?.listingId);
  const paymentMethod = body?.paymentMethod === "WALLET" ? "WALLET" : body?.paymentMethod === "GATEWAY" ? "GATEWAY" : null;
  if (!listingId || !paymentMethod) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "درخواست نامعتبر است.", data: null }, { status: 400 });
  }

  const [listing, buyer, settings] = await Promise.all([
    prisma.marketListing.findUnique({ where: { id: listingId }, include: { seller: { select: { steamId: true, banned: true } } } }),
    prisma.user.findUnique({ where: { id: buyerId }, select: { email: true, phone: true, steamTradeUrl: true, banned: true } }),
    getShopSettings(),
  ]);

  if (!listing || listing.status !== "ACTIVE" || listing.seller.banned) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این آگهی دیگر در دسترس نیست.", data: null }, { status: 409 });
  }
  if (!buyer || buyer.banned) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "حساب شما مسدود است.", data: null }, { status: 403 });
  }
  if (listing.sellerId === buyerId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نمی‌توانی آگهی خودت را بخری.", data: null }, { status: 409 });
  }
  if (!buyer.steamTradeUrl) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "برای خرید آیتم، اول Trade URL استیمت را در تنظیمات ثبت کن.", data: { needsTradeUrl: true } },
      { status: 409 },
    );
  }

  // Best effort: if Steam answers and the item is gone from the seller's
  // inventory, pull the listing now instead of taking money for it. If Steam
  // is unreachable we don't block the sale — the seller deadline still protects the buyer.
  if (listing.seller.steamId) {
    const inventory = await fetchDotaInventory(listing.seller.steamId);
    if (inventory.ok && !inventory.items.some((i) => i.assetId === listing.assetId && i.tradable)) {
      await prisma.marketListing.updateMany({ where: { id: listing.id, status: "ACTIVE" }, data: { status: "CANCELLED" } });
      return NextResponse.json<ApiResponse>({ status: "error", message: "این آیتم دیگر در اینونتوری فروشنده نیست و آگهی حذف شد.", data: null }, { status: 409 });
    }
  }

  const { commissionToman, sellerPayoutToman } = splitCommission(listing.priceToman, settings.marketCommissionPercent);
  const orderData = {
    listingId: listing.id,
    buyerId,
    sellerId: listing.sellerId,
    paymentMethod,
    priceToman: listing.priceToman,
    commissionPercent: settings.marketCommissionPercent,
    commissionToman,
    sellerPayoutToman,
    buyerTradeUrl: buyer.steamTradeUrl,
  } as const;

  if (paymentMethod === "WALLET") {
    let orderId: number;
    try {
      orderId = await prisma.$transaction(async (tx) => {
        await lockWallet(tx, buyerId);
        const { total } = await getWalletBalance(buyerId, tx);
        if (total < listing.priceToman) throw new CheckoutError("موجودی میت کیف کافی نیست.");

        // The conditional flip is what stops two buyers from getting the same item.
        const reserved = await tx.marketListing.updateMany({ where: { id: listing.id, status: "ACTIVE" }, data: { status: "RESERVED" } });
        if (reserved.count === 0) throw new CheckoutError("این آگهی همین الان فروخته شد.");

        const order = await tx.marketOrder.create({ data: orderData });
        await tx.walletTransaction.create({
          data: { userId: buyerId, type: "PURCHASE", amountToman: -listing.priceToman, marketOrderId: order.id, note: listing.itemName },
        });
        await startSellerClock(tx, order.id, settings.sellerDeadlineHours);
        return order.id;
      });
    } catch (error) {
      if (error instanceof CheckoutError) {
        return NextResponse.json<ApiResponse>({ status: "error", message: error.message, data: null }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json<ApiResponse>({ status: "success", message: "خرید انجام شد.", data: { orderId, redirectUrl: marketOrderHref(orderId) } });
  }

  // Gateway: hold the listing for this buyer while they're at the bank.
  let orderId: number;
  try {
    orderId = await prisma.$transaction(async (tx) => {
      const reserved = await tx.marketListing.updateMany({ where: { id: listing.id, status: "ACTIVE" }, data: { status: "RESERVED" } });
      if (reserved.count === 0) throw new CheckoutError("این آگهی همین الان رزرو یا فروخته شد.");
      const order = await tx.marketOrder.create({ data: { ...orderData, reservedUntil: new Date(Date.now() + RESERVATION_MINUTES * 60_000) } });
      return order.id;
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json<ApiResponse>({ status: "error", message: error.message, data: null }, { status: 409 });
    }
    throw error;
  }

  try {
    const { authority, redirectUrl } = await requestPayment({
      amountToman: listing.priceToman,
      description: `دوتامیت — بازار کاربران: ${listing.itemName} (سفارش #${orderId})`,
      email: buyer.email,
      mobile: buyer.phone,
    });
    await prisma.payment.create({
      data: { userId: buyerId, purpose: "MARKET_ORDER", marketOrderId: orderId, amountToman: listing.priceToman, gateway: gatewayName(), authority },
    });
    return NextResponse.json<ApiResponse>({ status: "success", message: "در حال انتقال به درگاه...", data: { orderId, redirectUrl } });
  } catch (error) {
    console.error("[market] payment request failed", error);
    await prisma.$transaction((tx) => cancelPendingMarketOrder(tx, orderId));
    return NextResponse.json<ApiResponse>({ status: "error", message: "اتصال به درگاه پرداخت ناموفق بود. دوباره تلاش کن.", data: null }, { status: 502 });
  }
}
