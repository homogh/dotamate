import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { verifyPayment } from "@/app/lib/paymentGateway";
import { fulfillPaidOrder, markOrderPaid } from "@/app/lib/shopOrders";

/**
 * Where the gateway sends the buyer back. Deliberately NOT gated by the shop
 * switch: if the shop is turned off mid-payment, money already taken must
 * still be verified and credited. Safe to hit repeatedly — only the first
 * successful verification moves money.
 */
export async function GET(request: NextRequest) {
  const authority = request.nextUrl.searchParams.get("Authority") ?? "";
  const status = request.nextUrl.searchParams.get("Status");
  // Behind the VPS reverse proxy request.url can be the internal host, so build redirects from the public URL.
  const redirect = (path: string) => NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_API_URL ?? request.url));

  const payment = authority ? await prisma.payment.findUnique({ where: { authority } }) : null;
  if (!payment) return redirect("/dashboard/wallet?payment=invalid");

  const resultPath = payment.purpose === "ORDER" ? `/dashboard/orders/${payment.orderId}` : "/dashboard/wallet";
  const successPath = `${resultPath}?payment=success`;
  const failPath = `${resultPath}?payment=failed`;

  if (payment.status === "SUCCESS") return redirect(successPath);
  if (payment.status === "FAILED") return redirect(failPath);

  const verified = status === "OK" ? await verifyPayment(authority, payment.amountToman).catch(() => ({ ok: false as const })) : { ok: false as const };

  if (!verified.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED", verifiedAt: new Date() } });
      if (payment.orderId) await tx.shopOrder.updateMany({ where: { id: payment.orderId, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
    });
    return redirect(failPath);
  }

  const paidOrderId = await prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "SUCCESS", refId: "refId" in verified ? verified.refId : null, cardPan: "cardPan" in verified ? verified.cardPan : null, verifiedAt: new Date() },
    });
    if (count === 0) return null; // another request already processed this payment

    if (payment.purpose === "WALLET_TOPUP") {
      await tx.walletTransaction.create({
        data: { userId: payment.userId, type: "TOPUP", amountToman: payment.amountToman, note: `شارژ میت کیف — پیگیری ${"refId" in verified ? verified.refId : ""}` },
      });
      return null;
    }

    if (payment.purpose !== "ORDER") {
      // Left over from the removed user market: nothing to fulfil any more, so never keep the money.
      await tx.walletTransaction.create({
        data: { userId: payment.userId, type: "REFUND", amountToman: payment.amountToman, note: "بازگشت وجه پرداختی که دیگر قابل انجام نبود" },
      });
      return null;
    }

    const order = await tx.shopOrder.findUnique({ where: { id: payment.orderId! } });
    if (!order) return null;

    if (!(await markOrderPaid(tx, order.id))) {
      // Money arrived but the order is no longer payable (e.g. already cancelled) — never keep it.
      await tx.walletTransaction.create({
        data: { userId: payment.userId, type: "REFUND", amountToman: payment.amountToman, orderId: order.id, note: "پرداخت برای سفارشی که دیگر فعال نبود" },
      });
      return null;
    }

    return order.id;
  });

  if (paidOrderId) await fulfillPaidOrder(paidOrderId);
  return redirect(successPath);
}
