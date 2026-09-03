"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronDown, X, Swords, Volume2 } from "lucide-react";

import { Card } from "@/components/general/card";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { Switch } from "@/components/ui/switch";
import { Pagination } from "@/components/general/pagination";
import { DashboardFadeIn } from "@/components/dashboard/fadeIn";
import { POSITION_ICON } from "@/components/dashboard/positionMeta";

const GAME_MODE_OPTIONS = [
  { value: "", label: "همه حالت‌ها" },
  { value: "RANKED_ALL_PICK", label: "Ranked All Pick" },
  { value: "ALL_PICK", label: "All Pick" },
  { value: "TURBO", label: "Turbo" },
  { value: "CAPTAINS_MODE", label: "Captains Mode" },
];

const REGION_OPTIONS = [
  { value: "", label: "همه ریجن‌ها" },
  { value: "EU_WEST", label: "اروپا غربی" },
  { value: "EU_EAST", label: "اروپا شرقی" },
  { value: "RUSSIA", label: "روسیه" },
  { value: "DUBAI", label: "دبی" },
];

const RANK_OPTIONS = [
  { value: "", label: "همه رنک‌ها" },
  { value: "HERALD", label: "Herald" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "CRUSADER", label: "Crusader" },
  { value: "ARCHON", label: "Archon" },
  { value: "LEGEND", label: "Legend" },
  { value: "ANCIENT", label: "Ancient" },
  { value: "DIVINE", label: "Divine" },
  { value: "IMMORTAL", label: "Immortal" },
];

interface FeedPost {
  id: number;
  authorName: string;
  authorRank: string;
  authorRankTier: number | null;
  position: string;
  region: string;
  gameMode: string;
  description: string;
  hasVoice: boolean;
  sessionType: "NOW" | "SCHEDULED";
  startAt: string | null;
  createdAt: string;
  memberCount: number;
  partySize: number;
}

function timeLabel(post: FeedPost) {
  if (post.sessionType === "NOW") {
    const minutes = Math.floor((Date.now() - new Date(post.createdAt).getTime()) / 60000);
    return minutes < 1 ? "الان" : `${minutes} دقیقه پیش`;
  }
  if (post.startAt) {
    return new Date(post.startAt).toLocaleString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  }
  return "";
}

