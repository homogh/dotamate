"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck, X, UserPlus } from "lucide-react";

import { Card } from "@/components/general/card";
import { UserAvatar } from "@/components/general/userAvatar";
import { RANK_LABEL, REGION_LABEL, GAME_MODE_LABEL } from "@/components/dashboard/postLabels";
import { POSITION_LABEL, type PositionValue } from "@/components/dashboard/positionMeta";
import { RankTrendChart } from "@/components/pages/profile/rankTrendChart";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// OpenDota's own numeric game_mode — distinct from this app's GAME_MODE_LABEL,
// which is keyed by the LFG post enum instead.
const OPENDOTA_GAME_MODE_LABEL: Record<number, string> = {
  1: "All Pick",
  2: "Captains Mode",
  3: "Random Draft",
  4: "Single Draft",
  5: "All Random",
  16: "Captains Draft",
  22: "Ranked All Pick",
  23: "Turbo",
};

interface ProfileData {
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
  isSelf: boolean;
  isFavorited: boolean;
  stats: { teammatesFound: number; activePosts: number; totalPosts: number };
  recentPosts: { id: number; position: string; region: string; gameMode: string; status: string; createdAt: string }[];
  dotaStats: {
    wins: number;
    losses: number;
    winRate: number;
    lastSyncedAt: string | null;
    matches: {
      matchId: number;
      heroId: number;
      heroName: string;
      heroIcon: string;
      heroImg: string;
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
    }[];
    ratings: { time: string; rankTier: number; rankLabel: string }[];
    totals: {
      kills: number;
      deaths: number;
      assists: number;
      goldPerMin: number;
      xpPerMin: number;
      lastHits: number;
      heroDamage: number;
      heroHealing: number;
      duration: number;
    } | null;
    heroesPlayed: {
      heroId: number;
      heroName: string;
      heroIcon: string;
      games: number;
      wins: number;
      winRate: number;
      lastPlayed: string | null;
    }[];
  } | null;
}

type DotaMatch = NonNullable<ProfileData["dotaStats"]>["matches"][number];

