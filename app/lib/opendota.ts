import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

import { steamAssetUrl } from "@/app/lib/cdnUrls";

const OPENDOTA_BASE = "https://api.opendota.com/api";

// OpenDota has real outages (522s that hang ~20s before failing). Without a
// timeout every page that touches it hangs that long and Cloudflare turns it
// into a 502, so each call is capped, and after a failure we stop calling it
// for a short while instead of making every visitor pay the timeout again.
const OPENDOTA_TIMEOUT_MS = 8_000;
const OPENDOTA_COOLDOWN_MS = 60_000;
let openDotaDownUntil = 0;

export async function openDotaFetch(apiPath: string, init?: RequestInit): Promise<Response | null> {
  if (Date.now() < openDotaDownUntil) return null;

  try {
    const res = await fetch(`${OPENDOTA_BASE}${apiPath}`, {
      cache: "no-store",
      ...init,
      signal: AbortSignal.timeout(OPENDOTA_TIMEOUT_MS),
    });
    if (res.status >= 500) openDotaDownUntil = Date.now() + OPENDOTA_COOLDOWN_MS;
    return res;
  } catch {
    openDotaDownUntil = Date.now() + OPENDOTA_COOLDOWN_MS;
    return null;
  }
}

// --- Shared-data cache ------------------------------------------------
// Hero/item constants and hero stats are the same for every visitor, so
// they're kept in memory AND on disk: a restart during an OpenDota outage
// still has data, and once cached no request ever waits on OpenDota —
// expired data is served immediately while a single refresh runs behind it.

const DATA_CACHE_ROOT = path.join(process.cwd(), "storage", "opendota-cache");

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const refreshing = new Map<string, Promise<unknown>>();

async function readDiskCache<T>(key: string): Promise<CacheEntry<T> | null> {
  const raw = await readFile(path.join(DATA_CACHE_ROOT, `${key}.json`), "utf8").catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

async function writeDiskCache<T>(key: string, entry: CacheEntry<T>) {
  try {
    await mkdir(DATA_CACHE_ROOT, { recursive: true });
    const filePath = path.join(DATA_CACHE_ROOT, `${key}.json`);
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(tmpPath, JSON.stringify(entry));
    await rename(tmpPath, filePath);
  } catch {
    // disk cache is an optimization — memory still has the data
  }
}

/** `load` returns null on failure; `empty` is only used when nothing was ever cached. */
async function staleWhileRevalidate<T>(key: string, ttlMs: number, load: () => Promise<T | null>, empty: T): Promise<T> {
  let entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    const fromDisk = await readDiskCache<T>(key);
    if (fromDisk) {
      entry = fromDisk;
      memoryCache.set(key, fromDisk);
    }
  }

  if (entry && Date.now() - entry.fetchedAt < ttlMs) return entry.data;

  let refresh = refreshing.get(key) as Promise<T | null> | undefined;
  if (!refresh) {
    refresh = load()
      .then(async (data) => {
        if (data === null) return null;
        const fresh = { data, fetchedAt: Date.now() };
        memoryCache.set(key, fresh);
        await writeDiskCache(key, fresh);
        return data;
      })
      .catch(() => null)
      .finally(() => refreshing.delete(key));
    refreshing.set(key, refresh);
  }

  if (entry) return entry.data;
  return (await refresh) ?? empty;
}

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
  goldPerMin: number | null;
  xpPerMin: number | null;
  lastHits: number | null;
  heroDamage: number | null;
}

export interface OpenDotaRatingPoint {
  time: string;
  // OpenDota now tracks rank_tier (the medal badge, e.g. 25 = Legend 5) over
  // time; the older numeric solo/competitive MMR fields it used to return
  // are empty for effectively every current account, so rank_tier is used
  // whenever present and the legacy fields are only a fallback.
  rankTier: number;
}

export interface OpenDotaTotals {
  kills: number;
  deaths: number;
  assists: number;
  goldPerMin: number;
  xpPerMin: number;
  lastHits: number;
  heroDamage: number;
  heroHealing: number;
  duration: number;
}

export interface OpenDotaHeroPlayed {
  heroId: number;
  heroName: string;
  heroIcon: string;
  games: number;
  wins: number;
  winRate: number;
  lastPlayed: string | null;
}

export interface OpenDotaSync {
  wins: number;
  losses: number;
  rankTierHint: number | null;
  matches: OpenDotaMatch[];
  ratings: OpenDotaRatingPoint[];
  totals: OpenDotaTotals | null;
  heroesPlayed: OpenDotaHeroPlayed[];
}

function isRadiantSlot(playerSlot: number) {
  return playerSlot < 128;
}

const RANK_TIER_MEDALS = [
  null,
  "HERALD",
  "GUARDIAN",
  "CRUSADER",
  "ARCHON",
  "LEGEND",
  "ANCIENT",
  "DIVINE",
  "IMMORTAL",
] as const;

