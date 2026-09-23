import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getHeroLookup, type OpenDotaMatch } from "@/app/lib/opendota";
import { steamId64ToAccountId } from "@/app/lib/steam";
import {
  COMMEND_BONUS,
  COMMEND_BONUS_COOLDOWN_DAYS,
  COMMEND_MATCH_MAX_AGE_DAYS,
  COMMEND_PAIR_COOLDOWN_DAYS,
  COMMEND_TYPES,
  COMMENDER_MIN_ACCOUNT_AGE_DAYS,
  COMMENDER_MIN_BEHAVIOR,
  COMMENDS_PER_BONUS,
  COMMENDS_PER_DAY,
  DAY_MS,
  SCORE_MAX,
  type CommendTypeValue,
} from "@/app/lib/behavior";
import type { ApiResponse } from "@/app/types/api";

const OPENDOTA_BASE = "https://api.opendota.com/api";

// Everything that decides whether `commenderId` may commend `targetId` at
// all, independent of which match — shared by GET (to explain it in the
// modal) and POST (to enforce it).
async function commendBlocker(commenderId: number, targetId: number) {
  if (commenderId === targetId) return { reason: "نمی‌تونی خودت رو کامند کنی.", remainingToday: 0 };

  const now = Date.now();
  const [commender, target, givenToday, recentPair] = await Promise.all([
    prisma.user.findUnique({ where: { id: commenderId } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { id: true, steamId: true } }),
    prisma.commend.count({ where: { commenderId, createdAt: { gte: new Date(now - DAY_MS) } } }),
    prisma.commend.findFirst({
      where: { commenderId, targetId, createdAt: { gte: new Date(now - COMMEND_PAIR_COOLDOWN_DAYS * DAY_MS) } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const remainingToday = Math.max(0, COMMENDS_PER_DAY - givenToday);
  const block = (reason: string) => ({ reason, remainingToday });

  if (!commender || !target) return block("کاربر پیدا نشد.");
  if (commender.banned || (commender.suspendedUntil && commender.suspendedUntil.getTime() > now)) {
    return block("حسابت محدود شده و فعلاً نمی‌تونی کامند بدی.");
  }
  if (!commender.steamId || !commender.matchDataVerified) {
    return block("برای کامند دادن باید اکانت استیمت وصل و مچ‌هات تایید شده باشه.");
  }
  if (!target.steamId) return block("این بازیکن اکانت استیم وصل نکرده، پس مچ مشترک قابل تایید نیست.");
  if (now - commender.createdAt.getTime() < COMMENDER_MIN_ACCOUNT_AGE_DAYS * DAY_MS) {
    return block(`حسابت باید حداقل ${COMMENDER_MIN_ACCOUNT_AGE_DAYS.toLocaleString("fa-IR")} روز سابقه داشته باشه.`);
  }
  if (commender.behaviorScore < COMMENDER_MIN_BEHAVIOR) {
    return block("امتیاز رفتار خودت پایینه؛ تا وقتی بالای ۶٬۰۰۰ نرسه کامندت حساب نمی‌شه.");
  }
  if (recentPair) {
    const until = new Date(recentPair.createdAt.getTime() + COMMEND_PAIR_COOLDOWN_DAYS * DAY_MS);
    return block(`این بازیکن رو اخیراً کامند کردی. از ${until.toLocaleDateString("fa-IR")} دوباره می‌تونی.`);
  }
  if (remainingToday === 0) return block("امروز همه‌ی کامندهات رو دادی. فردا دوباره امتحان کن.");

  return { reason: null, remainingToday, commender, target };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const targetId = Number(id);
  const blocker = await commendBlocker(session.id, targetId);

  const [mine, theirs] = await Promise.all([
    prisma.dotaMatchStats.findUnique({ where: { userId: session.id }, select: { matches: true } }),
    prisma.dotaMatchStats.findUnique({ where: { userId: targetId }, select: { matches: true } }),
  ]);

  const minStart = Date.now() - COMMEND_MATCH_MAX_AGE_DAYS * DAY_MS;
  const myMatches = ((mine?.matches as unknown as OpenDotaMatch[] | null) ?? []).filter(
    (m) => new Date(m.startAt).getTime() >= minStart,
  );
  const theirMatchIds = new Set(((theirs?.matches as unknown as OpenDotaMatch[] | null) ?? []).map((m) => m.matchId));
  const heroes = myMatches.length ? await getHeroLookup() : {};

  const matches = myMatches
    .map((m) => ({
      matchId: String(m.matchId),
      heroName: heroes[m.heroId]?.localizedName ?? `Hero ${m.heroId}`,
      heroIcon: heroes[m.heroId]?.icon ?? "",
      win: m.win,
      startAt: m.startAt,
      shared: theirMatchIds.has(m.matchId),
    }))
    .sort((a, b) => Number(b.shared) - Number(a.shared));

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: { blockedReason: blocker.reason, remainingToday: blocker.remainingToday, matches },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const targetId = Number(id);
  const body = await request.json().catch(() => null);
  const matchId = String(body?.matchId ?? "").trim();
  const type = body?.type as CommendTypeValue;

  if (!COMMEND_TYPES.some((t) => t.value === type)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "نوع کامند رو انتخاب کن.", data: null }, { status: 400 });
  }
  if (!/^\d{6,20}$/.test(matchId)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "مچ مشترک رو انتخاب کن.", data: null }, { status: 400 });
  }

  const blocker = await commendBlocker(session.id, targetId);
  if (blocker.reason || !blocker.commender || !blocker.target) {
    return NextResponse.json<ApiResponse>({ status: "error", message: blocker.reason ?? "مجاز نیست.", data: null }, { status: 403 });
  }

  // The core rule: only a teammate from that exact match can commend —
  // checked against OpenDota itself, not against anything the client sent.
  const res = await fetch(`${OPENDOTA_BASE}/matches/${matchId}`);
  const match = res.ok ? await res.json().catch(() => null) : null;
  if (!match) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "اطلاعات این مچ از OpenDota دریافت نشد. کمی بعد دوباره امتحان کن.", data: null },
      { status: 502 },
    );
  }

  if (Number(match.start_time) * 1000 < Date.now() - COMMEND_MATCH_MAX_AGE_DAYS * DAY_MS) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: `فقط مچ‌های ${COMMEND_MATCH_MAX_AGE_DAYS.toLocaleString("fa-IR")} روز اخیر رو می‌شه کامند کرد.`, data: null },
      { status: 400 },
    );
  }

  const players = Array.isArray(match.players) ? (match.players as Record<string, unknown>[]) : [];
  const findSlot = (steamId: string) => {
    const accountId = steamId64ToAccountId(steamId);
    const player = players.find((p) => Number(p.account_id) === accountId);
    return player ? Number(player.player_slot) : null;
  };
  const mySlot = findSlot(blocker.commender.steamId!);
  const theirSlot = findSlot(blocker.target.steamId!);

  if (mySlot === null || theirSlot === null) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "حضور هر دوتون توی این مچ تایید نشد (ممکنه اطلاعات مچ یکی‌تون خصوصی باشه).", data: null },
      { status: 400 },
    );
  }
  if (mySlot < 128 !== theirSlot < 128) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فقط هم‌تیمی‌های همون مچ می‌تونن کامند بدن.", data: null }, { status: 400 });
  }

  try {
    const bonusGranted = await prisma.$transaction(async (tx) => {
      await tx.commend.create({ data: { commenderId: session.id, targetId, matchId, type } });

      const target = await tx.user.findUniqueOrThrow({
        where: { id: targetId },
        select: { behaviorScore: true, commendProgress: true, lastCommendBonusAt: true },
      });

      // Progress stops at the threshold while the bonus is on cooldown, so
      // extra commends that week are held over, not thrown away.
      const progress = Math.min(COMMENDS_PER_BONUS, target.commendProgress + 1);
      const bonusReady =
        progress >= COMMENDS_PER_BONUS &&
        (!target.lastCommendBonusAt || Date.now() - target.lastCommendBonusAt.getTime() >= COMMEND_BONUS_COOLDOWN_DAYS * DAY_MS);

      if (!bonusReady) {
        await tx.user.update({ where: { id: targetId }, data: { commendProgress: progress } });
        return 0;
      }

      const gained = Math.min(COMMEND_BONUS, SCORE_MAX - target.behaviorScore);
      await tx.user.update({
        where: { id: targetId },
        data: { behaviorScore: target.behaviorScore + gained, commendProgress: 0, lastCommendBonusAt: new Date() },
      });
      if (gained > 0) {
        await tx.notification.create({
          data: {
            userId: targetId,
            type: "SYSTEM",
            title: "امتیاز رفتار شما افزایش یافت",
            body: `با دریافت ${COMMENDS_PER_BONUS.toLocaleString("fa-IR")} کامند از هم‌تیمی‌هات، ${gained.toLocaleString("fa-IR")} امتیاز به رفتارت اضافه شد.`,
          },
        });
      }
      return gained;
    });

    return NextResponse.json<ApiResponse>({
      status: "success",
      message: bonusGranted ? "کامند ثبت شد و امتیاز رفتار هم‌تیمیت بالا رفت!" : "کامند ثبت شد.",
      data: null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "این بازیکن رو برای همین مچ قبلاً کامند کردی.", data: null },
        { status: 409 },
      );
    }
    throw error;
  }
}
