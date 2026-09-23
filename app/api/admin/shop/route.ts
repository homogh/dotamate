import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { getPlatformSettings } from "@/app/lib/platformSettings";
import { getShopSettings } from "@/app/lib/shopPricing";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const [platform, settings, marketInFlight] = await Promise.all([
    getPlatformSettings(),
    getShopSettings(),
    prisma.marketOrder.count({ where: { status: { in: ["PENDING_PAYMENT", "AWAITING_SELLER", "SELLER_SENT", "DISPUTED"] } } }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: { shopEnabled: platform.shopEnabled, marketEnabled: platform.marketEnabled, marketInFlight, settings },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  await getPlatformSettings();

  // { marketEnabled } flips the user-market switch; { shopEnabled } the whole shop.
  if (typeof body?.marketEnabled === "boolean") {
    const [updated] = await prisma.$transaction([
      prisma.platformSetting.update({ where: { id: 1 }, data: { marketEnabled: body.marketEnabled } }),
      prisma.auditLog.create({
        data: { actorId: auth.session.id, action: "TOGGLE_MARKET", targetType: "PlatformSetting", detail: JSON.stringify({ marketEnabled: body.marketEnabled }) },
      }),
    ]);
    return NextResponse.json<ApiResponse>({
      status: "success",
      message: updated.marketEnabled ? "بازار کاربران فعال شد." : "بازار کاربران غیرفعال شد.",
      data: { marketEnabled: updated.marketEnabled },
    });
  }

  if (typeof body?.shopEnabled !== "boolean") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "مقدار نامعتبر است.", data: null }, { status: 400 });
  }

  const [updated] = await prisma.$transaction([
    prisma.platformSetting.update({ where: { id: 1 }, data: { shopEnabled: body.shopEnabled } }),
    prisma.auditLog.create({
      data: {
        actorId: auth.session.id,
        action: "TOGGLE_SHOP",
        targetType: "PlatformSetting",
        detail: JSON.stringify({ shopEnabled: body.shopEnabled }),
      },
    }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: updated.shopEnabled ? "فروشگاه فعال شد." : "فروشگاه غیرفعال شد.",
    data: { shopEnabled: updated.shopEnabled },
  });
}
