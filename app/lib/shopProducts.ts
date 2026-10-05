/** Shared validation for admin product create/update bodies. The shop sells gift cards only. */
interface ProductData {
  title: string;
  /** Raw slug input (or empty) — the route turns it into a unique slug. */
  slugInput: string;
  shortDescription: string | null;
  description: string | null;
  features: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  type: "GIFT_CARD";
  priceUsdCents: number;
  active: boolean;
}

type ParseResult = { data: ProductData; error?: never } | { data?: never; error: string };

const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max) || null;

export function parseProductBody(body: Record<string, unknown> | null): ParseResult {
  const title = String(body?.title ?? "").trim().slice(0, 120);
  const priceUsd = Number(body?.priceUsd);

  if (!title) return { error: "عنوان گیفت کارت لازم است." };
  if (!Number.isFinite(priceUsd) || priceUsd <= 0 || priceUsd > 10_000) return { error: "مبلغ دلاری نامعتبر است." };

  return {
    data: {
      title,
      slugInput: String(body?.slug ?? "").trim(),
      shortDescription: text(body?.shortDescription, 300),
      description: text(body?.description, 20_000),
      features: text(body?.features, 2_000),
      imageUrl: text(body?.imageUrl, 700),
      imageAlt: text(body?.imageAlt, 160),
      metaTitle: text(body?.metaTitle, 90),
      metaDescription: text(body?.metaDescription, 300),
      type: "GIFT_CARD",
      priceUsdCents: Math.round(priceUsd * 100),
      active: body?.active !== false,
    },
  };
}
