"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Volume2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/stores/useAuth";
import { PageBanner } from "@/components/general/pageBanner";
import { Card } from "@/components/general/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/general/userAvatar";
import { Pagination } from "@/components/general/pagination";
import { RANK_OPTIONS, REGION_OPTIONS } from "@/components/dashboard/postLabels";
import { POSITIONS, POSITION_LABEL } from "@/components/dashboard/positionMeta";

const REGION_FILTER_OPTIONS = [{ value: "", label: "همه ریجن‌ها" }, ...REGION_OPTIONS];
const RANK_FILTER_OPTIONS = [{ value: "", label: "همه رنک‌ها" }, ...RANK_OPTIONS];
const POSITION_FILTER_OPTIONS = [
  { value: "", label: "همه نقش‌ها (Pos 1-5)" },
  ...POSITIONS.map((p) => ({ value: p, label: POSITION_LABEL[p] })),
];

interface Lobby {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
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
  isSelf: boolean;
  myRequestStatus: "PENDING" | "ACCEPTED" | "DECLINED" | "REMOVED" | null;
}

function timeLabel(lobby: Lobby) {
  if (lobby.sessionType === "NOW") {
    const minutes = Math.floor((Date.now() - new Date(lobby.createdAt).getTime()) / 60000);
    return minutes < 1 ? "الان" : `${minutes} دقیقه پیش`;
  }
  if (lobby.startAt) {
    return new Date(lobby.startAt).toLocaleString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  }
  return "";
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[8px] border border-border bg-surface-alt py-2 pe-3 ps-4 text-[13px] text-text outline-none transition-colors hover:border-white/20 focus-visible:border-primary"
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

export function SearchLobbyContent() {
  const router = useRouter();
  const { user, status, fetchMe } = useAuth();

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [position, setPosition] = useState("");
  const [rank, setRank] = useState("");
  const [voiceOnly, setVoiceOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (status === "idle") fetchMe();
  }, [status, fetchMe]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (region) params.set("region", region);
    if (position) params.set("position", position);
    if (rank) params.set("rank", rank);
    if (voiceOnly) params.set("hasVoice", "1");
    params.set("page", String(page));

    return fetch(`/api/search-lobby?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setLobbies(json.data.posts);
          setTotalPages(json.data.pageCount);
        }
      })
      .finally(() => setLoading(false));
  }, [query, region, position, rank, voiceOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-filter-card]", {
          autoAlpha: 0,
          y: 16,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
        });
      });
      return () => mm.revert();
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
  }, [lobbies, loading]);

  function resetToPageOne<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  async function handleJoin(lobbyId: number) {
    if (status !== "authenticated") {
      router.push("/login?next=/search-lobby");
      return;
    }
    setJoiningId(lobbyId);
    try {
      const res = await fetch(`/api/posts/${lobbyId}/join`, { method: "POST" });
      const json = await res.json();
      if (json.status === "success") {
        setLobbies((prev) => prev.map((l) => (l.id === lobbyId ? { ...l, myRequestStatus: "PENDING" } : l)));
      }
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center">
      <PageBanner
        eyebrow="لابی‌های زنده و پارتی‌های آماده بازی"
        title="جستجوی لابی و هم‌تیمی"
        subtitle="لابی‌های فعال بازیکنان دوتا ۲ رو پیدا کن و درخواست عضویت بده. با استفاده از فیلترهای هوشمند رنک و پوزیشن، دقیقاً همون هم‌تیمی که نیاز داری رو پیدا کن."
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
              placeholder="جستجوی لابی، بازیکن یا شناسه..."
              className="flex-1 bg-transparent text-right text-base text-text placeholder:text-[rgba(255,255,255,0.5)] outline-none"
              dir="auto"
            />
            <Search size={20} className="shrink-0 text-text-dim" />
          </div>

          <div
            data-filter-card
            className="flex w-full flex-wrap items-center justify-between gap-4 rounded-[12px] border border-border bg-surface p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-text-dim">فیلترها:</span>
              <Select value={rank} onChange={resetToPageOne(setRank)} options={RANK_FILTER_OPTIONS} />
              <Select value={position} onChange={resetToPageOne(setPosition)} options={POSITION_FILTER_OPTIONS} />
              <Select value={region} onChange={resetToPageOne(setRegion)} options={REGION_FILTER_OPTIONS} />
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <span className="text-[13px] text-text-dim">صدا دارم (دیسکورد/وویس)</span>
              <button
                type="button"
                role="switch"
                aria-checked={voiceOnly}
                onClick={() => resetToPageOne(setVoiceOnly)(!voiceOnly)}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  voiceOnly ? "bg-primary" : "bg-white/10",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
                    voiceOnly ? "translate-x-[-18px]" : "translate-x-[-2px]",
                  )}
                  style={{ insetInlineEnd: 0 }}
                />
              </button>
            </label>
          </div>

          <div ref={resultsRef} className="flex w-full flex-col gap-6">
            {loading ? (
              <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
            ) : (
              <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
                {lobbies.map((lobby) => {
                  const joined = lobby.myRequestStatus !== null;
                  const full = lobby.memberCount >= lobby.partySize;

                  return (
                    <Card key={lobby.id} data-lobby-card className="gap-5">
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          {lobby.sessionType === "NOW" ? (
                            <span className="rounded-[4px] bg-danger/15 px-2 py-0.5 text-[11px] font-black text-danger" dir="auto">
                              پخش زنده
                            </span>
                          ) : (
                            <p className="text-xs text-[rgba(255,255,255,0.5)]">{timeLabel(lobby)}</p>
                          )}
                          <span className="size-2 rounded-full bg-success" />
                        </div>
                        <Link href={`/dashboard/profile/${lobby.authorId}`} className="flex items-center gap-3">
                          <div className="flex flex-col items-end gap-0.5">
                            <p className="text-[15px] font-black text-text" dir="auto">
                              {lobby.authorName}
                            </p>
                            <p className="text-xs font-bold text-accent" dir="auto">
                              رنک: {lobby.authorRank} {lobby.authorRankTier ?? ""}
                            </p>
                          </div>
                          <UserAvatar name={lobby.authorName} avatarUrl={lobby.authorAvatarUrl} size={48} round />
                        </Link>
                      </div>

                      <div className="flex w-full flex-col items-end gap-2">
                        <p className="text-sm font-black text-accent" dir="ltr">
                          {lobby.position}
                        </p>
                        <p className="w-full text-right text-[13px] leading-[1.6] text-text-dim" dir="auto">
                          {lobby.description}
                        </p>
                      </div>

                      <div className="flex w-full flex-wrap justify-end gap-1.5">
                        <span className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-[11px] text-[rgba(255,255,255,0.5)]" dir="auto">
                          {lobby.region}
                        </span>
                        <span className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-[11px] text-[rgba(255,255,255,0.5)]" dir="auto">
                          {lobby.gameMode}
                        </span>
                        {lobby.hasVoice && (
                          <span className="flex items-center gap-1 rounded-[4px] bg-surface-alt px-2.5 py-1 text-[11px] text-[rgba(255,255,255,0.5)]" dir="auto">
                            <Volume2 size={10} />
                            وویس
                          </span>
                        )}
                      </div>

                      <div className="flex w-full items-center justify-between border-t border-border pt-4">
                        {lobby.isSelf ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" disabled>
                              لابی خودته
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/profile/${lobby.authorId}`}>مشاهده پروفایل</Link>
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={joined || joiningId === lobby.id || full}
                            onClick={() => handleJoin(lobby.id)}
                          >
                            {full
                              ? "ظرفیت تکمیل"
                              : lobby.myRequestStatus === "ACCEPTED"
                                ? "عضو این لابی هستی"
                                : lobby.myRequestStatus === "PENDING"
                                  ? "درخواست ارسال شد"
                                  : lobby.myRequestStatus === "DECLINED"
                                    ? "درخواست رد شد"
                                    : joiningId === lobby.id
                                      ? "در حال ارسال..."
                                      : "درخواست عضویت در لابی"}
                          </Button>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-extrabold text-text" dir="ltr">
                            {lobby.memberCount} از {lobby.partySize} نفر پر شده
                          </p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: lobby.partySize }).map((_, i) => (
                              <span
                                key={i}
                                className={`size-2 rounded-[4px] ${
                                  i < lobby.memberCount ? "bg-accent" : "bg-white/[0.08]"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && lobbies.length === 0 && (
              <p className="w-full py-12 text-center text-sm text-text-dim">
                با این فیلترها لابی‌ای پیدا نشد. یه فیلتر رو بردار و دوباره امتحان کن.
              </p>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>

      {status !== "authenticated" && (
        <div
          className="flex w-full flex-col items-center gap-6 border-y border-border px-6 py-14 text-center md:px-[100px]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 640px 240px at 50% 30%, rgba(142,123,255,0.08) 0%, rgba(16,17,20,0) 70%), linear-gradient(90deg, #101114 0%, #101114 100%)",
          }}
        >
          <div className="flex w-full max-w-[720px] flex-col gap-4">
            <h2 className="w-full text-balance text-[26px] font-black text-text md:text-[32px]" dir="auto">
              می‌خوای لابی خودت رو بسازی؟
            </h2>
            <p className="w-full text-base leading-[1.7] text-text-dim" dir="auto">
              برای ایجاد لابی جدید، دسترسی کامل به چت و متصل کردن اکانت استیم جهت احراز هویت خودکار
              رنک، همین حالا به صورت کاملاً رایگان ثبت‌نام کنید.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild className="shadow-[0_0_15px_rgba(75,80,230,0.3)]">
              <Link href="/signup">ثبت‌نام رایگان و سریع</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login?next=/search-lobby">ورود به حساب کاربری</Link>
            </Button>
          </div>
        </div>
      )}
      {user && (
        <div className="flex w-full items-center justify-center py-10">
          <Button asChild>
            <Link href="/dashboard/create-post">ایجاد لابی جدید</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
