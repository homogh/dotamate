import { cookies } from "next/headers";
import type { Prisma, ShopProduct, ShopProductType, ShopSetting } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getShopSettings, priceToman } from "@/app/lib/shopPricing";
import { SHOP_PAGE_SIZE, type ShopSort } from "@/app/lib/shopCategories";
import { countActiveListings, getLatestListings } from "@/app/lib/marketCatalog";

/** Signed-in viewer for server components, or null. */
export async function getViewerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

async function availableCodesFor(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, number>();
  const stock = await prisma.giftCode.groupBy({
    by: ["productId"],
    where: { status: "AVAILABLE", productId: { in: productIds } },
    _count: true,
  });
  return new Map(stock.map((s) => [s.productId, s._count]));
}

function toListProduct(product: ShopProduct, settings: ShopSetting, availableCodes: number) {
  const isGift = product.type === "GIFT_CARD";
  return {
    id: product.id,
    slug: product.slug,
    type: product.type,
    title: product.title,
    shortDescription: product.shortDescription,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    heroName: product.heroName,
    rarity: product.rarity,
    priceUsdCents: product.priceUsdCents,
    priceToman: priceToman(product.priceUsdCents, product.type, settings),
    // Gift cards never sell out: an empty code bank just means an admin activates it in working hours.
    instant: isGift && availableCodes > 0,
    soldOut: !isGift && product.stock !== null && product.stock <= 0,
  };
}

export type ShopListProduct = ReturnType<typeof toListProduct>;

async function toList(products: ShopProduct[], settings: ShopSetting) {
  const codes = await availableCodesFor(products.filter((p) => p.type === "GIFT_CARD").map((p) => p.id));
  return products.map((p) => toListProduct(p, settings, codes.get(p.id) ?? 0));
}

/** Shop home: every gift card, the newest few items, and per-category counts for the category tiles. */
export async function getShopLanding(includeMarket: boolean) {
  const settings = await getShopSettings();
  const [giftCards, latestItems, giftCount, itemCount, latestListings, listingCount] = await Promise.all([
    prisma.shopProduct.findMany({ where: { type: "GIFT_CARD", active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 6 }),
    prisma.shopProduct.findMany({ where: { type: "ITEM", active: true }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.shopProduct.count({ where: { type: "GIFT_CARD", active: true } }),
    prisma.shopProduct.count({ where: { type: "ITEM", active: true } }),
    includeMarket ? getLatestListings(4) : [],
    includeMarket ? countActiveListings() : 0,
  ]);

  return {
    settings,
    giftCards: await toList(giftCards, settings),
    latestItems: await toList(latestItems, settings),
    latestListings,
    counts: { "gift-cards": giftCount, "dota-items": itemCount, market: listingCount } as Record<string, number>,
  };
}

const SORT_ORDER: Record<ShopSort, Prisma.ShopProductOrderByWithRelationInput[]> = {
  new: [{ createdAt: "desc" }, { id: "desc" }],
  // Within one category every product shares a margin, so dollar order == Toman order.
  cheap: [{ priceUsdCents: "asc" }, { id: "asc" }],
  expensive: [{ priceUsdCents: "desc" }, { id: "desc" }],
};

export async function getCategoryProducts(type: ShopProductType, page: number, sort: ShopSort) {
  const settings = await getShopSettings();
  const where = { type, active: true };
  const total = await prisma.shopProduct.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);

  const products = await prisma.shopProduct.findMany({
    where,
    // Gift cards read best as a price ladder by default; items newest-first.
    orderBy: sort === "new" && type === "GIFT_CARD" ? [{ sortOrder: "asc" }, { id: "asc" }] : SORT_ORDER[sort],
    skip: (current - 1) * SHOP_PAGE_SIZE,
    take: SHOP_PAGE_SIZE,
  });

  return { settings, products: await toList(products, settings), total, page: current, totalPages };
}

/** Looks a product up by slug (or by id, for links made before slugs existed). */
async function findProduct(slugOrId: string) {
  const bySlug = await prisma.shopProduct.findUnique({ where: { slug: slugOrId } });
  if (bySlug) return bySlug;
  return /^\d+$/.test(slugOrId) ? prisma.shopProduct.findUnique({ where: { id: Number(slugOrId) } }) : null;
}

export async function getShopProductPage(slugOrId: string) {
  const product = await findProduct(slugOrId);
  if (!product || !product.active) return null;

  const settings = await getShopSettings();
  const codes = await availableCodesFor(product.type === "GIFT_CARD" ? [product.id] : []);

  return {
    raw: product,
    product: toListProduct(product, settings, codes.get(product.id) ?? 0),
    settings,
    similar: await getSimilarProducts(product, settings),
  };
}

/**
 * Four look-alikes from the same category: gift cards closest in value;
 * items sharing the hero first, then the rarity, then the newest.
 */
async function getSimilarProducts(product: ShopProduct, settings: ShopSetting) {
  const candidates = await prisma.shopProduct.findMany({
    where: { type: product.type, active: true, id: { not: product.id } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const score = (p: ShopProduct) =>
    product.type === "GIFT_CARD"
      ? -Math.abs(p.priceUsdCents - product.priceUsdCents)
      : (p.heroName && p.heroName === product.heroName ? 2 : 0) + (p.rarity && p.rarity === product.rarity ? 1 : 0);

  const ranked = candidates
    .map((p, index) => ({ p, s: score(p), index }))
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .slice(0, 4)
    .map((x) => x.p);

  return toList(ranked, settings);
}
