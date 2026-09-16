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
  try {
    await fetch(`${OPENDOTA_BASE}/players/${accountId}/refresh`, { method: "POST" });
  } catch {
    // best-effort — the verify step still works off whatever OpenDota already has cached
  }
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
    fetch(`${OPENDOTA_BASE}/players/${accountId}`, { cache: "no-store" }),
    fetch(`${OPENDOTA_BASE}/players/${accountId}/wl`, { cache: "no-store" }),
    fetch(`${OPENDOTA_BASE}/players/${accountId}/recentMatches`, { cache: "no-store" }),
    fetch(`${OPENDOTA_BASE}/players/${accountId}/ratings`, { cache: "no-store" }),
    fetch(`${OPENDOTA_BASE}/players/${accountId}/totals`, { cache: "no-store" }),
    fetch(`${OPENDOTA_BASE}/players/${accountId}/heroes`, { cache: "no-store" }),
  ]);

  if (!matchesRes.ok || !wlRes.ok) return null;

  const [profile, wl, matches, ratings, totals, heroes] = await Promise.all([
    profileRes.ok ? profileRes.json().catch(() => null) : null,
    wlRes.json(),
    matchesRes.json(),
    ratingsRes.ok ? ratingsRes.json().catch(() => null) : null,
    totalsRes.ok ? totalsRes.json().catch(() => null) : null,
    heroesRes.ok ? heroesRes.json().catch(() => null) : null,
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

let heroCache: { data: Record<number, HeroLookupEntry>; fetchedAt: number } | null = null;
const HERO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getHeroLookup() {
  if (heroCache && Date.now() - heroCache.fetchedAt < HERO_CACHE_TTL_MS) {
    return heroCache.data;
  }

  const res = await fetch(`${OPENDOTA_BASE}/constants/heroes`, { cache: "no-store" });
  if (!res.ok) return heroCache?.data ?? {};

  const json = await res.json().catch(() => null);
  if (!json || typeof json !== "object") return heroCache?.data ?? {};

  const data: Record<number, HeroLookupEntry> = {};
  for (const hero of Object.values(json) as Record<string, unknown>[]) {
    const id = Number(hero.id);
    data[id] = {
      name: String(hero.name ?? ""),
      localizedName: String(hero.localized_name ?? `Hero ${id}`),
      icon: hero.icon ? `${STEAM_CDN}${hero.icon}` : "",
      img: hero.img ? `${STEAM_CDN}${hero.img}` : "",
    };
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