export interface DecodedRankTier {
  rank: Exclude<(typeof RANK_TIER_MEDALS)[number], null>;
  star: number | null;
}

// OpenDota's rank_tier packs the medal (tens digit, 1-8) and star (ones
// digit, 1-5) into one number — e.g. 24 = Guardian 4. Immortal has no stars.
export function decodeOpenDotaRankTier(rankTier: number): DecodedRankTier | null {
  const medal = Math.floor(rankTier / 10);
  const star = rankTier % 10;
  const rank = RANK_TIER_MEDALS[medal];
  if (!rank) return null;
  return { rank, star: rank === "IMMORTAL" ? null : star || null };
}

export async function refreshOpenDotaPlayer(accountId: number) {
  // best-effort — the verify step still works off whatever OpenDota already has cached
  await openDotaFetch(`/players/${accountId}/refresh`, { method: "POST" });
}

// Averages the {field, n, sum} rows OpenDota's /totals returns into a single
// per-match average for the stats the profile actually shows.
type TotalsField =
  | "kills"
  | "deaths"
  | "assists"
  | "gold_per_min"
  | "xp_per_min"
  | "last_hits"
  | "hero_damage"
  | "hero_healing"
  | "duration";

function parseTotals(rows: unknown): OpenDotaTotals | null {
  if (!Array.isArray(rows)) return null;

  const byField = new Map<string, { n: number; sum: number }>();
  for (const row of rows as Record<string, unknown>[]) {
    const field = String(row.field ?? "");
    byField.set(field, { n: Number(row.n ?? 0), sum: Number(row.sum ?? 0) });
  }

  const matchCount = byField.get("kills")?.n ?? 0;
  if (matchCount === 0) return null;

  const avg = (field: TotalsField) => {
    const row = byField.get(field);
    return row && row.n > 0 ? Math.round(row.sum / row.n) : 0;
  };

  return {
    kills: avg("kills"),
    deaths: avg("deaths"),
    assists: avg("assists"),
    goldPerMin: avg("gold_per_min"),
    xpPerMin: avg("xp_per_min"),
    lastHits: avg("last_hits"),
    heroDamage: avg("hero_damage"),
    heroHealing: avg("hero_healing"),
    duration: avg("duration"),
  };
}

const HEROES_PLAYED_LIMIT = 6;

export async function syncOpenDotaPlayer(accountId: number): Promise<OpenDotaSync | null> {
  const [profileRes, wlRes, matchesRes, ratingsRes, totalsRes, heroesRes] = await Promise.all([
    openDotaFetch(`/players/${accountId}`),
    openDotaFetch(`/players/${accountId}/wl`),
    openDotaFetch(`/players/${accountId}/recentMatches`),
    openDotaFetch(`/players/${accountId}/ratings`),
    openDotaFetch(`/players/${accountId}/totals`),
    openDotaFetch(`/players/${accountId}/heroes`),
  ]);

  if (!matchesRes?.ok || !wlRes?.ok) return null;

  const optionalJson = (res: Response | null) => (res?.ok ? res.json().catch(() => null) : null);
  const [profile, wl, matches, ratings, totals, heroes] = await Promise.all([
    optionalJson(profileRes),
    wlRes.json().catch(() => null),
    matchesRes.json().catch(() => null),
    optionalJson(ratingsRes),
    optionalJson(totalsRes),
    optionalJson(heroesRes),
  ]);

  if (!Array.isArray(matches)) return null;

  const heroLookup = Array.isArray(heroes) ? await getHeroLookup() : {};

  return {
    wins: Number(wl?.win ?? 0),
    losses: Number(wl?.lose ?? 0),
    rankTierHint: typeof profile?.rank_tier === "number" ? profile.rank_tier : null,
    matches: matches.slice(0, 10).map((m: Record<string, unknown>) => ({
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
      goldPerMin: typeof m.gold_per_min === "number" ? m.gold_per_min : null,
      xpPerMin: typeof m.xp_per_min === "number" ? m.xp_per_min : null,
      lastHits: typeof m.last_hits === "number" ? m.last_hits : null,
      heroDamage: typeof m.hero_damage === "number" ? m.hero_damage : null,
    })),
    ratings: Array.isArray(ratings)
      ? ratings
          .map((r: Record<string, unknown>) => {
            const rankTier =
              typeof r.rank_tier === "number"
                ? r.rank_tier
                : typeof r.solo_competitive_rank === "number"
                  ? r.solo_competitive_rank
                  : typeof r.competitive_rank === "number"
                    ? r.competitive_rank
                    : null;
            return rankTier === null ? null : { time: new Date(String(r.time)).toISOString(), rankTier };
          })
          .filter((r): r is OpenDotaRatingPoint => r !== null)
      : [],
    totals: parseTotals(totals),
    heroesPlayed: Array.isArray(heroes)
      ? heroes
          .map((h: Record<string, unknown>) => ({
            heroId: Number(h.hero_id),
            games: Number(h.games ?? 0),
            wins: Number(h.win ?? 0),
            lastPlayedRaw: typeof h.last_played === "number" ? h.last_played : null,
          }))
          .filter((h) => h.games > 0)
          .sort((a, b) => b.games - a.games)
          .slice(0, HEROES_PLAYED_LIMIT)
          .map((h) => ({
            heroId: h.heroId,
            heroName: heroLookup[h.heroId]?.localizedName ?? `Hero ${h.heroId}`,
            heroIcon: heroLookup[h.heroId]?.icon ?? "",
            games: h.games,
            wins: h.wins,
            winRate: h.games > 0 ? Math.round((h.wins / h.games) * 100) : 0,
            lastPlayed: h.lastPlayedRaw ? new Date(h.lastPlayedRaw * 1000).toISOString() : null,
          }))
      : [],
  };
}

