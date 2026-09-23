import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getShopSettings } from "@/app/lib/shopPricing";
import { getWalletBalance, lockWallet } from "@/app/lib/wallet";
import { isValidSheba, normalizeSheba } from "@/app/lib/sheba";
import { notifyShopAdmins } from "@/app/lib/shopOrders";
import type { ApiResponse } from "@/app/types/api";

class WithdrawError extends Error {}

/**
 * Requests a payout of cleared sale income to the user's own Sheba account.
 * The amount leaves the wallet immediately (so it can't be spent twice); a
 * rejected request puts it back. Not gated by the shop switch — this is the
 * user's money.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amountToman);
  const sheba = normalizeSheba(String(body?.sheba ?? ""));
  const holderName = String(body?.holderName ?? "").trim().slice(0, 100);
  const settings = await getShopSettings();

  if (!Number.isInteger(amount) || amount < settings.minWithdrawalToman) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: `حداقل مبلغ برداشت ${settings.minWithdrawalToman.toLocaleString("fa-IR")} تومان است.`, data: null },
      { status: 400 },
    );
  }
  if (!isValidSheba(sheba)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "شماره شبا معتبر نیست.", data: null }, { status: 400 });
  }
  if (holderName.length < 3) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نام صاحب حساب را کامل وارد کن.", data: null }, { status: 400 });
  }

  let requestId: number;
  try {
    requestId = await prisma.$transaction(async (tx) => {
      await lockWallet(tx, session.id);
      const { withdrawable } = await getWalletBalance(session.id, tx);
      if (amount > withdrawable) {
        throw new WithdrawError(`حداکثر مبلغ قابل برداشت ${withdrawable.toLocaleString("fa-IR")} تومان است.`);
      }

      const withdrawal = await tx.withdrawalRequest.create({ data: { userId: session.id, amountToman: amount, sheba, holderName } });
      await tx.walletTransaction.create({
        data: { userId: session.id, type: "WITHDRAWAL", amountToman: -amount, withdrawable: true, withdrawalId: withdrawal.id, note: `درخواست برداشت به ${sheba}` },
      });
      await tx.user.update({ where: { id: session.id }, data: { payoutSheba: sheba, payoutHolderName: holderName } });
      return withdrawal.id;
    });
  } catch (error) {
    if (error instanceof WithdrawError) {
      return NextResponse.json<ApiResponse>({ status: "error", message: error.message, data: null }, { status: 409 });
    }
    throw error;
  }

  await notifyShopAdmins("درخواست برداشت جدید", `${amount.toLocaleString("fa-IR")} تومان — درخواست #${requestId}`, "/admin/shop/payouts");
  return NextResponse.json<ApiResponse>({ status: "success", message: "درخواست برداشت ثبت شد و پس از بررسی واریز می‌شود.", data: { id: requestId } });
}
