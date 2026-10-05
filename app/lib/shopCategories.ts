import type { ShopProductType } from "@prisma/client";

export interface ShopCategory {
  key: "gift-cards";
  type: ShopProductType;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
}

// The shop sells Steam gift cards only; kept as a list so /shop/[category] and the sitemap stay data-driven.
export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    key: "gift-cards",
    type: "GIFT_CARD",
    title: "گیفت کارت استیم",
    description: "کد شارژ کیف پول استیم با قیمت تومانی؛ اگر کد آماده باشد همان لحظه تحویلش می‌گیری.",
    metaTitle: "خرید گیفت کارت استیم با تحویل آنی | فروشگاه دوتامیت",
    metaDescription: "خرید گیفت کارت و کد شارژ کیف پول استیم (Steam Wallet) با قیمت تومانی، پرداخت آنلاین و تحویل آنی کد در فروشگاه دوتامیت.",
  },
];

export function getShopCategory(key: string) {
  return SHOP_CATEGORIES.find((c) => c.key === key) ?? null;
}

export function categoryForType(type: ShopProductType) {
  return SHOP_CATEGORIES.find((c) => c.type === type) ?? SHOP_CATEGORIES[0];
}

/** Product URL. Falls back to the id for any row that somehow has no slug yet. */
export function productHref(product: { id: number; slug: string | null }) {
  return `/shop/product/${encodeURIComponent(product.slug ?? String(product.id))}`;
}

export const SHOP_SORTS = [
  { key: "new", label: "پیش‌فرض" },
  { key: "cheap", label: "ارزان‌ترین" },
  { key: "expensive", label: "گران‌ترین" },
] as const;

export type ShopSort = (typeof SHOP_SORTS)[number]["key"];

export const SHOP_PAGE_SIZE = 15;
