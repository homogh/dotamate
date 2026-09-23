import type { ItemRarity, ShopProductType } from "@prisma/client";

export interface ShopCategory {
  key: "gift-cards" | "dota-items" | "market";
  /** Store product type listed here; null for the user market, which lists MarketListing rows instead. */
  type: ShopProductType | null;
  title: string;
  shortTitle: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    key: "gift-cards",
    type: "GIFT_CARD",
    title: "گیفت کارت استیم",
    shortTitle: "گیفت کارت",
    description: "کد شارژ کیف پول استیم با تحویل آنی و قیمت تومانی.",
    metaTitle: "خرید گیفت کارت استیم با تحویل آنی | فروشگاه دوتامیت",
    metaDescription: "خرید گیفت کارت و کد شارژ کیف پول استیم (Steam Wallet) با قیمت تومانی، پرداخت آنلاین و تحویل آنی کد در فروشگاه دوتامیت.",
  },
  {
    key: "dota-items",
    type: "ITEM",
    title: "آیتم‌های دوتا ۲",
    shortTitle: "آیتم دوتا",
    description: "ست‌ها، آرکاناها و آیتم‌های کمیاب با ارسال از طریق ترید استیم.",
    metaTitle: "خرید آیتم دوتا ۲، ست و آرکانا | فروشگاه دوتامیت",
    metaDescription: "خرید آیتم‌های دوتا ۲ شامل ست، آرکانا و آیتم‌های کمیاب با قیمت تومانی و ارسال امن از طریق ترید استیم در فروشگاه دوتامیت.",
  },
  {
    key: "market",
    type: null,
    title: "بازار کاربران",
    shortTitle: "بازار کاربران",
    description: "آیتم‌های دوتای خودت را بفروش و پولش را در میت کیف بگیر.",
    metaTitle: "بازار خرید و فروش آیتم دوتا ۲ بین بازیکنان | دوتامیت",
    metaDescription: "بازار امن خرید و فروش آیتم‌های دوتا ۲ بین بازیکنان با واسطه‌گری دوتامیت و دریافت پول در میت کیف.",
  },
];

export function getShopCategory(key: string) {
  return SHOP_CATEGORIES.find((c) => c.key === key) ?? null;
}

export function categoryForType(type: ShopProductType) {
  return SHOP_CATEGORIES.find((c) => c.type === type)!;
}

/** Product URL. Falls back to the id for any row that somehow has no slug yet. */
export function productHref(product: { id: number; slug: string | null }) {
  return `/shop/product/${encodeURIComponent(product.slug ?? String(product.id))}`;
}

export const RARITY_META: Record<ItemRarity, { label: string; color: string }> = {
  COMMON: { label: "Common", color: "#b0c3d9" },
  UNCOMMON: { label: "Uncommon", color: "#5e98d9" },
  RARE: { label: "Rare", color: "#4b69ff" },
  MYTHICAL: { label: "Mythical", color: "#8847ff" },
  LEGENDARY: { label: "Legendary", color: "#d32ce6" },
  IMMORTAL: { label: "Immortal", color: "#e4ae39" },
  ARCANA: { label: "Arcana", color: "#ade55c" },
};

export const SHOP_SORTS = [
  { key: "new", label: "جدیدترین" },
  { key: "cheap", label: "ارزان‌ترین" },
  { key: "expensive", label: "گران‌ترین" },
] as const;

export type ShopSort = (typeof SHOP_SORTS)[number]["key"];

export const SHOP_PAGE_SIZE = 15;