interface HeroLookupEntry {
  name: string;
  localizedName: string;
  icon: string;
  img: string;
}

const HERO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getHeroLookup(): Promise<Record<number, HeroLookupEntry>> {
  return staleWhileRevalidate(
    "heroes",
    HERO_CACHE_TTL_MS,
    async () => {
      const res = await openDotaFetch("/constants/heroes");
      const json = res?.ok ? await res.json().catch(() => null) : null;
      if (!json || typeof json !== "object") return null;

      const data: Record<number, HeroLookupEntry> = {};
      for (const hero of Object.values(json) as Record<string, unknown>[]) {
        const id = Number(hero.id);
        data[id] = {
          name: String(hero.name ?? ""),
          localizedName: String(hero.localized_name ?? `Hero ${id}`),
          icon: steamAssetUrl(hero.icon),
          img: steamAssetUrl(hero.img),
        };
      }
      return data;
    },
    {},
  );
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

const HERO_STATS_TTL_MS = 60 * 60 * 1000;

// Real, live hero win/pick rates by rank bracket — the S/A/B tier list is
// computed from this on the client, not hand-curated.
export async function getHeroStats(): Promise<OpenDotaHeroStat[]> {
  return staleWhileRevalidate(
    "heroStats",
    HERO_STATS_TTL_MS,
    async () => {
      const res = await openDotaFetch("/heroStats");
      const json = res?.ok ? await res.json().catch(() => null) : null;
      if (!Array.isArray(json) || json.length === 0) return null;

      return json.map((h: Record<string, unknown>) => ({
        id: Number(h.id),
        name: String(h.name ?? ""),
        localizedName: String(h.localized_name ?? ""),
        img: steamAssetUrl(h.img),
        icon: steamAssetUrl(h.icon),
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
    },
    [],
  );
}

export interface OpenDotaItem {
  id: number;
  name: string;
  img: string;
  cost: number | null;
}

const ITEM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getItemLookup(): Promise<Record<number, OpenDotaItem>> {
  return staleWhileRevalidate(
    "items",
    ITEM_CACHE_TTL_MS,
    async () => {
      const res = await openDotaFetch("/constants/items");
      const json = res?.ok ? await res.json().catch(() => null) : null;
      if (!json || typeof json !== "object") return null;

      const data: Record<number, OpenDotaItem> = {};
      for (const item of Object.values(json) as Record<string, unknown>[]) {
        const id = Number(item.id);
        if (!id) continue;
        data[id] = {
          id,
          name: String(item.dname ?? item.name ?? `Item ${id}`),
          img: steamAssetUrl(item.img),
          cost: typeof item.cost === "number" ? item.cost : null,
        };
      }
      return data;
    },
    {},
  );
}

const ITEM_PHASES = ["start_game_items", "early_game_items", "mid_game_items", "late_game_items"] as const;
export type ItemPhase = (typeof ITEM_PHASES)[number];

const ITEM_POPULARITY_TTL_MS = 6 * 60 * 60 * 1000;

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

  return staleWhileRevalidate(
    `itemPopularity-${heroId}`,
    ITEM_POPULARITY_TTL_MS,
    async () => {
      const res = await openDotaFetch(`/heroes/${heroId}/itemPopularity`);
      const json = res?.ok ? await res.json().catch(() => null) : null;
      if (!json || typeof json !== "object") return null;

      const result = { ...empty };
      for (const phase of ITEM_PHASES) {
        const obj = (json as Record<string, Record<string, number>>)[phase] ?? {};
        result[phase] = Object.entries(obj)
          .map(([itemId, count]) => ({ itemId: Number(itemId), count: Number(count) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
      }
      return result;
    },
    empty,
  );
}
