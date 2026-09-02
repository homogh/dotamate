"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { cn } from "@/app/lib/utils";
import { PageBanner } from "@/components/general/pageBanner";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { Chip } from "@/components/general/chip";
import {
  CURRENT_PATCH,
  META_UPDATED_AT,
  RANK_FILTERS,
  POSITION_FILTERS,
  META_ROLES,
  type HeroTier,
} from "@/app/lib/metaHeroes";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Win rates cluster tightly (roughly 49–55%), so a raw-percentage bar width
// makes every hero look barely-half-filled. Stretch that narrow band across
// the bar so the real differences between heroes are actually visible.
function winRateBarWidth(winRate: number) {
  const floor = 48;
  const ceiling = 56;
  const ratio = (winRate - floor) / (ceiling - floor);
  return Math.min(100, Math.max(8, ratio * 100));
}

const TIER_STYLES: Record<HeroTier, { bg: string; border: string; text: string }> = {
  S: { bg: "bg-[rgba(255,69,58,0.13)]", border: "border-[#ff453a]", text: "text-[#ff453a]" },
  A: { bg: "bg-[rgba(255,159,10,0.13)]", border: "border-[#ff9f0a]", text: "text-[#ff9f0a]" },
  B: { bg: "bg-[rgba(48,209,88,0.13)]", border: "border-[#30d158]", text: "text-[#30d158]" },
};

function FilterCard({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-filter-card
      className="flex w-full flex-col gap-4 rounded-[12px] border border-border bg-surface p-6"
    >
      <div className="flex w-full items-center justify-between">
        <p className="text-[15px] font-black text-text">{title}</p>
        {meta && <p className="text-xs text-[rgba(255,255,255,0.5)]">{meta}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** An S-tier row's frame — a thin red trace slowly orbits the border to mark it as the standout pick. */
function TierFrame({ tier, children }: { tier: HeroTier; children: React.ReactNode }) {
  if (tier !== "S") {
    return (
      <div className="w-full rounded-[8px] border border-border bg-surface-alt p-3 transition-colors hover:border-white/20">
        {children}
      </div>
    );
  }

  return (
    <div className="tier-s-beam w-full rounded-[8px]">
      <div className="w-full rounded-[8px] bg-surface-alt p-3">{children}</div>
    </div>
  );
}

function fillBars(scope: Element) {
  const bars = scope.querySelectorAll<HTMLElement>("[data-meta-bar]");
  gsap.to(bars, {
    width: (i, el) => `${el.dataset.target}%`,
    duration: 0.8,
    stagger: 0.05,
    ease: "power2.out",
  });
}

export function MetaContent() {
  const [rank, setRank] = useState(RANK_FILTERS[0]);
  const [position, setPosition] = useState("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const visibleRoles =
    position === "all" ? META_ROLES : META_ROLES.filter((r) => r.position === position);

  // Runs once on mount: the filter cards' entrance, and the initial
  // scroll-triggered, one-by-one reveal of the results list. Deliberately
  // has no dependency on the filter state — a filter change must never
  // replay this, only the small effect below should react to it.
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

        gsap.set("[data-meta-card]", { autoAlpha: 0, y: 20 });
        gsap.set("[data-meta-bar]", { width: 0 });

        ScrollTrigger.batch("[data-meta-card]", {
          start: "top 85%",
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              stagger: 0.15,
              ease: "power2.out",
              onComplete: () => batch.forEach((card) => fillBars(card)),
            });
          },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-meta-bar]", { width: (i, el) => `${(el as HTMLElement).dataset.target}%` });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  // Runs only when the position filter changes (skips the initial mount,
  // which the effect above already handles) — animates just the results
  // list back in, leaving the filter cards and the rest of the page alone.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!resultsRef.current) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bars = resultsRef.current.querySelectorAll<HTMLElement>("[data-meta-bar]");

    if (reduceMotion) {
      gsap.set(bars, { width: (i, el) => `${el.dataset.target}%` });
      return;
    }

    gsap.set(bars, { width: 0 });
    gsap.fromTo(
      resultsRef.current,
      { autoAlpha: 0, y: 10 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => fillBars(resultsRef.current!),
      }
    );
  }, [position]);

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center">
      <PageBanner
        eyebrow="متای زنده"
        title="متای پچ فعلی"
        subtitle={`پچ: ${CURRENT_PATCH} • به‌روزشده: ${META_UPDATED_AT} • رنکد رول • بر اساس بازی‌های Legend به بالا`}
      />

      <div className="w-full px-6 py-14 md:px-[100px]">
        <div className="flex w-full flex-col gap-6">
          <FilterCard title="فیلتر بر اساس رنک" meta={`رنک فعلی: ${rank}`}>
            {RANK_FILTERS.map((r) => (
              <Chip key={r} active={rank === r} onClick={() => setRank(r)}>
                {r}
              </Chip>
            ))}
          </FilterCard>

          <FilterCard title="فیلتر بر اساس پوزیشن">
            {POSITION_FILTERS.map((p) => (
              <Chip key={p.value} active={position === p.value} onClick={() => setPosition(p.value)}>
                {p.label}
              </Chip>
            ))}
          </FilterCard>

          <div ref={resultsRef} className="flex w-full flex-col gap-6">
            {visibleRoles.map((role) => (
              <div
                key={role.position}
                data-meta-card
                className="flex w-full flex-col gap-4 rounded-[12px] border border-border bg-surface p-6"
              >
                <div className="flex w-full items-center justify-between">
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">Win / Pick</p>
                  <p className="text-[15px] font-black text-text" dir="auto">
                    {role.position}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {role.heroes.map((hero, i) => {
                    const tier = TIER_STYLES[hero.tier];
                    const barTarget = winRateBarWidth(hero.winRate);
                    return (
                      <TierFrame key={hero.name} tier={hero.tier}>
                        <div className="flex w-full items-center gap-4">
                          <span
                            className={cn(
                              "flex shrink-0 items-center justify-center rounded-[4px] border px-2 py-0.5 text-xs font-black",
                              tier.bg,
                              tier.border,
                              tier.text
                            )}
                          >
                            {hero.tier}
                          </span>

                          <div className="flex flex-1 items-center gap-3">
                            <p
                              className="w-[46px] shrink-0 text-right text-xs tabular-nums text-[rgba(255,255,255,0.5)]"
                              dir="ltr"
                            >
                              {hero.pickRate}%
                            </p>
                            <div className="flex flex-1 items-center gap-2">
                              <p className="w-10 shrink-0 text-xs font-bold tabular-nums text-success" dir="ltr">
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
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <p className="text-[13px] font-bold text-text" dir="ltr">
                              {hero.name}
                            </p>
                            <HeroAvatar name={hero.name} />
                          </div>

                          <p className="w-3 shrink-0 text-xs tabular-nums text-[rgba(255,255,255,0.5)]">
                            {i + 1}
                          </p>
                        </div>
                      </TierFrame>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
