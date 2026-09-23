import type { ItemRarity } from "@prisma/client";

/**
 * Reads a user's public Dota 2 inventory (app 570, context 2) from Steam's
 * community endpoint. Used to (1) let sellers pick what to list and (2) check,
 * before a sale, that the seller still owns the item.
 */

export interface InventoryItem {
  assetId: string;
  classId: string;
  instanceId: string;
  name: string;
  type: string | null;
  iconUrl: string | null;
  rarity: ItemRarity | null;
  rarityColor: string | null;
  heroName: string | null;
  tradable: boolean;
}

export type InventoryResult =
  | { ok: true; items: InventoryItem[] }
  | { ok: false; reason: "private" | "rate_limited" | "unavailable" };

const RARITIES: Record<string, ItemRarity> = {
  common: "COMMON",
  uncommon: "UNCOMMON",
  rare: "RARE",
  mythical: "MYTHICAL",
  legendary: "LEGENDARY",
  immortal: "IMMORTAL",
  arcana: "ARCANA",
};

// Steam rate-limits this endpoint hard; a short cache keeps the listing flow
// (open picker → pick → submit) to one request per user.
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; result: InventoryResult }>();

interface SteamTag {
  category: string;
  localized_tag_name?: string;
  internal_name?: string;
  color?: string;
}

interface SteamDescription {
  classid: string;
  instanceid: string;
  name: string;
  type?: string;
  icon_url?: string;
  tradable?: number;
  tags?: SteamTag[];
}

export async function fetchDotaInventory(steamId64: string, { fresh = false } = {}): Promise<InventoryResult> {
  const hit = cache.get(steamId64);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.result;

  let result: InventoryResult;
  try {
    const res = await fetch(`https://steamcommunity.com/inventory/${steamId64}/570/2?l=english&count=2000`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json" },
    });

    if (res.status === 403) result = { ok: false, reason: "private" };
    else if (res.status === 429) result = { ok: false, reason: "rate_limited" };
    else if (!res.ok) result = { ok: false, reason: "unavailable" };
    else result = parseInventory(await res.json().catch(() => null));
  } catch {
    result = { ok: false, reason: "unavailable" };
  }

  // Don't cache failures — the user may flip their inventory to public and retry at once.
  if (result.ok) cache.set(steamId64, { at: Date.now(), result });
  return result;
}

export function parseInventory(json: unknown): InventoryResult {
  const data = json as { success?: number; assets?: { assetid: string; classid: string; instanceid: string }[]; descriptions?: SteamDescription[]; total_inventory_count?: number } | null;
  if (!data || data.success !== 1) return { ok: false, reason: "unavailable" };
  if (!data.assets || !data.descriptions) return { ok: true, items: [] }; // empty inventory

  const byClass = new Map(data.descriptions.map((d) => [`${d.classid}_${d.instanceid}`, d]));

  const items = data.assets.flatMap((asset): InventoryItem[] => {
    const d = byClass.get(`${asset.classid}_${asset.instanceid}`);
    if (!d) return [];
    const rarityTag = d.tags?.find((t) => t.category === "Rarity");
    const heroTag = d.tags?.find((t) => t.category === "Hero");
    return [
      {
        assetId: asset.assetid,
        classId: asset.classid,
        instanceId: asset.instanceid,
        name: d.name,
        type: d.type ?? null,
        iconUrl: d.icon_url ?? null,
        rarity: RARITIES[(rarityTag?.localized_tag_name ?? "").toLowerCase()] ?? null,
        rarityColor: rarityTag?.color ? `#${rarityTag.color}` : null,
        heroName: heroTag?.localized_tag_name ?? null,
        tradable: d.tradable === 1,
      },
    ];
  });

  return { ok: true, items };
}

export const INVENTORY_ERRORS: Record<"private" | "rate_limited" | "unavailable", string> = {
  private: "اینونتوری استیمت خصوصی است. در استیم به Edit Profile → Privacy Settings برو و Inventory را روی Public بگذار.",
  rate_limited: "استیم موقتاً درخواست‌ها را محدود کرده. یک دقیقه دیگر دوباره تلاش کن.",
  unavailable: "ارتباط با استیم برقرار نشد. کمی بعد دوباره تلاش کن.",
};
