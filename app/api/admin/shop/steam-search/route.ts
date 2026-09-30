import { NextRequest, NextResponse } from "next/server";

import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { steamEconomyImageUrl } from "@/app/lib/cdnUrls";
import type { ApiResponse } from "@/app/types/api";

/** Proxies Dota 2 Steam Community Market search so the admin can pick a real item, with its live USD price, instead of typing one by hand. */

const RARITY_WORDS = ["Immortal", "Arcana", "Legendary", "Mythical", "Rare", "Uncommon", "Common"];

interface SteamSearchResult {
  name: string;
  sell_price: number;
  sell_price_text: string;
  asset_description?: {
    icon_url?: string;
    type?: string;
    market_hash_name?: string;
    tradable?: number;
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "حداقل ۲ حرف وارد کن.", data: null }, { status: 400 });
  }

  let json: { success?: boolean; results?: SteamSearchResult[] } | null = null;
  try {
    const url = `https://steamcommunity.com/market/search/render/?query=${encodeURIComponent(query)}&appid=570&norender=1&count=20&currency=1`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } });
    if (res.status === 429) return NextResponse.json<ApiResponse>({ status: "error", message: "استیم موقتاً درخواست‌ها را محدود کرده. کمی بعد دوباره تلاش کن.", data: null }, { status: 429 });
    if (!res.ok) return NextResponse.json<ApiResponse>({ status: "error", message: "ارتباط با استیم برقرار نشد.", data: null }, { status: 502 });
    json = await res.json().catch(() => null);
  } catch {
    return NextResponse.json<ApiResponse>({ status: "error", message: "ارتباط با استیم برقرار نشد.", data: null }, { status: 502 });
  }

  if (!json?.success || !json.results) {
    return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: [] });
  }

  const items = json.results
    .map((r) => {
      const imageUrl = steamEconomyImageUrl(r.asset_description?.icon_url, 360);
      if (!imageUrl) return null;
      const type = r.asset_description?.type ?? "";
      const rarity = RARITY_WORDS.find((w) => type.toLowerCase().includes(w.toLowerCase())) ?? null;
      return {
        marketHashName: r.asset_description?.market_hash_name ?? r.name,
        title: r.name,
        type,
        rarity,
        priceUsd: r.sell_price / 100,
        priceUsdText: r.sell_price_text,
        imageUrl,
        tradable: r.asset_description?.tradable === 1,
      };
    })
    .filter((x) => x !== null);

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: items });
}
