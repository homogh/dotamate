import prisma from "@/app/lib/prisma";
import { getHeroLookup, openDotaFetch, type OpenDotaMatch } from "@/app/lib/opendota";
import { steamId64ToAccountId } from "@/app/lib/steam";

export interface SharedMatchOption {
  matchId: string;
  heroName: string;
  heroIcon: string;
  win: boolean;
  startAt: string;
  duration: number;
  // Was the viewer's own Steam account in this match too?
  together: boolean;
  // Same team as the target — only meaningful when `together`.
  sameTeam: boolean;
}

export interface SharedMatchList {
  matches: SharedMatchOption[];
  // Why nothing is selectable, if that's the case (no Steam, OpenDota down…).
  notice: string | null;
}

// The TARGET's recent matches (what the report/commend modal lists), each
// marked with whether the viewer's own Steam account played in it. OpenDota's
// `included_account_id` filter returns exactly the viewer's matches that the
// target was also in, in one call. Same team is derived without another call:
// both players were on one side iff they got the same result.
export async function getSharedMatchList(viewerId: number, targetId: number): Promise<SharedMatchList> {
  const [viewer, target, stats] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewerId }, select: { steamId: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { steamId: true } }),
    prisma.dotaMatchStats.findUnique({ where: { userId: targetId }, select: { matches: true } }),
  ]);

  const targetMatches = (stats?.matches as unknown as OpenDotaMatch[] | null) ?? [];
  const heroes = targetMatches.length ? await getHeroLookup() : {};

  let togetherWins = new Map<number, boolean>();
  let notice: string | null = null;

  if (!viewer?.steamId) {
    notice = "اول اکانت استیمت رو وصل کن تا حضورت توی مچ‌ها قابل تایید باشه.";
  } else if (!target?.steamId) {
    notice = "این بازیکن اکانت استیم وصل نکرده، پس مچ مشترک قابل تایید نیست.";
  } else if (targetMatches.length === 0) {
    notice = "مچ اخیری از این بازیکن ثبت نشده.";
  } else {
    const viewerAccountId = steamId64ToAccountId(viewer.steamId);
    const targetAccountId = steamId64ToAccountId(target.steamId);
    const res = await openDotaFetch(
      `/players/${viewerAccountId}/matches?included_account_id=${targetAccountId}&significant=0&limit=100`,
    );
    const rows = res?.ok ? await res.json().catch(() => null) : null;

    if (Array.isArray(rows)) {
      togetherWins = new Map(
        (rows as Record<string, unknown>[]).map((r) => [
          Number(r.match_id),
          Number(r.player_slot) < 128 === Boolean(r.radiant_win),
        ]),
      );
    } else {
      notice = "الان نشد مچ‌های مشترک رو از OpenDota بررسی کنیم. کمی بعد دوباره امتحان کن.";
    }
  }

  const matches = targetMatches.map((m) => {
    const viewerWin = togetherWins.get(m.matchId);
    return {
      matchId: String(m.matchId),
      heroName: heroes[m.heroId]?.localizedName ?? `Hero ${m.heroId}`,
      heroIcon: heroes[m.heroId]?.icon ?? "",
      win: m.win,
      startAt: m.startAt,
      duration: m.duration,
      together: viewerWin !== undefined,
      sameTeam: viewerWin !== undefined && viewerWin === m.win,
    };
  });

  if (!notice && !matches.some((m) => m.together)) {
    notice = "توی مچ‌های اخیر این بازیکن، تو حضور نداشتی.";
  }

  return { matches, notice };
}

export type MatchTogetherResult =
  | { ok: true; sameTeam: boolean; startTime: number }
  | { ok: false; status: number; message: string };

// Server-side proof for a single match: pulls the scoreboard from OpenDota
// and checks both Steam accounts are actually in it. Never trusts the list
// the client picked from.
export async function verifyMatchTogether(matchId: string, steamIdA: string, steamIdB: string): Promise<MatchTogetherResult> {
  const res = await openDotaFetch(`/matches/${matchId}`);
  const match = res?.ok ? await res.json().catch(() => null) : null;
  if (!match) {
    return { ok: false, status: 502, message: "اطلاعات این مچ از OpenDota دریافت نشد. کمی بعد دوباره امتحان کن." };
  }

  const players = Array.isArray(match.players) ? (match.players as Record<string, unknown>[]) : [];
  const slotOf = (steamId: string) => {
    const accountId = steamId64ToAccountId(steamId);
    const player = players.find((p) => Number(p.account_id) === accountId);
    return player ? Number(player.player_slot) : null;
  };
  const slotA = slotOf(steamIdA);
  const slotB = slotOf(steamIdB);

  if (slotA === null || slotB === null) {
    return {
      ok: false,
      status: 400,
      message: "حضور هر دوتون توی این مچ تایید نشد (ممکنه اطلاعات مچ یکی‌تون خصوصی باشه).",
    };
  }

  return { ok: true, sameTeam: slotA < 128 === slotB < 128, startTime: Number(match.start_time) * 1000 };
}
