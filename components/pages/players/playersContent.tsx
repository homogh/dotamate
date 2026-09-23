"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock, MessageSquare, Search, Swords, UserCheck, UserPlus } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { cn } from "@/app/lib/utils";
import { scoreTier, SCORE_MAX, type ScoreTier } from "@/app/lib/behavior";
import { useAuth } from "@/app/stores/useAuth";
import { useToast } from "@/app/stores/useToast";
import { PageBanner } from "@/components/general/pageBanner";
import { Card } from "@/components/general/card";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/general/userAvatar";
import { Pagination } from "@/components/general/pagination";
import { RANK_LABEL, RANK_OPTIONS } from "@/components/dashboard/postLabels";
import { POSITIONS, POSITION_ICON, POSITION_LABEL, type PositionValue } from "@/components/dashboard/positionMeta";

const RANK_FILTER_OPTIONS = [{ value: "", label: "همه رنک‌ها" }, { value: "UNRANKED", label: "بدون رنک" }, ...RANK_OPTIONS];
const POSITION_FILTER_OPTIONS = [
  { value: "", label: "همه نقش‌ها (Pos 1-5)" },
  ...POSITIONS.map((p) => ({ value: p, label: POSITION_LABEL[p] })),
];
const BEHAVIOR_FILTER_OPTIONS = [
  { value: "", label: "همه Behavior ها" },
  { value: "excellent", label: "عالی (۱۰,۰۰۰+)" },
  { value: "good", label: "خوب (۸,۰۰۰+)" },
  { value: "average", label: "متوسط (۵,۰۰۰+)" },
  { value: "poor", label: "ضعیف (زیر ۵,۰۰۰)" },
];

const TONE_TEXT: Record<ScoreTier["tone"], string> = {
  success: "text-success",
  accent: "text-accent",
  warning: "text-[#ff9f0a]",
  danger: "text-danger",
};

const TONE_BAR: Record<ScoreTier["tone"], string> = {
  success: "bg-success",
  accent: "bg-accent",
  warning: "bg-[#ff9f0a]",
  danger: "bg-danger",
};

type FriendState = "NONE" | "OUTGOING" | "INCOMING" | "FRIENDS";

interface Player {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  rank: string;
  rankTier: number | null;
  mainPosition: PositionValue | null;
  verified: boolean;
  behaviorScore: number;
  online: boolean;
  lastActiveAt: string | null;
  isSelf: boolean;
  friend: { state: FriendState; requestId: number | null } | null;
  inMyLobby: boolean;
}