export default function BrowseFeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [onlyNow, setOnlyNow] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const [gameMode, setGameMode] = useState("");
  const [region, setRegion] = useState("");
  const [rank, setRank] = useState("");
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());

  const query = searchParams.get("query") ?? "";

  // Reset to page 1 during render (not an effect) whenever a filter changes —
  // React's documented pattern for adjusting state when inputs change,
  // avoiding an extra effect-triggered render.
  const filterKey = `${query}|${onlyNow}|${hasVoice}|${gameMode}|${region}|${rank}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (onlyNow) params.set("onlyNow", "1");
    if (hasVoice) params.set("hasVoice", "1");
    if (gameMode) params.set("gameMode", gameMode);
    if (region) params.set("region", region);
    if (rank) params.set("rank", rank);
    params.set("page", String(page));

    return fetch(`/api/dashboard/browse?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setPosts(json.data.posts);
          setPageCount(json.data.pageCount);
        }
      })
      .finally(() => setLoading(false));
  }, [query, onlyNow, hasVoice, gameMode, region, rank, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleJoin(postId: number) {
    setJoiningId(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/join`, { method: "POST" });
      const json = await res.json();
      if (json.status === "success") {
        setJoinedIds((prev) => new Set(prev).add(postId));
      }
    } finally {
      setJoiningId(null);
    }
  }

  const activeFilters = [
    rank && { key: "rank", label: `رنک: ${RANK_OPTIONS.find((o) => o.value === rank)?.label}`, clear: () => setRank("") },
    region && { key: "region", label: `ریجن: ${REGION_OPTIONS.find((o) => o.value === region)?.label}`, clear: () => setRegion("") },
    hasVoice && { key: "voice", label: "وویس چت فعال", clear: () => setHasVoice(false) },
    onlyNow && { key: "now", label: "فقط لابی‌های الان", clear: () => setOnlyNow(false) },
    query && { key: "query", label: `جستجو: ${query}`, clear: () => router.push("/dashboard/browse") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="flex w-full flex-wrap items-center justify-end gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-text-dim" dir="auto">
                فقط لابی‌های الان
              </span>
              <Switch checked={onlyNow} onChange={setOnlyNow} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-text-dim" dir="auto">
                صدا دارم (دیسکورد/وویس)
              </span>
              <Switch checked={hasVoice} onChange={setHasVoice} />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="relative">
              <select
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value)}
                className="appearance-none rounded-[8px] border border-border bg-surface-alt py-2 pl-8 pr-4 text-[13px] text-text focus:outline-none"
              >
                {GAME_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
            </div>

            <div className="relative">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="appearance-none rounded-[8px] border border-border bg-surface-alt py-2 pl-8 pr-4 text-[13px] text-text focus:outline-none"
              >
                {REGION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
            </div>

            <div className="relative">
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="appearance-none rounded-[8px] border border-border bg-surface-alt py-2 pl-8 pr-4 text-[13px] text-text focus:outline-none"
              >
                {RANK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
            </div>

            <p className="text-[14px] font-bold text-text-dim" dir="auto">
              فیلترها:
            </p>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={filter.clear}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-alt py-1 pl-3 pr-2.5 text-[12px] text-text"
                dir="auto"
              >
                <X size={12} className="text-text-dim" />
                {filter.label}
              </button>
            ))}
            <p className="text-[12px] text-text-dim" dir="auto">
              فیلترهای فعال:
            </p>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
      ) : posts.length === 0 ? (
        <Card tone="surface" noHover className="w-full items-center gap-2 p-10 text-center">
          <p className="text-[15px] text-text-dim" dir="auto">
            پستی با این فیلترها پیدا نشد — فیلترها رو تغییر بده یا خودت یه پست بساز.
          </p>
        </Card>
      ) : (
        <DashboardFadeIn
          ready={!loading}
          className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {posts.map((post) => {
            const PositionIcon = POSITION_ICON[post.position] ?? Swords;
            const joined = joinedIds.has(post.id);
            const fillPercent = Math.round((post.memberCount / post.partySize) * 100);

            return (
              <Card key={post.id} tone="surface" className="w-full gap-4 p-5">
                <div className="flex w-full items-center justify-between">
                  {post.sessionType === "NOW" ? (
                    <span className="rounded-[4px] bg-danger/15 px-2 py-0.5 text-[11px] font-black text-danger" dir="auto">
                      پخش زنده
                    </span>
                  ) : (
                    <span className="text-[12px] text-text-dim">{timeLabel(post)}</span>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-0.5">
                      <p className="text-[14px] font-black text-text" dir="auto">
                        {post.authorName}
                      </p>
                      <p className="text-[12px] text-accent" dir="auto">
                        {post.authorRank} {post.authorRankTier ?? ""}
                      </p>
                    </div>
                    <div
                      className={`rounded-full border-2 ${post.sessionType === "NOW" ? "border-danger" : "border-success"}`}
                    >
                      <HeroAvatar name={post.authorName} size={36} round />
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col items-end gap-2.5">
                  <PositionIcon size={22} className="text-accent" />
                  <p className="text-[14px] font-black text-text" dir="auto">
                    {post.position}
                  </p>
                  <p className="line-clamp-2 w-full text-right text-[13px] leading-[1.6] text-text-dim" dir="auto">
                    {post.description}
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                  <span className="rounded-[4px] bg-surface-alt px-2 py-0.5 text-[11px] text-text-dim" dir="auto">
                    {post.region}
                  </span>
                  <span className="rounded-[4px] bg-surface-alt px-2 py-0.5 text-[11px] text-text-dim">
                    {post.gameMode}
                  </span>
                  {post.hasVoice && (
                    <span className="flex items-center gap-1 rounded-[4px] bg-surface-alt px-2 py-0.5 text-[11px] text-text-dim">
                      <Volume2 size={10} />
                    </span>
                  )}
                  <span className="rounded-[4px] bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-accent" dir="auto">
                    پارتی: {post.memberCount}/{post.partySize}
                  </span>
                </div>

                <div className="h-1 w-full overflow-hidden rounded-full bg-surface-alt">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${fillPercent}%` }} />
                </div>

                <button
                  disabled={joined || joiningId === post.id}
                  onClick={() => handleJoin(post.id)}
                  className="flex w-full items-center justify-center rounded-[8px] border border-border bg-surface-alt px-4 py-2.5 text-[13px] font-bold text-text transition-colors hover:enabled:bg-white/5 disabled:opacity-60"
                  dir="auto"
                >
                  {joined ? "درخواست ارسال شد" : joiningId === post.id ? "در حال ارسال..." : "درخواست عضویت"}
                </button>
              </Card>
            );
          })}
        </DashboardFadeIn>
      )}

      <Pagination page={page} totalPages={pageCount} onChange={setPage} />
    </div>
  );
}
