"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronDown, X } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { PageBanner } from "@/components/general/pageBanner";
import { Chip } from "@/components/general/chip";

gsap.registerPlugin(useGSAP);

const RANK_FILTERS = [
  { value: "all", label: "همه رنک‌ها" },
  { value: "herald", label: "Herald" },
  { value: "guardian", label: "Guardian" },
  { value: "crusader", label: "Crusader" },
  { value: "archon", label: "Archon" },
  { value: "legend", label: "Legend" },
  { value: "ancient", label: "Ancient" },
  { value: "divine", label: "Divine" },
  { value: "immortal", label: "Immortal" },
];

const POSITION_FILTERS = [
  { value: "all", label: "همه پزها" },
  { value: "pos1", label: "پز ۱" },
  { value: "pos2", label: "پز ۲" },
  { value: "pos3", label: "پز ۳" },
  { value: "pos4", label: "پز ۴" },
  { value: "pos5", label: "پز ۵" },
];

// OpenDota doesn't publish real lane/position data per hero (only these
// broad role tags), so this is a best-effort heuristic, not a measured
// stat — a hero can land in more than one bucket, same as in real games.
function heroPositions(roles: string[]): string[] {
  const positions: string[] = [];
  const has = (r: string) => roles.includes(r);

  if (has("Carry")) positions.push("pos1");
  if (has("Nuker") && !has("Support")) positions.push("pos2");
  if ((has("Initiator") || has("Durable")) && !has("Support")) positions.push("pos3");
  if (has("Support") && (has("Initiator") || has("Disabler"))) positions.push("pos4");
  if (has("Support") && !has("Initiator") && !has("Disabler")) positions.push("pos5");

  return positions;
}

type HeroTier = "S" | "A" | "B" | "C";
const TIER_STYLES: Record<HeroTier, { bg: string; border: string; text: string }> = {
  S: { bg: "bg-[rgba(255,69,58,0.13)]", border: "border-[#ff453a]", text: "text-[#ff453a]" },
  A: { bg: "bg-[rgba(255,159,10,0.13)]", border: "border-[#ff9f0a]", text: "text-[#ff9f0a]" },
  B: { bg: "bg-[rgba(48,209,88,0.13)]", border: "border-[#30d158]", text: "text-[#30d158]" },
  C: { bg: "bg-[rgba(142,142,147,0.13)]", border: "border-[#8e8e93]", text: "text-[#8e8e93]" },
};

function tierFor(rank: number, total: number): HeroTier {
  const pct = rank / Math.max(1, total);
  if (pct <= 0.1) return "S";
  if (pct <= 0.3) return "A";
  if (pct <= 0.7) return "B";
  return "C";
}

function winRateBarWidth(winRate: number) {
  const floor = 42;
  const ceiling = 60;
  const ratio = (winRate - floor) / (ceiling - floor);
  return Math.min(100, Math.max(8, ratio * 100));
}

interface Hero {
  id: number;
  name: string;
  img: string;
  icon: string;
  primaryAttr: string;
  attackType: string;
  roles: string[];
  picks: number;
  winRate: number;
  pickRate: number;
}

interface HeroDetail {
  id: number;
  name: string;
  img: string;
  primaryAttr: string;
  overallWinRate: number;
  byBracket: { bracket: string; picks: number; winRate: number }[];
  pro: { picks: number; wins: number; bans: number; winRate: number };
  itemBuild: { phase: string; items: { id: number; count: number; name: string; img: string; cost: number | null }[] }[];
}

function fillBars(scope: Element) {
  const bars = scope.querySelectorAll<HTMLElement>("[data-meta-bar]");
  gsap.to(bars, {
    width: (i, el) => `${el.dataset.target}%`,
    duration: 0.8,
    stagger: 0.03,
    ease: "power2.out",
  });
}

