const OPENDOTA_BASE = "https://api.opendota.com/api";
const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";

export interface OpenDotaMatch {
  matchId: number;
  heroId: number;
  win: boolean;
  duration: number;
  startAt: string;
  kills: number;
  deaths: number;
  assists: number;
  gameMode: number;
  partySize: number | null;
}

export interface OpenDotaSync {
  wins: number;
  losses: number;
  rankTierHint: number | null;
  matches: OpenDotaMatch[];
}

function isRadiantSlot(playerSlot: number) {
  return playerSlot < 128;
}

export async function refreshOpenDotaPlayer(accountId: number) {
  try {
    await fetch(`${OPENDOTA_BASE}/players/${accountId}/refresh`, { method: "POST" });
  } catch {
    // best-effort — the verify step still works off whatever OpenDota already has cached
  }
}

export async function syncOpenDotaPlayer(accountId: number): Promise<OpenDotaSync | null> {
  const [profileRes, wlRes, matchesRes] = await Promise.all([
    fetch(`${OPENDOTA_BASE}/players/${accountId}`, { cache: "no-store" }),
    fetch(`${OPENDOTA_BASE}/players/${accountId}/wl`, { cache: "no-store" }),
    fetch(`${OPENDOTA_BASE}/players/${accountId}/matches?limit=10`, { cache: "no-store" }),
  ]);

  if (!matchesRes.ok || !wlRes.ok) return null;

  const [profile, wl, matches] = await Promise.all([
    profileRes.ok ? profileRes.json().catch(() => null) : null,
    wlRes.json(),
    matchesRes.json(),
  ]);

  if (!Array.isArray(matches)) return null;

  return {
    wins: Number(wl?.win ?? 0),
    losses: Number(wl?.lose ?? 0),
    rankTierHint: typeof profile?.rank_tier === "number" ? profile.rank_tier : null,
    matches: matches.map((m: Record<string, unknown>) => ({
      matchId: Number(m.match_id),
      heroId: Number(m.hero_id),
      win: isRadiantSlot(Number(m.player_slot)) === Boolean(m.radiant_win),
      duration: Number(m.duration),
      startAt: new Date(Number(m.start_time) * 1000).toISOString(),
      kills: Number(m.kills ?? 0),
      deaths: Number(m.deaths ?? 0),
      assists: Number(m.assists ?? 0),
      gameMode: Number(m.game_mode ?? 0),
      partySize: typeof m.party_size === "number" ? m.party_size : null,
    })),
  };
}

let heroCache: { data: Record<number, { name: string; localizedName: string }>; fetchedAt: number } | null = null;
const HERO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getHeroLookup() {
  if (heroCache && Date.now() - heroCache.fetchedAt < HERO_CACHE_TTL_MS) {
    return heroCache.data;
  }

  const res = await fetch(`${OPENDOTA_BASE}/constants/heroes`, { cache: "no-store" });
  if (!res.ok) return heroCache?.data ?? {};

  const json = await res.json().catch(() => null);
  if (!json || typeof json !== "object") return heroCache?.data ?? {};

  const data: Record<number, { name: string; localizedName: string }> = {};
  for (const hero of Object.values(json) as Record<string, unknown>[]) {
    const id = Number(hero.id);
    data[id] = { name: String(hero.name ?? ""), localizedName: String(hero.localized_name ?? `Hero ${id}`) };
  }

  heroCache = { data, fetchedAt: Date.now() };
  return data;
}

// --- Meta / tier list -------------------------------------------------

export interface OpenDotaHeroStat {
  id: number;
  name: string;
  localizedName: string;
  img: string;
  icon: string;
  primaryAttr: string;
  attackType: string;
  roles: string[];
  brackets: { bracket: number; picks: number; wins: number }[];
  proPicks: number;
  proWins: number;
  proBans: number;
}

let heroStatsCache: { data: OpenDotaHeroStat[]; fetchedAt: number } | null = null;
const HERO_STATS_TTL_MS = 60 * 60 * 1000;

