import type { MarketListing, Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { steamEconomyImageUrl } from "@/app/lib/cdnUrls";
import { SHOP_PAGE_SIZE, type ShopSort } from "@/app/lib/shopCategories";

type ListingWithSeller = MarketListing & { seller: { id: number; displayName: string; avatarUrl: string | null } };

function toCard(listing: ListingWithSeller) {
  return {
    id: listing.id,
    itemName: listing.itemName,
    itemType: listing.itemType,
    imageUrl: steamEconomyImageUrl(listing.iconUrl),
    rarity: listing.rarity,
    heroName: listing.heroName,
    priceToman: listing.priceToman,
    sellerId: listing.seller.id,
    sellerName: listing.seller.displayName,
    sellerAvatar: listing.seller.avatarUrl,
    createdAt: listing.createdAt,
  };
}

export type MarketListingCard = ReturnType<typeof toCard>;

const withSeller = { seller: { select: { id: true, displayName: true, avatarUrl: true } } } as const;
// Banned sellers' listings disappear from the market without touching their rows.
const visible: Prisma.MarketListingWhereInput = { status: "ACTIVE", seller: { banned: false } };

export async function getLatestListings(take = 4) {
  const listings = await prisma.marketListing.findMany({ where: visible, include: withSeller, orderBy: { createdAt: "desc" }, take });
  return listings.map(toCard);
}

export async function countActiveListings() {
  return prisma.marketListing.count({ where: visible });
}

const SORT_ORDER: Record<ShopSort, Prisma.MarketListingOrderByWithRelationInput[]> = {
  new: [{ createdAt: "desc" }, { id: "desc" }],
  cheap: [{ priceToman: "asc" }, { id: "asc" }],
  expensive: [{ priceToman: "desc" }, { id: "desc" }],
};

export async function getMarketListings(page: number, sort: ShopSort) {
  const total = await prisma.marketListing.count({ where: visible });
  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const listings = await prisma.marketListing.findMany({
    where: visible,
    include: withSeller,
    orderBy: SORT_ORDER[sort],
    skip: (current - 1) * SHOP_PAGE_SIZE,
    take: SHOP_PAGE_SIZE,
  });
  return { listings: listings.map(toCard), total, page: current, totalPages };
}

/** Listing page data: the listing (any status — a sold one still shows as sold), seller track record, look-alikes. */
export async function getMarketListingPage(id: number) {
  const listing = await prisma.marketListing.findUnique({ where: { id }, include: withSeller });
  if (!listing || listing.status === "REMOVED") return null;

  const [completedSales, activeListings, similarRaw] = await Promise.all([
    prisma.marketOrder.count({ where: { sellerId: listing.sellerId, status: "COMPLETED" } }),
    prisma.marketListing.count({ where: { sellerId: listing.sellerId, status: "ACTIVE" } }),
    prisma.marketListing.findMany({
      where: {
        ...visible,
        id: { not: listing.id },
        OR: [...(listing.heroName ? [{ heroName: listing.heroName }] : []), ...(listing.rarity ? [{ rarity: listing.rarity }] : []), { classId: listing.classId }],
      },
      include: withSeller,
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const sellerSince = await prisma.user.findUnique({ where: { id: listing.sellerId }, select: { createdAt: true } });

  return {
    listing,
    card: toCard(listing),
    seller: { completedSales, activeListings, memberSince: sellerSince?.createdAt ?? null },
    similar: similarRaw.map(toCard),
  };
}