export function MetaContent() {
  const [rank, setRank] = useState("all");
  const [position, setPosition] = useState("all");
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(arrowRef.current, { y: 8, duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true });
      });
      return () => mm.revert();
    },
    { scope: containerRef },
  );

  // Driven by GSAP's own ticker rather than CSS `behavior: "smooth"` —
  // that's inconsistently supported in embedded/automated webviews, this
  // works identically everywhere since it just calls scrollTo every frame.
  function scrollForMore() {
    const proxy = { y: window.scrollY };
    gsap.to(proxy, {
      y: window.scrollY + window.innerHeight * 0.7,
      duration: 0.6,
      ease: "power2.inOut",
      onUpdate: () => window.scrollTo(0, proxy.y),
    });
  }

  // Adjusting state during render (not in the effect below) when `rank`
  // changes — React's documented pattern for resetting state in response
  // to a prop/dependency change without an extra effect-triggered render.
  const [prevRank, setPrevRank] = useState(rank);
  if (rank !== prevRank) {
    setPrevRank(rank);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    fetch(`/api/meta/heroes?rank=${rank}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setHeroes(json.data);
        else setError(json.message ?? "خطا در دریافت متا");
      })
      .catch(() => setError("ارتباط با سرویس آمار برقرار نشد."))
      .finally(() => setLoading(false));
  }, [rank]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-filter-card]", { autoAlpha: 0, y: 16, duration: 0.5, stagger: 0.1, ease: "power2.out" });
      });
      return () => mm.revert();
    },
    { scope: containerRef },
  );

  // A previous version scroll-triggered each card individually — with 70+
  // cards and async-loading hero images shifting the page's height after
  // the trigger positions were measured, cards past the first screenful
  // could get stuck invisible (looked like the list had simply ended).
  // A single one-time fade for the whole grid has no such failure mode:
  // every card is always in the DOM and visible, filters or not.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
    }
    if (!resultsRef.current || loading) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bars = resultsRef.current.querySelectorAll<HTMLElement>("[data-meta-bar]");

    if (reduceMotion) {
      gsap.set(bars, { width: (i, el) => `${(el as HTMLElement).dataset.target}%` });
      return;
    }

    gsap.set(bars, { width: 0 });
    gsap.fromTo(
      resultsRef.current,
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", onComplete: () => fillBars(resultsRef.current!) },
    );
  }, [heroes, position, loading]);

  const filteredHeroes = useMemo(
    () => (position === "all" ? heroes : heroes.filter((h) => heroPositions(h.roles).includes(position))),
    [heroes, position],
  );
  const total = filteredHeroes.length;

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center">
      <PageBanner
        eyebrow="متای زنده"
        title="متای پچ فعلی"
        subtitle="وین‌ریت و پیک‌ریت واقعی هیروها بر اساس آمار زنده‌ی OpenDota — نه دستچین‌شده، مستقیم از بازی‌های واقعی."
      />

      <div className="w-full px-6 py-14 md:px-[100px]">
        <div className="flex w-full flex-col gap-6">
          <div
            data-filter-card
            className="flex w-full flex-col gap-4 rounded-[12px] border border-border bg-surface p-6"
          >
            <div className="flex w-full items-center justify-between">
              <p className="text-[15px] font-black text-text">فیلتر بر اساس رنک</p>
              {total > 0 && <p className="text-xs text-[rgba(255,255,255,0.5)]">{total} هیرو</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {RANK_FILTERS.map((r) => (
                <Chip key={r.value} active={rank === r.value} onClick={() => setRank(r.value)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </div>

          <div
            data-filter-card
            className="flex w-full flex-col gap-4 rounded-[12px] border border-border bg-surface p-6"
          >
            <p className="text-[15px] font-black text-text">فیلتر بر اساس پز</p>
            <div className="flex flex-wrap gap-2">
              {POSITION_FILTERS.map((p) => (
                <Chip key={p.value} active={position === p.value} onClick={() => setPosition(p.value)}>
                  {p.label}
                </Chip>
              ))}
            </div>
            <p className="w-full text-right text-[11px] text-text-dim" dir="auto">
              پزها بر اساس نقش کلی هیرو تخمین زده می‌شن، نه دیتای مستقیم لین — یه هیرو می‌تونه چند پز داشته باشه.
            </p>
          </div>

          {!loading && !error && filteredHeroes.length > 0 && (
            <button
              ref={arrowRef}
              onClick={scrollForMore}
              aria-label="اسکرول برای دیدن بقیه‌ی هیروها"
              className="flex w-full items-center justify-center py-1 text-text-dim hover:text-text"
            >
              <ChevronDown size={26} />
            </button>
          )}

          {loading ? (
            <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری آمار زنده...</div>
          ) : error ? (
            <div className="flex h-40 w-full items-center justify-center text-sm text-danger">{error}</div>
          ) : heroes.length === 0 ? (
            <div className="flex h-40 w-full items-center justify-center text-center text-sm text-text-dim">
              والوو آمار این رنک رو عمومی منتشر نمی‌کنه — رنک دیگه‌ای رو امتحان کن.
            </div>
          ) : filteredHeroes.length === 0 ? (
            <div className="flex h-40 w-full items-center justify-center text-center text-sm text-text-dim">
              هیرویی با این پز پیدا نشد — یه فیلتر رو بردار.
            </div>
          ) : (
            <div ref={resultsRef} className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
              {filteredHeroes.map((hero, i) => {
                const tier = TIER_STYLES[tierFor(i, total)];
                const barTarget = winRateBarWidth(hero.winRate);
                return (
                  <button
                    key={hero.id}
                    data-meta-card
                    onClick={() => setSelectedId(hero.id)}
                    className="w-full rounded-[8px] border border-border bg-surface-alt p-3 text-right transition-colors hover:border-white/20"
                  >
                    <div className="flex w-full items-center gap-3">
                      <span
                        className={cn(
                          "flex shrink-0 items-center justify-center rounded-[4px] border px-2 py-0.5 text-xs font-black",
                          tier.bg,
                          tier.border,
                          tier.text,
                        )}
                      >
                        {tierFor(i, total)}
                      </span>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hero.img} alt={hero.name} className="h-10 w-[71px] shrink-0 rounded-[4px] object-cover" />

                      <div className="flex flex-1 flex-col items-end gap-1 overflow-hidden">
                        <p className="w-full truncate text-[13px] font-bold text-text" dir="ltr">
                          {hero.name}
                        </p>
                        <div className="flex w-full items-center gap-2">
                          <p className="w-9 shrink-0 text-xs font-bold tabular-nums text-success" dir="ltr">
                            {hero.winRate}%
                          </p>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              data-meta-bar
                              data-target={barTarget}
                              className="h-full rounded-full bg-success"
                              style={{ width: `${barTarget}%` }}
                            />
                          </div>
                          <p className="w-10 shrink-0 text-right text-xs tabular-nums text-[rgba(255,255,255,0.5)]" dir="ltr">
                            {hero.pickRate}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {hero.roles.length > 0 && (
                      <div className="mt-2 flex w-full flex-wrap justify-end gap-1">
                        {hero.roles.slice(0, 3).map((role) => (
                          <span key={role} className="rounded-[4px] bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-dim" dir="ltr">
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedId !== null && <HeroDetailModal heroId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function HeroDetailModal({ heroId, onClose }: { heroId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<HeroDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/meta/heroes/${heroId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setDetail(json.data);
      })
      .finally(() => setLoading(false));
  }, [heroId]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-y-auto rounded-[12px] border border-border bg-surface"
      >
        {loading || !detail ? (
          <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
        ) : (
          <>
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail.img} alt={detail.name} className="h-40 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
              <button
                onClick={onClose}
                className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="بستن"
              >
                <X size={16} />
              </button>
              <p className="absolute bottom-3 right-4 text-[20px] font-black text-white" dir="ltr">
                {detail.name}
              </p>
            </div>

            <div className="flex w-full flex-col gap-5 p-5">
              <div className="grid w-full grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1 rounded-[8px] bg-surface-alt p-3">
                  <p className="text-[18px] font-black text-success">{detail.overallWinRate}%</p>
                  <p className="text-[11px] text-text-dim" dir="auto">
                    وین‌ریت کلی
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-[8px] bg-surface-alt p-3">
                  <p className="text-[18px] font-black text-accent">{detail.pro.winRate}%</p>
                  <p className="text-[11px] text-text-dim" dir="auto">
                    وین‌ریت حرفه‌ای
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-[8px] bg-surface-alt p-3">
                  <p className="text-[18px] font-black text-text">{detail.pro.bans.toLocaleString("fa-IR")}</p>
                  <p className="text-[11px] text-text-dim" dir="auto">
                    بن حرفه‌ای
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2">
                <p className="w-full text-right text-[13px] font-bold text-text" dir="auto">
                  وین‌ریت به تفکیک رنک
                </p>
                <div className="flex w-full flex-col gap-1.5">
                  {detail.byBracket.map((b) => (
                    <div key={b.bracket} className="flex w-full items-center gap-2">
                      <p className="w-16 shrink-0 text-[11px] text-text-dim" dir="ltr">
                        {b.bracket}
                      </p>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.min(100, Math.max(4, winRateBarWidth(b.winRate)))}%` }}
                        />
                      </div>
                      <p className="w-10 shrink-0 text-[11px] font-bold text-text" dir="ltr">
                        {b.winRate}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3">
                <p className="w-full text-right text-[13px] font-bold text-text" dir="auto">
                  آیتم‌های محبوب (بر اساس مچ‌های واقعی)
                </p>
                {detail.itemBuild.map((phase) => (
                  <div key={phase.phase} className="flex w-full flex-col gap-2">
                    <p className="w-full text-right text-[11px] text-text-dim" dir="auto">
                      {phase.phase}
                    </p>
                    <div className="flex w-full flex-wrap justify-end gap-2">
                      {phase.items.length === 0 ? (
                        <p className="text-[11px] text-text-dim">دیتای کافی نیست</p>
                      ) : (
                        phase.items.map((item) => (
                          <div
                            key={item.id}
                            title={item.name}
                            className="flex flex-col items-center gap-1 rounded-[6px] border border-border bg-surface-alt p-1.5"
                          >
                            {item.img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.img} alt={item.name} className="h-8 w-11 rounded-[3px] object-cover" />
                            ) : (
                              <div className="h-8 w-11 rounded-[3px] bg-white/[0.06]" />
                            )}
                            <p className="text-[9px] text-text-dim">{item.count.toLocaleString("fa-IR")}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