// Real, live hero win/pick rates by rank bracket — the S/A/B tier list is
// computed from this on the client, not hand-curated.
export async function getHeroStats(): Promise<OpenDotaHeroStat[]> {
  if (heroStatsCache && Date.now() - heroStatsCache.fetchedAt < HERO_STATS_TTL_MS) {
    return heroStatsCache.data;
  }

  const res = await fetch(`${OPENDOTA_BASE}/heroStats`, { cache: "no-store" });
  if (!res.ok) return heroStatsCache?.data ?? [];

  const json = await res.json().catch(() => null);
  if (!Array.isArray(json)) return heroStatsCache?.data ?? [];

  const data: OpenDotaHeroStat[] = json.map((h: Record<string, unknown>) => ({
    id: Number(h.id),
    name: String(h.name ?? ""),
    localizedName: String(h.localized_name ?? ""),
    img: h.img ? `${STEAM_CDN}${h.img}` : "",
    icon: h.icon ? `${STEAM_CDN}${h.icon}` : "",
    primaryAttr: String(h.primary_attr ?? ""),
    attackType: String(h.attack_type ?? ""),
    roles: Array.isArray(h.roles) ? h.roles.map(String) : [],
    brackets: Array.from({ length: 8 }, (_, i) => {
      const n = i + 1;
      return { bracket: n, picks: Number(h[`${n}_pick`] ?? 0), wins: Number(h[`${n}_win`] ?? 0) };
    }),
    proPicks: Number(h.pro_pick ?? 0),
    proWins: Number(h.pro_win ?? 0),
    proBans: Number(h.pro_ban ?? 0),
  }));

  heroStatsCache = { data, fetchedAt: Date.now() };
  return data;
}

export interface OpenDotaItem {
  id: number;
  name: string;
  img: string;
  cost: number | null;
}

let itemCache: { data: Record<number, OpenDotaItem>; fetchedAt: number } | null = null;
const ITEM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getItemLookup(): Promise<Record<number, OpenDotaItem>> {
  if (itemCache && Date.now() - itemCache.fetchedAt < ITEM_CACHE_TTL_MS) {
    return itemCache.data;
  }

  const res = await fetch(`${OPENDOTA_BASE}/constants/items`, { cache: "no-store" });
  if (!res.ok) return itemCache?.data ?? {};

  const json = await res.json().catch(() => null);
  if (!json || typeof json !== "object") return itemCache?.data ?? {};

  const data: Record<number, OpenDotaItem> = {};
  for (const item of Object.values(json) as Record<string, unknown>[]) {
    const id = Number(item.id);
    if (!id) continue;
    data[id] = {
      id,
      name: String(item.dname ?? item.name ?? `Item ${id}`),
      img: item.img ? `${STEAM_CDN}${item.img}` : "",
      cost: typeof item.cost === "number" ? item.cost : null,
    };
  }

  itemCache = { data, fetchedAt: Date.now() };
  return data;
}

const ITEM_PHASES = ["start_game_items", "early_game_items", "mid_game_items", "late_game_items"] as const;
export type ItemPhase = (typeof ITEM_PHASES)[number];

// Real aggregated purchase data from actual matches — OpenDota doesn't
// publish a curated "recommended skill build," so this (plus base stat
// scaling already in getHeroStats) is the honest substitute: what players
// actually buy, by game phase, ranked by frequency.
export async function getHeroItemPopularity(heroId: number): Promise<Record<ItemPhase, { itemId: number; count: number }[]>> {
  const empty = {
    start_game_items: [],
    early_game_items: [],
    mid_game_items: [],
    late_game_items: [],
  } as Record<ItemPhase, { itemId: number; count: number }[]>;

  const res = await fetch(`${OPENDOTA_BASE}/heroes/${heroId}/itemPopularity`, { cache: "no-store" });
  if (!res.ok) return empty;

  const json = await res.json().catch(() => null);
  if (!json || typeof json !== "object") return empty;

  const result = { ...empty };
  for (const phase of ITEM_PHASES) {
    const obj = (json as Record<string, Record<string, number>>)[phase] ?? {};
    result[phase] = Object.entries(obj)
      .map(([itemId, count]) => ({ itemId: Number(itemId), count: Number(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }
  return result;
}
