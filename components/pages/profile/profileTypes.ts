import type { CommendSummary } from "@/components/pages/profile/behaviorScoreCard";

// Shapes returned by GET /api/users/[id] and POST /api/users/[id]/sync.

export interface DotaMatch {
  matchId: number;
  heroId: number;
  heroName: string;
  heroIcon: string;
  heroImg: string;
  heroCrop: string;
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

export interface DotaTotals {
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

export interface DotaHeroPlayed {
  heroId: number;
  heroName: string;
  heroIcon: string;
  heroImg: string;
  heroCrop: string;
  games: number;
  wins: number;
  winRate: number;
  lastPlayed: string | null;
}

export interface DotaStats {
  wins: number;
  losses: number;
  winRate: number;
  lastSyncedAt: string | null;
  stale: boolean;
  matches: DotaMatch[];
  ratings: { time: string; rankTier: number; rankLabel: string }[];
  totals: DotaTotals | null;
  heroesPlayed: DotaHeroPlayed[];
}

export interface ProfileData {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  steamProfileUrl: string | null;
  steamId: string | null;
  bio: string | null;
  country: string | null;
  languages: string[];
  rank: string;
  rankTier: number | null;
  mainPosition: string | null;
  rankVerification: string;
  behaviorScore: number;
  communicationScore: number;
  commends: CommendSummary;
  createdAt: string;
  isSelf: boolean;
  isFavorited: boolean;
  friend: { state: "NONE" | "OUTGOING" | "INCOMING" | "FRIENDS"; requestId: number | null };
  online: boolean;
  stats: { teammatesFound: number; activePosts: number; totalPosts: number };
  recentPosts: { id: number; position: string; region: string; gameMode: string; status: string; createdAt: string }[];
  syncable: boolean;
  dotaStats: DotaStats | null;
}

export interface SyncResponse {
  rank: string;
  rankTier: number | null;
  rankVerification: string;
  dotaStats: DotaStats;
}
