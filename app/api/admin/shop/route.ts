import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { getPlatformSettings } from "@/app/lib/platformSettings";
import { getShopSettings } from "@/app/lib/shopPricing";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const [platform, settings] = await Promise.all([getPlatformSettings(), getShopSettings()]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: { shopEnabled: platform.shopEnabled, settings },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  await getPlatformSettings();

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
