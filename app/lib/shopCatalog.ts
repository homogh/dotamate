import { cookies } from "next/headers";
import type { Prisma, ShopProduct, ShopSetting } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getShopSettings, priceToman } from "@/app/lib/shopPricing";
import { SHOP_PAGE_SIZE, type ShopSort } from "@/app/lib/shopCategories";

/** Every storefront query: the shop only sells gift cards, so any other product row stays invisible. */
const ON_SALE = { type: "GIFT_CARD", active: true } satisfies Prisma.ShopProductWhereInput;

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
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    shortDescription: product.shortDescription,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    priceUsdCents: product.priceUsdCents,
    priceToman: priceToman(product.priceUsdCents, settings),
    // Gift cards never sell out: an empty code bank just means an admin activates it in working hours.
    instant: availableCodes > 0,
  };
}

export type ShopListProduct = ReturnType<typeof toListProduct>;

async function toList(products: ShopProduct[], settings: ShopSetting) {
  const codes = await availableCodesFor(products.map((p) => p.id));
  return products.map((p) => toListProduct(p, settings, codes.get(p.id) ?? 0));
}

const PRICE_LADDER: Prisma.ShopProductOrderByWithRelationInput[] = [{ sortOrder: "asc" }, { id: "asc" }];

/** Shop home: the first gift cards on the price ladder plus the total, for the «مشاهده همه» link. */
export async function getShopLanding() {
  const settings = await getShopSettings();
  const [giftCards, giftCount] = await Promise.all([
    prisma.shopProduct.findMany({ where: ON_SALE, orderBy: PRICE_LADDER, take: 9 }),
    prisma.shopProduct.count({ where: ON_SALE }),
  ]);

  return { settings, giftCards: await toList(giftCards, settings), giftCount };
}

const SORT_ORDER: Record<ShopSort, Prisma.ShopProductOrderByWithRelationInput[]> = {
  new: PRICE_LADDER,
  // Every gift card shares one margin, so dollar order == Toman order.
  cheap: [{ priceUsdCents: "asc" }, { id: "asc" }],
  expensive: [{ priceUsdCents: "desc" }, { id: "desc" }],
};

export async function getCategoryProducts(page: number, sort: ShopSort) {
  const settings = await getShopSettings();
  const total = await prisma.shopProduct.count({ where: ON_SALE });
  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);

  const products = await prisma.shopProduct.findMany({
    where: ON_SALE,
    orderBy: SORT_ORDER[sort],
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
  if (!product || !product.active || product.type !== ON_SALE.type) return null;

  const settings = await getShopSettings();
  const codes = await availableCodesFor([product.id]);

  return {
    raw: product,
    product: toListProduct(product, settings, codes.get(product.id) ?? 0),
    settings,
    similar: await getSimilarProducts(product, settings),
  };
}

/** Four other gift cards, closest in value first. */
async function getSimilarProducts(product: ShopProduct, settings: ShopSetting) {
  const candidates = await prisma.shopProduct.findMany({
    where: { ...ON_SALE, id: { not: product.id } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const ranked = candidates
    .map((p, index) => ({ p, s: -Math.abs(p.priceUsdCents - product.priceUsdCents), index }))
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .slice(0, 4)
    .map((x) => x.p);

  return toList(ranked, settings);
}
