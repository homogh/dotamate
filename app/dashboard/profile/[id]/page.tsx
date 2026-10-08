"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Activity, ChevronLeft, FileText, RefreshCw, Trophy, Users } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";
import { DashboardFadeIn } from "@/components/dashboard/fadeIn";
import { RANK_LABEL, REGION_LABEL, GAME_MODE_LABEL } from "@/components/dashboard/postLabels";
import { POSITION_LABEL_FA, type PositionValue } from "@/components/dashboard/positionMeta";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileHeader } from "@/components/pages/profile/profileHeader";
import { RecentMatchesCard } from "@/components/pages/profile/recentMatchesCard";
import { MatchDetailDialog } from "@/components/pages/profile/matchDetailDialog";
import { InfoRow, MiniStat, StatTile } from "@/components/pages/profile/profileStatTiles";
import { faNumber, timeAgo } from "@/components/pages/profile/profileFormat";
import { RankTrendChart } from "@/components/pages/profile/rankTrendChart";
import { BehaviorScoreCard } from "@/components/pages/profile/behaviorScoreCard";
import { ReportPlayerModal } from "@/components/pages/profile/reportPlayerModal";
import { CommendPlayerModal } from "@/components/pages/profile/commendPlayerModal";
import type { DotaMatch, ProfileData, SyncResponse } from "@/components/pages/profile/profileTypes";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  FULL: "تکمیل ظرفیت",
  COMPLETED: "تکمیل‌شده",
  EXPIRED: "منقضی‌شده",
  CANCELLED: "لغو شده",
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-success/12 text-success",
  FULL: "bg-accent/15 text-accent",
};

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DotaMatch | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [commendOpen, setCommendOpen] = useState(false);

  const load = useCallback(
    () =>
      fetch(`/api/users/${params.id}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (json.status !== "success") return null;
          setProfile(json.data);
          return json.data as ProfileData;
        })
        .catch(() => null)
        .finally(() => setLoading(false)),
    [params.id],
  );

  // Pulls fresh matches from OpenDota. `auto` is the silent refresh right
  // after the page opens on stale stats; a manual click reports back.
  const syncStats = useCallback(
    async (auto: boolean, knownMatchIds: number[] = []) => {
      setSyncing(true);
      try {
        const res = await fetch(`/api/users/${params.id}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto }),
        });
        const json = await res.json();
        if (json.status !== "success") {
          if (!auto) toast.error(json.message);
          return;
        }
        const synced = json.data as SyncResponse | null;
        if (!synced) return;

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                rank: synced.rank,
                rankTier: synced.rankTier,
                rankVerification: synced.rankVerification,
                dotaStats: synced.dotaStats,
              }
            : prev,
        );
        if (!auto) {
          const added = synced.dotaStats.matches.filter((m) => !knownMatchIds.includes(m.matchId)).length;
          toast.success(added > 0 ? `${faNumber(added)} مچ جدید اضافه شد.` : "همه‌چی به‌روزه؛ مچ جدیدی نبود.");
        }
      } catch {
        if (!auto) toast.error("ارتباط برقرار نشد؛ دوباره امتحان کن.");
      } finally {
        setSyncing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.id],
  );

  useEffect(() => {
    load().then((data) => {
      if (data?.syncable && (!data.dotaStats || data.dotaStats.stale)) syncStats(true);
    });
  }, [load, syncStats]);

  async function handleFavorite() {
    if (!profile) return;
    setBusy(true);
    await fetch(`/api/favorites/${profile.id}`, { method: profile.isFavorited ? "DELETE" : "POST" });
    setBusy(false);
    load();
  }

  async function handleFriend() {
    if (!profile) return;
    const { state, requestId } = profile.friend;
    if (
      state === "FRIENDS" &&
      !(await confirmAction({ message: `${profile.displayName} از دوستانت حذف بشه؟`, danger: true, confirmLabel: "حذف دوست" }))
    )
      return;
    setBusy(true);
    if (state === "NONE") {
      await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
    } else if (state === "OUTGOING") {
      await fetch(`/api/friends/requests/${requestId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/friends/${profile.id}`, { method: "DELETE" });
    }
    setBusy(false);
    load();
  }

  async function handleAnswerFriend(action: "accept" | "decline") {
    if (!profile?.friend.requestId) return;
    setBusy(true);
    await fetch(`/api/friends/requests/${profile.friend.requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
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

  if (loading) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <div className="flex w-full flex-col gap-6 p-6 md:p-10">
        <Card tone="surface" noHover className="w-full items-center py-16 text-center">
          <p className="text-[15px] font-bold text-text">کاربر پیدا نشد.</p>
          <p className="text-[13px] text-text-dim">شاید حسابش حذف شده یا آدرس اشتباهه.</p>
        </Card>
      </div>
    );
  }

  const stats = profile.dotaStats;
  const verified = profile.rankVerification === "VERIFIED";
  const position = profile.mainPosition as PositionValue | null;

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6 md:p-10">
      <ProfileHeader
        profile={profile}
        busy={busy}
        onEdit={() => router.push("/dashboard/settings")}
        onFriend={handleFriend}
        onAnswerFriend={handleAnswerFriend}
        onFavorite={handleFavorite}
        onMessage={handleMessage}
        onCommend={() => setCommendOpen(true)}
        onReport={() => setReportOpen(true)}
      />

      <div className="flex w-full flex-col gap-6 xl:flex-row xl:items-start">
        <DashboardFadeIn className="@container flex min-w-0 flex-1 flex-col gap-6">
          <div
            className={cn(
              "grid w-full grid-cols-2 gap-3 [&>:last-child:nth-child(odd)]:col-span-2",
              stats ? "@xl:grid-cols-4" : "@xl:grid-cols-3 @xl:[&>:last-child:nth-child(odd)]:col-span-1",
            )}
          >
            <StatTile icon={Users} value={profile.stats.teammatesFound} label="هم‌تیمی یافته" />
            <StatTile icon={Activity} value={profile.stats.activePosts} label="پست فعال" />
            <StatTile icon={FileText} value={profile.stats.totalPosts} label="کل پست‌ها" />
            {stats && <StatTile icon={Trophy} value={stats.winRate} label="درصد وین" suffix="٪" meter={stats.winRate} />}
          </div>

          {stats ? (
            <RecentMatchesCard
              stats={stats}
              syncing={syncing}
              onRefresh={() => syncStats(false, stats.matches.map((m) => m.matchId))}
              onSelect={setSelectedMatch}
            />
          ) : profile.syncable ? (
            <Card tone="surface" noHover className="w-full items-center gap-3 py-10 text-center">
              {syncing ? (
                <>
                  <RefreshCw size={18} className="animate-spin text-accent" />
                  <p className="text-[13px] text-text-dim">در حال گرفتن مچ‌ها از OpenDota…</p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-bold text-text">آمار دوتا هنوز نیومده.</p>
                  <button
                    type="button"
                    onClick={() => syncStats(false)}
                    className="flex items-center gap-1.5 rounded-[10px] border border-border bg-surface-alt px-4 py-2 text-[12px] font-bold text-text-dim transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <RefreshCw size={13} />
                    دوباره امتحان کن
                  </button>
                </>
              )}
            </Card>
          ) : (
            <Card tone="surface" noHover className="w-full items-center gap-2 py-10 text-center">
              <p className="text-[14px] font-bold text-text">آمار دوتا هنوز وصل نشده.</p>
              <p className="text-[12px] text-text-dim">
                {profile.isSelf ? "استیمت رو وصل کن تا مچ‌ها و رنکت اینجا نشون داده بشه." : "این بازیکن هنوز استیمش رو تایید نکرده."}
              </p>
            </Card>
          )}

          {stats?.totals && (
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <h2 className="text-[16px] font-black text-text">میانگین هر مچ</h2>
              <div className="grid w-full grid-cols-2 gap-2.5 @lg:grid-cols-4">
                <MiniStat value={stats.totals.kills} label="کیل" />
                <MiniStat value={stats.totals.deaths} label="دث" />
                <MiniStat value={stats.totals.assists} label="اسیست" />
                <MiniStat value={stats.totals.lastHits} label="لست‌هیت" />
                <MiniStat value={stats.totals.goldPerMin} label="GPM" />
                <MiniStat value={stats.totals.xpPerMin} label="XPM" />
                <MiniStat value={stats.totals.heroDamage} label="دمیج به هیرو" />
                <MiniStat value={stats.totals.heroHealing} label="هیل" />
              </div>
            </Card>
          )}

          {stats && stats.heroesPlayed.length > 0 && (
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <h2 className="text-[16px] font-black text-text">هیروهای اصلی</h2>
              <div className="grid w-full gap-2.5 @xl:grid-cols-2">
                {stats.heroesPlayed.map((h) => (
                  <div
                    key={h.heroId}
                    className="group flex items-center gap-3 rounded-[10px] bg-surface-alt p-3 transition-colors duration-200 hover:bg-[#23252d]"
                  >
                    <div className="h-10 w-[70px] shrink-0 overflow-hidden rounded-[6px] bg-surface">
                      {h.heroImg && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={h.heroImg}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-text" dir="auto">
                          {h.heroName}
                        </span>
                        <span className={cn("shrink-0 text-[12px] font-bold", h.winRate >= 50 ? "text-success" : "text-[#ff6b57]")}>
                          {faNumber(h.winRate)}٪
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
                        <div
                          className={cn("h-full rounded-full", h.winRate >= 50 ? "bg-success/80" : "bg-[#ff6b57]/70")}
                          style={{ width: `${h.winRate}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-text-dim">
                        {faNumber(h.games)} گیم{h.lastPlayed ? ` · آخرین بازی ${timeAgo(h.lastPlayed)}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {stats && (
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <h2 className="text-[16px] font-black text-text">روند رنک</h2>
              <RankTrendChart points={stats.ratings} />
            </Card>
          )}

          <Card tone="surface" noHover className="w-full gap-4 p-6">
            <h2 className="text-[16px] font-black text-text">فعالیت اخیر</h2>
            {profile.recentPosts.length === 0 ? (
              <p className="w-full py-4 text-center text-[13px] text-text-dim">هنوز پستی منتشر نکرده.</p>
            ) : (
              <div className="flex w-full flex-col gap-2">
                {profile.recentPosts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/post/${p.id}`}
                    className="group flex w-full flex-wrap items-center justify-between gap-2 rounded-[10px] bg-surface-alt px-4 py-3 transition-colors duration-200 hover:bg-[#23252d]"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="font-bold text-text">{POSITION_LABEL_FA[p.position as PositionValue] ?? p.position}</span>
                      <span className="text-text-dim">·</span>
                      <span className="text-text-dim">{REGION_LABEL[p.region]}</span>
                      <span className="text-text-dim">·</span>
                      <span className="text-text-dim" dir="auto">
                        {GAME_MODE_LABEL[p.gameMode]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-text-dim">{timeAgo(p.createdAt)}</span>
                      <span className={cn("rounded-[6px] px-2 py-0.5 text-[11px] font-bold", STATUS_TONE[p.status] ?? "bg-surface text-text-dim")}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      <ChevronLeft size={15} className="text-text-dim transition-transform duration-200 group-hover:-translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </DashboardFadeIn>

        <DashboardFadeIn className="grid w-full items-start gap-6 md:grid-cols-2 xl:flex xl:w-[340px] xl:shrink-0 xl:flex-col">
          <Card tone="surface" noHover className="w-full gap-4 p-6">
            <h2 className="text-[16px] font-black text-text">اطلاعات بازیکن</h2>
            <div className="flex w-full flex-col gap-3">
              <InfoRow label="رنک">
                <span className="text-[14px] font-bold text-accent">
                  {RANK_LABEL[profile.rank]}
                  {profile.rankTier ? ` ${faNumber(profile.rankTier)}` : ""}
                </span>
              </InfoRow>
              <InfoRow label="نقش اصلی">
                <span className="rounded-[6px] bg-surface-alt px-2.5 py-1 text-[12px] font-bold text-text">
                  {position ? POSITION_LABEL_FA[position] : "مشخص نشده"}
                </span>
              </InfoRow>
              <InfoRow label="وضعیت رنک">
                <span className={cn("text-[13px] font-bold", verified ? "text-success" : "text-text-dim")}>
                  {verified ? "تاییدشده با OpenDota" : "خوداظهاری"}
                </span>
              </InfoRow>
              {profile.languages.length > 0 && (
                <InfoRow label="زبان">
                  <span className="text-[13px] text-text" dir="auto">
                    {profile.languages.join("، ")}
                  </span>
                </InfoRow>
              )}
              {profile.country && (
                <InfoRow label="کشور">
                  <span className="text-[13px] text-text" dir="auto">
                    {profile.country}
                  </span>
                </InfoRow>
              )}
            </div>
          </Card>
          <BehaviorScoreCard behaviorScore={profile.behaviorScore} communicationScore={profile.communicationScore} commends={profile.commends} />
        </DashboardFadeIn>
      </div>

      {!profile.isSelf && (
        <>
          <ReportPlayerModal open={reportOpen} onOpenChange={setReportOpen} player={{ id: profile.id, displayName: profile.displayName }} />
          <CommendPlayerModal
            open={commendOpen}
            onOpenChange={setCommendOpen}
            player={{ id: profile.id, displayName: profile.displayName }}
            onCommended={load}
          />
        </>
      )}

      <MatchDetailDialog userId={profile.id} match={selectedMatch} onClose={() => setSelectedMatch(null)} />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6 md:p-10" aria-busy>
      <Skeleton className="h-[240px] w-full rounded-[16px]" />
      <div className="flex w-full flex-col gap-6 xl:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[112px] rounded-[12px]" />
            ))}
          </div>
          <Skeleton className="h-[520px] w-full rounded-[12px]" />
        </div>
        <div className="flex w-full flex-col gap-6 xl:w-[340px]">
          <Skeleton className="h-[240px] rounded-[12px]" />
          <Skeleton className="h-[320px] rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}
