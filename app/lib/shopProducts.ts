import type { ItemRarity, ShopProductType } from "@prisma/client";

/** Shared validation for admin product create/update bodies. */
const TYPES: ShopProductType[] = ["GIFT_CARD", "ITEM"];
const RARITIES: ItemRarity[] = ["COMMON", "UNCOMMON", "RARE", "MYTHICAL", "LEGENDARY", "IMMORTAL", "ARCANA"];

interface ProductData {
  title: string;
  /** Raw slug input (or empty) — the route turns it into a unique slug. */
  slugInput: string;
  shortDescription: string | null;
  description: string | null;
  features: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  heroName: string | null;
  rarity: ItemRarity | null;
  metaTitle: string | null;
  metaDescription: string | null;
  type: ShopProductType;
  priceUsdCents: number;
  stock: number | null;
  active: boolean;
}

type ParseResult = { data: ProductData; error?: never } | { data?: never; error: string };

const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max) || null;

export function parseProductBody(body: Record<string, unknown> | null): ParseResult {
  const title = String(body?.title ?? "").trim().slice(0, 120);
  const priceUsd = Number(body?.priceUsd);
  const type = TYPES.find((t) => t === body?.type);

  if (!title) return { error: "عنوان محصول لازم است." };
  if (!type) return { error: "نوع محصول نامعتبر است." };
  if (!Number.isFinite(priceUsd) || priceUsd <= 0 || priceUsd > 10_000) return { error: "قیمت دلاری نامعتبر است." };

  // Items: blank = unlimited. Gift cards are stocked by codes, so stock stays null.
  const rawStock = body?.stock;
  const stock = type === "ITEM" && rawStock !== "" && rawStock !== null && rawStock !== undefined ? Number(rawStock) : null;
  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return { error: "موجودی نامعتبر است." };

  const isItem = type === "ITEM";
  const rarity = isItem ? (RARITIES.find((r) => r === body?.rarity) ?? null) : null;

  return {
    data: {
      title,
      slugInput: String(body?.slug ?? "").trim(),
      shortDescription: text(body?.shortDescription, 300),
      description: text(body?.description, 20_000),
      features: text(body?.features, 2_000),
      imageUrl: text(body?.imageUrl, 500),
      imageAlt: text(body?.imageAlt, 160),
      heroName: isItem ? text(body?.heroName, 60) : null,
      rarity,
      metaTitle: text(body?.metaTitle, 90),
      metaDescription: text(body?.metaDescription, 300),
      type,
      priceUsdCents: Math.round(priceUsd * 100),
      stock,
      active: body?.active !== false,
    },
  };
}