interface MatchItem {
  id: number;
  name: string;
  img: string;
  cost: number | null;
}
interface MatchItemsData {
  items: MatchItem[];
  neutralItem: MatchItem | null;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  FULL: "تکمیل ظرفیت",
  COMPLETED: "تکمیل‌شده",
  EXPIRED: "منقضی‌شده",
  CANCELLED: "لغو شده",
};

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DotaMatch | null>(null);
  const [matchItemsCache, setMatchItemsCache] = useState<Record<number, MatchItemsData>>({});
  const matchItems = selectedMatch ? (matchItemsCache[selectedMatch.matchId] ?? null) : null;
  const matchItemsLoading = selectedMatch !== null && matchItems === null;

  useEffect(() => {
    if (!selectedMatch || !profile || matchItemsCache[selectedMatch.matchId]) return;
    let cancelled = false;
    const matchId = selectedMatch.matchId;
    fetch(`/api/users/${profile.id}/matches/${matchId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.status === "success") {
          setMatchItemsCache((prev) => ({ ...prev, [matchId]: json.data }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMatch, profile, matchItemsCache]);

  const load = useCallback(() => {
    fetch(`/api/users/${params.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setProfile(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFavorite() {
    if (!profile) return;
    setBusy(true);
    await fetch(`/api/favorites/${profile.id}`, { method: profile.isFavorited ? "DELETE" : "POST" });
    setBusy(false);
    load();
  }

  async function handleMessage() {
    if (!profile) return;
    setBusy(true);
    const res = await fetch("/api/conversations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.status === "success") router.push(`/dashboard/messages/${json.data.id}`);
  }

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  if (!profile) {
    return (
      <div className="flex w-full flex-col gap-6 p-6 md:p-10">
        <p className="text-center text-[14px] text-text-dim" dir="auto">
          کاربر پیدا نشد.
        </p>
      </div>
    );
  }

  const verified = profile.rankVerification === "VERIFIED";

  return (
    <div className="flex w-full flex-col gap-7 p-6 md:p-10">
      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center gap-6 p-8">
        <div className="flex items-start gap-3">
          {profile.isSelf ? (
            <button
              onClick={() => router.push("/dashboard/settings")}
              className="rounded-[8px] border border-border bg-surface-alt px-6 py-3 text-[14px] font-bold text-text"
              dir="auto"
            >
              ویرایش پروفایل
            </button>
          ) : (
            <>
              <button
                onClick={handleFavorite}
                disabled={busy}
                className="rounded-[8px] border border-border bg-surface-alt px-6 py-3 text-[14px] font-bold text-text disabled:opacity-50"
                dir="auto"
              >
                {profile.isFavorited ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              </button>
              <button
                onClick={handleMessage}
                disabled={busy}
                className="rounded-[8px] bg-primary px-7 py-3 text-[14px] font-bold text-white disabled:opacity-50"
                dir="auto"
              >
                ارسال پیام
              </button>
            </>
          )}
        </div>

        <div className="flex flex-1 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {verified && (
              <span className="flex items-center gap-1 rounded-full border border-success bg-success/10 px-2.5 py-0.5 text-[12px] font-bold text-success" dir="auto">
                تایید‌شده
                <BadgeCheck size={12} />
              </span>
            )}
            <p className="text-[24px] font-black text-text" dir="auto">
              {profile.displayName}
            </p>
          </div>
          <p className="w-full text-right text-[14px] leading-[1.7] text-text-dim" dir="auto">
            {profile.bio || "این بازیکن هنوز بایو ننوشته."}
          </p>
          <div className="flex items-center gap-3">
            {profile.steamProfileUrl && (
              <a
                href={profile.steamProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-text-dim underline"
                dir="ltr"
              >
                پروفایل استیم
              </a>
            )}
            {!profile.isSelf && profile.steamId && (
              <a
                href={`steam://friends/add/${profile.steamId}`}
                className="flex items-center gap-1.5 rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white"
                dir="auto"
              >
                <UserPlus size={13} />
                افزودن در استیم
              </a>
            )}
          </div>
        </div>

        <div className="rounded-full border-2 border-primary">
          <UserAvatar name={profile.displayName} avatarUrl={profile.avatarUrl} size={80} round />
        </div>
      </Card>

      <div className="flex w-full flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <div className={`grid w-full gap-4 ${profile.dotaStats ? "grid-cols-4" : "grid-cols-3"}`}>
            <StatTile value={profile.stats.teammatesFound} label="هم‌تیمی یافته" />
            <StatTile value={profile.stats.activePosts} label="پست فعال" />
            <StatTile value={profile.stats.totalPosts} label="کل پست‌ها" />
            {profile.dotaStats && <StatTile value={profile.dotaStats.winRate} label="درصد وین" suffix="%" />}
          </div>

          {profile.dotaStats && (
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <div className="flex w-full items-center justify-between">
                <span className="text-[12px] text-text-dim" dir="auto">
                  {profile.dotaStats.wins.toLocaleString("fa-IR")} برد / {profile.dotaStats.losses.toLocaleString("fa-IR")} باخت
                </span>
                <p className="text-[16px] font-black text-text" dir="auto">
                  {profile.dotaStats.matches.length.toLocaleString("fa-IR")} مچ اخیر
                </p>
              </div>
              {profile.dotaStats.matches.length === 0 ? (
                <p className="w-full py-4 text-center text-[13px] text-text-dim" dir="auto">
                  مچی برای نمایش پیدا نشد.
                </p>
              ) : (
                <div className="flex w-full flex-col gap-2">
                  {profile.dotaStats.matches.map((m) => (
                    <button
                      key={m.matchId}
                      type="button"
                      onClick={() => setSelectedMatch(m)}
                      className="flex w-full cursor-pointer flex-col-reverse items-end gap-2 rounded-[8px] border border-transparent bg-surface-alt p-3 text-right outline-none transition-colors hover:border-accent/30 hover:bg-accent/10 focus-visible:border-accent/50 focus-visible:bg-accent/10 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-dim sm:gap-3" dir="ltr">
                        <span>
                          {Math.floor(m.duration / 60)}:{String(m.duration % 60).padStart(2, "0")}
                        </span>
                        {m.goldPerMin !== null && <span>{m.goldPerMin} GPM</span>}
                        {m.xpPerMin !== null && <span>{m.xpPerMin} XPM</span>}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2 text-[13px] sm:gap-3">
                        <span className="text-text-dim" dir="ltr">
                          {m.kills}/{m.deaths}/{m.assists}
                        </span>
                        <span className="font-bold text-text" dir="auto">
                          {m.heroName}
                        </span>
                        {m.heroIcon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.heroIcon} alt="" className="size-7 shrink-0 rounded-[4px]" />
                        )}
                        <span
                          className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[11px] font-bold ${m.win ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                          dir="auto"
                        >
                          {m.win ? "برد" : "باخت"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {profile.dotaStats && profile.dotaStats.totals && (
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
                میانگین آمار (بر اساس مچ‌های اخیر)
              </p>
              <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4">
                <MiniStat value={profile.dotaStats.totals.kills} label="کیل" />
                <MiniStat value={profile.dotaStats.totals.deaths} label="دث" />
                <MiniStat value={profile.dotaStats.totals.assists} label="اسیست" />
                <MiniStat value={profile.dotaStats.totals.lastHits} label="لست‌هیت" />
                <MiniStat value={profile.dotaStats.totals.goldPerMin} label="GPM" />
                <MiniStat value={profile.dotaStats.totals.xpPerMin} label="XPM" />
                <MiniStat value={profile.dotaStats.totals.heroDamage} label="دمیج به هیرو" />
                <MiniStat value={profile.dotaStats.totals.heroHealing} label="هیل" />
              </div>
            </Card>
          )}

          {profile.dotaStats && profile.dotaStats.heroesPlayed.length > 0 && (
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
                هیروهای اصلی
              </p>
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
                {profile.dotaStats.heroesPlayed.map((h) => (
                  <div key={h.heroId} className="flex items-center gap-3 rounded-[8px] bg-surface-alt p-3">
                    {h.heroIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.heroIcon} alt={h.heroName} className="size-9 rounded-[6px]" />
                    ) : (
                      <div className="size-9 rounded-[6px] bg-surface" />
                    )}
                    <div className="flex flex-1 flex-col items-end gap-0.5">
                      <span className="text-[13px] font-bold text-text" dir="auto">
                        {h.heroName}
                      </span>
                      <span className="text-[11px] text-text-dim" dir="auto">
                        {h.games.toLocaleString("fa-IR")} گیم · {h.winRate.toLocaleString("fa-IR")}% وین
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {profile.dotaStats && (
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
                روند رنک
              </p>
              <RankTrendChart points={profile.dotaStats.ratings} />
            </Card>
          )}

          <Card tone="surface" noHover className="w-full gap-4 p-6">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              فعالیت اخیر
            </p>
            {profile.recentPosts.length === 0 ? (
              <p className="w-full py-4 text-center text-[13px] text-text-dim" dir="auto">
                هنوز پستی منتشر نکرده.
              </p>
            ) : (
              <div className="flex w-full flex-col gap-2.5">
                {profile.recentPosts.map((p) => (
                  <div key={p.id} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[8px] bg-surface-alt p-3">
                    <span className="shrink-0 rounded-[4px] bg-surface px-2 py-0.5 text-[11px] text-text-dim" dir="auto">
                      {STATUS_LABEL[p.status]}
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-2 text-[13px]">
                      <span className="text-text-dim">{GAME_MODE_LABEL[p.gameMode]}</span>
                      <span className="text-text-dim">•</span>
                      <span className="text-text-dim">{REGION_LABEL[p.region]}</span>
                      <span className="text-text-dim">•</span>
                      <span className="font-bold text-text" dir="auto">
                        {POSITION_LABEL[p.position as PositionValue]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card tone="surface" noHover className="w-full gap-4 p-6 lg:w-[380px] lg:shrink-0">
          <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
            اطلاعات کلی بازیکن
          </p>
          <div className="flex w-full flex-col gap-3">
            <InfoRow label="رنک" value={`${RANK_LABEL[profile.rank]} ${profile.rankTier ?? ""}`} accent />
            <InfoRow label="نقش اصلی (Pos)" value={profile.mainPosition ? POSITION_LABEL[profile.mainPosition as PositionValue] : "مشخص نشده"} chip />
            <InfoRow label="وضعیت تایید" value={verified ? "تایید‌شده" : "خوداظهاری"} success={verified} />
          </div>
        </Card>
      </div>

      <Dialog open={selectedMatch !== null} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="overflow-hidden border-border bg-surface p-0 sm:max-w-md" dir="rtl" showCloseButton={false}>
          {selectedMatch && (
            <>
              <div className="relative h-[150px] w-full overflow-hidden bg-surface-alt">
                {selectedMatch.heroImg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedMatch.heroImg} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
                )}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    selectedMatch.win ? "from-success/25" : "from-danger/25"
                  } via-surface/60 to-surface/5`}
                />
                <DialogClose className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-bg/50 text-white backdrop-blur-sm transition-colors hover:bg-bg/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <X size={16} />
                  <span className="sr-only">بستن</span>
                </DialogClose>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                  <span
                    className={`rounded-[4px] px-2 py-0.5 text-[11px] font-bold ${
                      selectedMatch.win ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                    }`}
                    dir="auto"
                  >
                    {selectedMatch.win ? "برد" : "باخت"}
                  </span>
                  <DialogTitle className="text-[20px] font-black text-white" dir="auto">
                    {selectedMatch.heroName}
                  </DialogTitle>
                </div>
              </div>

              <div className="flex w-full flex-col gap-4 px-6 pb-6 pt-4">
                <DialogDescription className="w-full text-center text-[12px] text-text-dim" dir="auto">
                  {new Date(selectedMatch.startAt).toLocaleDateString("fa-IR")} ·{" "}
                  {Math.floor(selectedMatch.duration / 60)}:{String(selectedMatch.duration % 60).padStart(2, "0")} ·{" "}
                  {OPENDOTA_GAME_MODE_LABEL[selectedMatch.gameMode] ?? "نامشخص"}
                  {selectedMatch.partySize && selectedMatch.partySize > 1
                    ? ` · پارتی ${selectedMatch.partySize.toLocaleString("fa-IR")} نفره`
                    : ""}
                </DialogDescription>

                <div className="grid w-full grid-cols-3 gap-3">
                  <MiniStat value={selectedMatch.kills} label="کیل" />
                  <MiniStat value={selectedMatch.deaths} label="دث" />
                  <MiniStat value={selectedMatch.assists} label="اسیست" />
                  {selectedMatch.lastHits !== null && <MiniStat value={selectedMatch.lastHits} label="لست‌هیت" />}
                  {selectedMatch.goldPerMin !== null && <MiniStat value={selectedMatch.goldPerMin} label="GPM" />}
                  {selectedMatch.xpPerMin !== null && <MiniStat value={selectedMatch.xpPerMin} label="XPM" />}
                  {selectedMatch.heroDamage !== null && (
                    <MiniStat value={selectedMatch.heroDamage} label="دمیج به هیرو" />
                  )}
                </div>

                <div className="flex w-full flex-col gap-2">
                  <p className="w-full text-right text-[13px] font-bold text-text" dir="auto">
                    آیتم‌های نهایی
                  </p>
                  {matchItemsLoading ? (
                    <div className="flex items-center gap-2" dir="ltr">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-12 rounded-[4px]" />
                      ))}
                    </div>
                  ) : matchItems && (matchItems.items.length > 0 || matchItems.neutralItem) ? (
                    <div className="flex flex-wrap items-center gap-2" dir="ltr">
                      {matchItems.items.map((item) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={item.id}
                          src={item.img}
                          alt={item.name}
                          title={item.name}
                          className="h-9 w-12 rounded-[4px] border border-border object-cover"
                        />
                      ))}
                      {matchItems.neutralItem && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={matchItems.neutralItem.img}
                          alt={matchItems.neutralItem.name}
                          title={`${matchItems.neutralItem.name} (نیوترال)`}
                          className="h-9 w-12 rounded-[4px] border border-accent/60 object-cover ring-1 ring-accent/40"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="w-full text-center text-[12px] text-text-dim" dir="auto">
                      اطلاعات آیتم برای این مچ در دسترس نیست.
                    </p>
                  )}
                </div>

                <a
                  href={`https://www.opendota.com/matches/${selectedMatch.matchId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center text-[12px] font-bold text-accent underline"
                  dir="ltr"
                >
                  مشاهده کامل مچ در OpenDota
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[12px] border border-border bg-surface-alt p-5">
      <p className="text-[28px] font-black text-accent">
        {value.toLocaleString("fa-IR")}
        {suffix}
      </p>
      <p className="text-[13px] text-text-dim" dir="auto">
        {label}
      </p>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[8px] bg-surface-alt p-3">
      <p className="text-[16px] font-black text-text" dir="ltr">
        {value.toLocaleString("fa-IR")}
      </p>
      <p className="text-[11px] text-text-dim" dir="auto">
        {label}
      </p>
    </div>
  );
}

function InfoRow({ label, value, accent, chip, success }: { label: string; value: string; accent?: boolean; chip?: boolean; success?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0">
      {chip ? (
        <span className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-[12px] font-bold text-accent" dir="auto">
          {value}
        </span>
      ) : (
        <p className={`text-[14px] font-bold ${accent ? "text-accent" : success ? "text-success" : "text-text"}`} dir="auto">
          {value}
        </p>
      )}
      <p className="text-[14px] text-text-dim" dir="auto">
        {label}
      </p>
    </div>
  );
}
