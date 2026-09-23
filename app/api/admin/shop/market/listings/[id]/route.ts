import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import type { ApiResponse } from "@/app/types/api";

/** Admin takes down an active listing (e.g. misleading price or description). Paid-for listings go through the order flow instead. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const listingId = Number(id);
  const reason = String((await request.json().catch(() => null))?.reason ?? "").trim().slice(0, 300) || "مغایر با قوانین بازار";

  const listing = await prisma.marketListing.findUnique({ where: { id: listingId }, select: { sellerId: true, itemName: true } });
  const { count } = await prisma.marketListing.updateMany({ where: { id: listingId, status: "ACTIVE" }, data: { status: "REMOVED" } });
  if (!listing || count === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فقط آگهی‌های فعال قابل حذف هستند.", data: null }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.notification.create({
      data: { userId: listing.sellerId, type: "SHOP_ORDER", title: "آگهی شما حذف شد", body: `«${listing.itemName}»: ${reason}`, link: "/dashboard/listings" },
    }),
    prisma.auditLog.create({ data: { actorId: auth.session.id, action: "REMOVE_MARKET_LISTING", targetType: "MarketListing", targetId: listingId, detail: reason } }),
  ]);

  return NextResponse.json<ApiResponse>({ status: "success", message: "آگهی حذف شد.", data: null });
}
