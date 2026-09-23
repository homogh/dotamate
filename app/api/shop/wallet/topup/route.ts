import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireShopUser } from "@/app/lib/shopAccess";
import { gatewayName, requestPayment } from "@/app/lib/paymentGateway";
import type { ApiResponse } from "@/app/types/api";

const MIN_TOPUP = 10_000;
const MAX_TOPUP = 100_000_000;

export async function POST(request: NextRequest) {
  const auth = await requireShopUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amountToman);
  if (!Number.isInteger(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: `مبلغ شارژ باید بین ${MIN_TOPUP.toLocaleString("fa-IR")} و ${MAX_TOPUP.toLocaleString("fa-IR")} تومان باشد.`, data: null },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: auth.session.id }, select: { email: true, phone: true, banned: true } });
  if (!user || user.banned) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "حساب شما مسدود است.", data: null }, { status: 403 });
  }

  try {
    const { authority, redirectUrl } = await requestPayment({
      amountToman: amount,
      description: "دوتامیت — شارژ میت کیف",
      email: user.email,
      mobile: user.phone,
    });
    await prisma.payment.create({
      data: { userId: auth.session.id, purpose: "WALLET_TOPUP", amountToman: amount, gateway: gatewayName(), authority },
    });
    return NextResponse.json<ApiResponse>({ status: "success", message: "در حال انتقال به درگاه...", data: { redirectUrl } });
  } catch (error) {
    console.error("[shop] top-up request failed", error);
    return NextResponse.json<ApiResponse>({ status: "error", message: "اتصال به درگاه پرداخت ناموفق بود. دوباره تلاش کن.", data: null }, { status: 502 });
  }
}
