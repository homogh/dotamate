import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireShopUser } from "@/app/lib/shopAccess";
import { getShopSettings, priceToman } from "@/app/lib/shopPricing";
import { fulfillPaidOrder, markOrderPaid, reserveItemStock } from "@/app/lib/shopOrders";
import { getWalletBalance, lockWallet } from "@/app/lib/wallet";
import { gatewayName, requestPayment } from "@/app/lib/paymentGateway";
import type { ApiResponse } from "@/app/types/api";

class CheckoutError extends Error {}

export async function POST(request: NextRequest) {
  const auth = await requireShopUser(request);
  if (auth.error) return auth.error;
  const userId = auth.session.id;

  const body = await request.json().catch(() => null);
  const productId = Number(body?.productId);
  const paymentMethod = body?.paymentMethod === "WALLET" ? "WALLET" : body?.paymentMethod === "GATEWAY" ? "GATEWAY" : null;
  if (!productId || !paymentMethod) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "درخواست نامعتبر است.", data: null }, { status: 400 });
  }

  const [product, settings, user] = await Promise.all([
    prisma.shopProduct.findUnique({ where: { id: productId } }),
    getShopSettings(),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true, steamTradeUrl: true, banned: true } }),
  ]);

  if (!product || !product.active || !user) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این محصول در دسترس نیست.", data: null }, { status: 404 });
  }
  if (user.banned) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "حساب شما مسدود است.", data: null }, { status: 403 });
  }

  const total = priceToman(product.priceUsdCents, product.type, settings);
  if (total === null) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "قیمت این محصول هنوز تعیین نشده.", data: null }, { status: 409 });
  }

  if (product.type === "ITEM") {
    if (!user.steamTradeUrl) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "برای خرید آیتم، اول Trade URL استیمت را در تنظیمات ثبت کن.", data: { needsTradeUrl: true } },
        { status: 409 },
      );
    }
    if (product.stock !== null && product.stock <= 0) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "موجودی این آیتم تمام شده.", data: null }, { status: 409 });
    }
  }

  const orderData = {
    userId,
    productId,
    paymentMethod,
    priceUsdCents: product.priceUsdCents,
    usdCostToman: settings.usdCostToman,
    totalToman: total,
    tradeUrl: product.type === "ITEM" ? user.steamTradeUrl : null,
  } as const;

  if (paymentMethod === "WALLET") {
    let orderId: number;
    try {
      orderId = await prisma.$transaction(async (tx) => {
        await lockWallet(tx, userId);
        const { total: balance } = await getWalletBalance(userId, tx);
        if (balance < total) throw new CheckoutError("موجودی میت کیف کافی نیست.");

        if (product.type === "ITEM" && !(await reserveItemStock(tx, productId))) {
          throw new CheckoutError("موجودی این آیتم تمام شده.");
        }

        const order = await tx.shopOrder.create({ data: orderData });
        await tx.walletTransaction.create({
          data: { userId, type: "PURCHASE", amountToman: -total, orderId: order.id, note: product.title },
        });
        await markOrderPaid(tx, order.id, product.type);
        return order.id;
      });
    } catch (error) {
      if (error instanceof CheckoutError) {
        return NextResponse.json<ApiResponse>({ status: "error", message: error.message, data: null }, { status: 409 });
      }
      throw error;
    }

    await fulfillPaidOrder(orderId);
    return NextResponse.json<ApiResponse>({
      status: "success",
      message: "خرید با موفقیت انجام شد.",
      data: { orderId, redirectUrl: `/dashboard/orders/${orderId}` },
    });
  }

  const order = await prisma.shopOrder.create({ data: orderData });

  try {
    const { authority, redirectUrl } = await requestPayment({
      amountToman: total,
      description: `دوتامیت — ${product.title} (سفارش #${order.id})`,
      email: user.email,
      mobile: user.phone,
    });
    await prisma.payment.create({
      data: { userId, purpose: "ORDER", orderId: order.id, amountToman: total, gateway: gatewayName(), authority },
    });
    return NextResponse.json<ApiResponse>({ status: "success", message: "در حال انتقال به درگاه...", data: { orderId: order.id, redirectUrl } });
  } catch (error) {
    console.error("[shop] payment request failed", error);
    await prisma.shopOrder.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    return NextResponse.json<ApiResponse>({ status: "error", message: "اتصال به درگاه پرداخت ناموفق بود. دوباره تلاش کن.", data: null }, { status: 502 });
  }
}
