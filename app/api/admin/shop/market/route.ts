import { NextRequest, NextResponse } from "next/server";
import type { MarketOrderStatus } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { processMarketTimeouts } from "@/app/lib/marketOrders";
import type { ApiResponse } from "@/app/types/api";

const ORDER_TABS: Record<string, MarketOrderStatus[]> = {
  disputes: ["DISPUTED"],
  active: ["AWAITING_SELLER", "SELLER_SENT"],
  done: ["COMPLETED", "REFUNDED"],
};

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  await processMarketTimeouts();
  const tab = request.nextUrl.searchParams.get("tab") ?? "disputes";

  const [counts, commission] = await Promise.all([
    prisma.marketOrder.groupBy({ by: ["status"], _count: true }),
    prisma.marketOrder.aggregate({ where: { status: "COMPLETED" }, _sum: { commissionToman: true, priceToman: true } }),
  ]);
  const countOf = (statuses: MarketOrderStatus[]) => counts.filter((c) => statuses.includes(c.status)).reduce((s, c) => s + c._count, 0);
  const summary = {
    disputes: countOf(ORDER_TABS.disputes),
    active: countOf(ORDER_TABS.active),
    activeListings: await prisma.marketListing.count({ where: { status: "ACTIVE" } }),
    completedVolume: commission._sum.priceToman ?? 0,
    commissionEarned: commission._sum.commissionToman ?? 0,
  };

  if (tab === "listings") {
    const listings = await prisma.marketListing.findMany({
      where: { status: "ACTIVE" },
      include: { seller: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json<ApiResponse>({
      status: "success",
      message: "ok",
      data: {
        summary,
        listings: listings.map((l) => ({ id: l.id, itemName: l.itemName, priceToman: l.priceToman, sellerId: l.seller.id, sellerName: l.seller.displayName, createdAt: l.createdAt })),
      },
    });
  }

  const orders = await prisma.marketOrder.findMany({
    where: { status: { in: ORDER_TABS[tab] ?? ORDER_TABS.disputes } },
    include: {
      listing: { select: { id: true, itemName: true, assetId: true } },
      buyer: { select: { id: true, displayName: true } },
      seller: { select: { id: true, displayName: true } },
    },
    orderBy: { paidAt: "desc" },
    take: 200,
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      summary,
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        itemName: o.listing.itemName,
        listingId: o.listing.id,
        assetId: o.listing.assetId,
        buyerId: o.buyer.id,
        buyerName: o.buyer.displayName,
        sellerId: o.seller.id,
        sellerName: o.seller.displayName,
        priceToman: o.priceToman,
        commissionToman: o.commissionToman,
        buyerTradeUrl: o.buyerTradeUrl,
        paidAt: o.paidAt,
        sentAt: o.sentAt,
        sellerDeadlineAt: o.sellerDeadlineAt,
        autoCompleteAt: o.autoCompleteAt,
        disputeReason: o.disputeReason,
        resolutionNote: o.resolutionNote,
      })),
    },
  });
}
