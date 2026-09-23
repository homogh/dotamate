import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireMarketUser } from "@/app/lib/shopAccess";
import { fetchDotaInventory, INVENTORY_ERRORS } from "@/app/lib/steamInventory";
import { steamEconomyImageUrl } from "@/app/lib/cdnUrls";
import type { ApiResponse } from "@/app/types/api";

/** The seller's own Dota 2 inventory, for picking what to list. */
export async function GET(request: NextRequest) {
  const auth = await requireMarketUser(request);
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({ where: { id: auth.session.id }, select: { steamId: true } });
  if (!user?.steamId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "برای فروش، اول اکانت استیمت را در تنظیمات وصل کن.", data: null }, { status: 409 });
  }

  const inventory = await fetchDotaInventory(user.steamId, { fresh: request.nextUrl.searchParams.get("refresh") === "1" });
  if (!inventory.ok) {
    return NextResponse.json<ApiResponse>({ status: "error", message: INVENTORY_ERRORS[inventory.reason], data: { reason: inventory.reason } }, { status: 502 });
  }

  const listed = await prisma.marketListing.findMany({
    where: { assetId: { in: inventory.items.map((i) => i.assetId) }, status: { in: ["ACTIVE", "RESERVED"] } },
    select: { assetId: true },
  });
  const listedIds = new Set(listed.map((l) => l.assetId));

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: inventory.items.map((item) => ({
      ...item,
      imageUrl: steamEconomyImageUrl(item.iconUrl, 128),
      alreadyListed: listedIds.has(item.assetId),
    })),
  });
}
