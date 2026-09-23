import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { getShopSettings } from "@/app/lib/shopPricing";
import type { ApiResponse } from "@/app/types/api";

/** [field, min, max, integer?] — every numeric setting is range-checked before it can reach pricing. */
const FIELDS: [string, number, number, boolean][] = [
  ["usdCostToman", 0, 100_000_000, true],
  ["giftCardMarginPercent", 0, 100, false],
  ["itemMarginPercent", 0, 100, false],
  ["marketCommissionPercent", 0, 50, false],
  ["gatewayFeePercent", 0, 10, false],
  ["workStartHour", 0, 23, true],
  ["workEndHour", 1, 24, true],
  ["lowStockThreshold", 0, 1000, true],
  ["minWithdrawalToman", 0, 1_000_000_000, true],
  ["payoutHoldHours", 0, 24 * 30, true],
  ["sellerDeadlineHours", 1, 24 * 7, true],
  ["buyerConfirmHours", 1, 24 * 14, true],
];

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const data: Record<string, number> = {};

  for (const [key, min, max, integer] of FIELDS) {
    if (!(key in (body ?? {}))) continue;
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      return NextResponse.json<ApiResponse>({ status: "error", message: `مقدار «${key}» نامعتبر است.`, data: null }, { status: 400 });
    }
    data[key] = value;
  }

  const current = await getShopSettings();
  const start = data.workStartHour ?? current.workStartHour;
  const end = data.workEndHour ?? current.workEndHour;
  if (start >= end) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "ساعت شروع کار باید قبل از ساعت پایان باشد.", data: null }, { status: 400 });
  }

  const [updated] = await prisma.$transaction([
    prisma.shopSetting.update({ where: { id: 1 }, data }),
    prisma.auditLog.create({
      data: { actorId: auth.session.id, action: "UPDATE_SHOP_SETTINGS", targetType: "ShopSetting", detail: JSON.stringify(data) },
    }),
  ]);

  return NextResponse.json<ApiResponse>({ status: "success", message: "تنظیمات فروشگاه ذخیره شد.", data: updated });
}