function lastSeenLabel(player: Player) {
  if (player.online) return "آنلاین";
  if (!player.lastActiveAt) return "آفلاین";
  const minutes = Math.floor((Date.now() - new Date(player.lastActiveAt).getTime()) / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "دیروز" : `${days} روز پیش`;
}

const FRIEND_BUTTON: Record<FriendState, { label: string; icon: typeof UserPlus }> = {
  NONE: { label: "افزودن دوست", icon: UserPlus },
  OUTGOING: { label: "ارسال شد", icon: Clock },
  INCOMING: { label: "قبول دوستی", icon: UserPlus },
  FRIENDS: { label: "دوست هستید", icon: UserCheck },
};

function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { label: string; value: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-[8px] border border-border bg-surface-alt py-2 pe-3 ps-4 text-[13px] text-text outline-none transition-colors hover:border-white/20 focus-visible:border-primary",
        className
      )}
      dir="auto"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function PlayersContent() {
  const router = useRouter();
  const toast = useToast();
  const { status, fetchMe } = useAuth();

  const [query, setQuery] = useState("");
  const [rank, setRank] = useState("");
  const [position, setPosition] = useState("");
  const [behavior, setBehavior] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [players, setPlayers] = useState<Player[]>([]);
  const [myActivePost, setMyActivePost] = useState<{ id: number; hasOpenSlot: boolean } | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (status === "idle") fetchMe();
  }, [status, fetchMe]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (rank) params.set("rank", rank);
    if (position) params.set("position", position);
    if (behavior) params.set("behavior", behavior);
    if (onlineOnly) params.set("online", "1");
    params.set("page", String(page));

    return fetch(`/api/players?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setPlayers(json.data.players);
          setMyActivePost(json.data.myActivePost);
          setTotalPages(json.data.pageCount);
          setTotal(json.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [query, rank, position, behavior, onlineOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.set("[data-filter-card]", { autoAlpha: 0, y: 16 });
      gsap.to("[data-filter-card]", {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
      });
    },
    { scope: containerRef },
  );

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!resultsRef.current || loading) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.fromTo(
      resultsRef.current,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" },
    );
  }, [players, loading]);

  function resetToPageOne<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  function requireLogin() {
    if (status === "authenticated") return false;
    router.push("/login?next=/players");
    return true;
  }

  function updatePlayer(id: number, patch: Partial<Player>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function handleChat(player: Player) {
    if (requireLogin()) return;
    if (player.friend?.state === "FRIENDS") {
      router.push(`/dashboard/friends?user=${player.id}`);
      return;
    }
    setBusyKey(`chat-${player.id}`);
    const res = await fetch("/api/conversations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: player.id }),
    });
    const json = await res.json();
    setBusyKey(null);
    if (json.status === "success") router.push(`/dashboard/messages/${json.data.id}`);
    else toast.error(json.message);
  }

  async function handleFriend(player: Player) {
    if (requireLogin() || !player.friend) return;
    const { state, requestId } = player.friend;
    if (state === "FRIENDS" || state === "OUTGOING") return;

    setBusyKey(`friend-${player.id}`);
    const res =
      state === "INCOMING"
        ? await fetch(`/api/friends/requests/${requestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "accept" }),
          })
        : await fetch("/api/friends/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: player.id }),
          });
    const json = await res.json();
    setBusyKey(null);

    if (json.status === "success") {
      toast.success(json.message);
      updatePlayer(player.id, { friend: { state: json.data.state, requestId: json.data.requestId ?? requestId } });
    } else {
      toast.error(json.message);
    }
  }

  async function handleInvite(player: Player) {
    if (requireLogin()) return;
    if (!myActivePost) {
      toast.error("برای دعوت، اول یک لابی فعال بساز.");
      return;
    }
    setBusyKey(`invite-${player.id}`);
    const res = await fetch(`/api/posts/${myActivePost.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: player.id }),
    });
    const json = await res.json();
    setBusyKey(null);
    if (json.status === "success") {
      toast.success(json.message);
      updatePlayer(player.id, { inMyLobby: true });
    } else {
      toast.error(json.message);
    }
  }

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center">
      <PageBanner
        eyebrow="همه بازیکن‌های دوتامیت یک‌جا"
        title="پلیرها"
        subtitle="بازیکن‌ها رو بر اساس رنک، پوزیشن و Behavior فیلتر کن، ببین کی الان آنلاینه، بهش پیام بده، درخواست دوستی بفرست یا مستقیم به لابیت دعوتش کن."
        imageSrc="/images/players/players-banner.png"
      />

      <div className="w-full px-6 py-10 md:px-[100px]">
        <div className="flex w-full flex-col gap-5">
          <div
            data-filter-card
            className="flex w-full items-center gap-3 rounded-[12px] border border-border bg-surface px-5 py-4"
          >
            <input
              value={query}
              onChange={(e) => resetToPageOne(setQuery)(e.target.value)}
              placeholder="جستجوی اسم بازیکن..."
              className="flex-1 bg-transparent text-right text-base text-text placeholder:text-[rgba(255,255,255,0.5)] outline-none"
              dir="auto"
            />
            <Search size={20} className="shrink-0 text-text-dim" />
          </div>

          <div
            data-filter-card
            className="flex w-full flex-col gap-4 rounded-[12px] border border-border bg-surface p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-sm font-bold text-text-dim">فیلترها:</span>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
                <Select value={rank} onChange={resetToPageOne(setRank)} options={RANK_FILTER_OPTIONS} className="w-full sm:w-auto" />
                <Select
                  value={position}
                  onChange={resetToPageOne(setPosition)}
                  options={POSITION_FILTER_OPTIONS}
                  className="w-full sm:w-auto"
                />
                <Select
                  value={behavior}
                  onChange={resetToPageOne(setBehavior)}
                  options={BEHAVIOR_FILTER_OPTIONS}
                  className="col-span-2 w-full sm:w-auto"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4 sm:border-0 sm:pt-0">
              <span className="text-[12px] text-text-dim" dir="auto">
                {total.toLocaleString("fa-IR")} بازیکن
              </span>
              <Switch checked={onlineOnly} onChange={resetToPageOne(setOnlineOnly)} label="فقط آنلاین‌ها" />
            </div>
          </div>

          <div ref={resultsRef} className="flex w-full flex-col gap-6">
            {loading ? (
              <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
            ) : (
              <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {players.map((player) => {
                  const tier = scoreTier(player.behaviorScore);
                  const PositionIcon = player.mainPosition ? POSITION_ICON[player.mainPosition] : Swords;
                  const friendState = player.friend?.state ?? "NONE";
                  const FriendIcon = FRIEND_BUTTON[friendState].icon;
                  const inviteDisabled = player.inMyLobby || (myActivePost !== null && !myActivePost.hasOpenSlot);

                  return (
                    <Card key={player.id} className="gap-4 p-6">
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`text-[12px] ${player.online ? "text-success" : "text-text-dim"}`} dir="auto">
                            {lastSeenLabel(player)}
                          </span>
                          <span className={`size-2 rounded-full ${player.online ? "bg-success" : "bg-white/15"}`} />
                        </div>
                        <Link href={`/dashboard/profile/${player.id}`} className="group flex min-w-0 items-center gap-3">
                          <div className="flex min-w-0 flex-col items-end gap-0.5">
                            <div className="flex min-w-0 items-center gap-1">
                              {player.verified && <BadgeCheck size={14} className="shrink-0 text-success" />}
                              <p
                                className="truncate text-[15px] font-black text-text transition-colors group-hover:text-accent"
                                dir="auto"
                              >
                                {player.displayName}
                              </p>
                            </div>
                            <p className="text-xs font-bold text-accent" dir="auto">
                              رنک: {RANK_LABEL[player.rank]} {player.rankTier ?? ""}
                            </p>
                          </div>
                          <div className={`shrink-0 rounded-full border-2 ${player.online ? "border-success" : "border-transparent"}`}>
                            <UserAvatar name={player.displayName} avatarUrl={player.avatarUrl} size={48} round />
                          </div>
                        </Link>
                      </div>

                      <div className="flex w-full items-center justify-end gap-2 rounded-[8px] bg-surface-alt px-3 py-2">
                        <p className="text-[13px] font-bold text-text" dir="ltr">
                          {player.mainPosition ? POSITION_LABEL[player.mainPosition] : "پوزیشن نامشخص"}
                        </p>
                        <PositionIcon size={15} className="text-accent" />
                      </div>

                      <div className="flex w-full flex-col gap-1.5">
                        <div className="flex w-full items-center justify-between">
                          <span className={`text-[13px] font-black ${TONE_TEXT[tier.tone]}`}>
                            {player.behaviorScore.toLocaleString("fa-IR")}
                            <span className="ms-1 text-[11px] font-bold">({tier.label})</span>
                          </span>
                          <span className="text-[12px] text-text-dim" dir="ltr">
                            Behavior
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                          <div
                            className={`h-full rounded-full ${TONE_BAR[tier.tone]}`}
                            style={{ width: `${Math.min(100, (player.behaviorScore / SCORE_MAX) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {player.isSelf ? (
                        <div className="flex w-full items-center justify-between gap-2 border-t border-border pt-4">
                          <Link
                            href="/dashboard/profile"
                            className="rounded-[8px] border border-border px-4 py-2.5 text-[12px] font-bold text-text transition-colors hover:bg-white/5"
                            dir="auto"
                          >
                            مشاهده پروفایل
                          </Link>
                          <span className="rounded-full bg-primary/15 px-3 py-1 text-[12px] font-bold text-accent" dir="auto">
                            این خودتی
                          </span>
                        </div>
                      ) : (
                        <div className="grid w-full grid-cols-3 gap-2 border-t border-border pt-4">
                          <button
                            onClick={() => handleInvite(player)}
                            disabled={busyKey === `invite-${player.id}` || (status === "authenticated" && inviteDisabled)}
                            className="flex items-center justify-center rounded-[8px] bg-primary px-2 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
                            dir="auto"
                            title={
                              player.inMyLobby
                                ? "این بازیکن توی لابیته"
                                : myActivePost && !myActivePost.hasOpenSlot
                                    ? "لابیت پره"
                                    : "دعوت به لابی فعالت"
                            }
                          >
                            {player.inMyLobby ? "توی لابیته" : "دعوت به لابی"}
                          </button>
                          <button
                            onClick={() => handleFriend(player)}
                            disabled={busyKey === `friend-${player.id}` || friendState === "FRIENDS" || friendState === "OUTGOING"}
                            className={cn(
                              "flex items-center justify-center gap-1 rounded-[8px] border px-2 py-2.5 text-[12px] font-bold transition-colors",
                              friendState === "FRIENDS"
                                ? "border-success/50 text-success"
                                : friendState === "OUTGOING"
                                  ? "border-border text-text-dim"
                                  : "border-primary text-accent hover:bg-primary/10"
                          )}
                          dir="auto"
                        >
                          <FriendIcon size={13} className="shrink-0" />
                          {FRIEND_BUTTON[friendState].label}
                        </button>
                        <button
                          onClick={() => handleChat(player)}
                          disabled={busyKey === `chat-${player.id}`}
                          className="flex items-center justify-center gap-1 rounded-[8px] border border-border px-2 py-2.5 text-[12px] font-bold text-text transition-colors hover:bg-white/5 disabled:opacity-50"
                          dir="auto"
                        >
                          <MessageSquare size={13} className="shrink-0" />
                          چت
                        </button>
                      </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && players.length === 0 && (
              <p className="w-full py-12 text-center text-sm text-text-dim" dir="auto">
                با این فیلترها بازیکنی پیدا نشد. یه فیلتر رو بردار و دوباره امتحان کن.
              </p>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
