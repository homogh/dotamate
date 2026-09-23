import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireMarketUser } from "@/app/lib/shopAccess";
import { getShopSettings } from "@/app/lib/shopPricing";
import { completeMarketOrder, disputeMarketOrder, marketOrderHref, refundMarketOrder } from "@/app/lib/marketOrders";
import type { ApiResponse } from "@/app/types/api";

const error = (message: string, status: number) => NextResponse.json<ApiResponse>({ status: "error", message, data: null }, { status });

/**
 * Buyer/seller actions on an order in progress. Follows the market switch like
 * every market route; if the market is turned off mid-order, the deadline sweep
 * (app/lib/marketOrders.ts) still settles it — refund if unsent, payout if sent.
 *   seller: "sent" (I traded it) · "cancel" (I can't deliver → buyer refunded)
 *   buyer:  "confirm" (received) · "dispute" (with a reason)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMarketUser(request);
  if (auth.error) return auth.error;
  const session = auth.session;

  const { id } = await params;
  const order = await prisma.marketOrder.findUnique({ where: { id: Number(id) }, include: { listing: { select: { itemName: true } } } });
  // Outsiders get the same answer as a missing order.
  if (!order || (order.buyerId !== session.id && order.sellerId !== session.id)) return error("سفارش پیدا نشد.", 404);

  const isSeller = order.sellerId === session.id;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "sent" && isSeller) {
    const settings = await getShopSettings();
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.marketOrder.updateMany({
        where: { id: order.id, status: "AWAITING_SELLER" },
        data: { status: "SELLER_SENT", sentAt: now, autoCompleteAt: new Date(now.getTime() + settings.buyerConfirmHours * 3_600_000) },
      });
      if (count === 0) return false;
      await tx.notification.create({
        data: {
          userId: order.buyerId,
          type: "SHOP_ORDER",
          title: "فروشنده آیتم را برایت ارسال کرد",
          body: `پیشنهاد ترید «${order.listing.itemName}» را در استیم قبول کن و بعد دریافت را تأیید کن.`,
          link: marketOrderHref(order.id),
        },
      });
      return true;
    });
    return updated
      ? NextResponse.json<ApiResponse>({ status: "success", message: "ثبت شد. منتظر تأیید خریدار می‌مانیم.", data: null })
      : error("این سفارش در مرحله ارسال نیست.", 409);
  }

  if (action === "cancel" && isSeller) {
    const done = await prisma.$transaction((tx) =>
      refundMarketOrder(tx, order.id, ["AWAITING_SELLER"], "فروشنده اعلام کرد نمی‌تواند آیتم را ارسال کند.", "CANCELLED"),
    );
    return done
      ? NextResponse.json<ApiResponse>({ status: "success", message: "سفارش لغو شد و مبلغ به خریدار برگشت.", data: null })
      : error("فقط سفارش‌هایی که هنوز ارسال نشده‌اند قابل لغو هستند.", 409);
  }

  if (action === "confirm" && !isSeller) {
    const settings = await getShopSettings();
    const done = await prisma.$transaction((tx) =>
      completeMarketOrder(tx, order.id, ["AWAITING_SELLER", "SELLER_SENT"], settings.payoutHoldHours, "خریدار دریافت آیتم را تأیید کرد."),
    );
    return done
      ? NextResponse.json<ApiResponse>({ status: "success", message: "دریافت تأیید شد. خریدت تکمیل شد.", data: null })
      : error("این سفارش قابل تأیید نیست.", 409);
  }

  if (action === "dispute" && !isSeller) {
    const reason = String(body?.reason ?? "").trim().slice(0, 1000);
    if (reason.length < 10) return error("لطفاً مشکل را حداقل در ۱۰ حرف توضیح بده.", 400);
    return (await disputeMarketOrder(order.id, reason))
      ? NextResponse.json<ApiResponse>({ status: "success", message: "اعتراض ثبت شد. پشتیبانی دوتامیت بررسی می‌کند.", data: null })
      : error("برای این سفارش نمی‌توان اعتراض ثبت کرد.", 409);
  }

  return error("عملیات نامعتبر است.", 400);
}
