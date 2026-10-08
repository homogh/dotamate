"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { RefreshCw, Timer } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { Card } from "@/components/general/card";
import {
  OPENDOTA_GAME_MODE_LABEL,
  faNumber,
  formatDuration,
  kdaRatio,
  timeAgo,
} from "@/components/pages/profile/profileFormat";
import type { DotaMatch, DotaStats } from "@/components/pages/profile/profileTypes";

gsap.registerPlugin(useGSAP);

interface RecentMatchesCardProps {
  stats: DotaStats;
  syncing: boolean;
  onRefresh: () => void;
  onSelect: (match: DotaMatch) => void;
}

export function RecentMatchesCard({ stats, syncing, onRefresh, onSelect }: RecentMatchesCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [knownIds, setKnownIds] = useState(() => stats.matches.map((m) => m.matchId));
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  const [now, setNow] = useState(() => Date.now());

  // Matches that weren't on screen before a sync get a "new" marker and their
  // own entrance. Worked out during render so they never flash in unstyled.
  const ids = stats.matches.map((m) => m.matchId);
  if (ids.join(",") !== knownIds.join(",")) {
    const added = ids.filter((id) => !knownIds.includes(id));
    setKnownIds(ids);
    if (added.length > 0) setFreshIds(new Set(added));
  }

  // Keeps "updated 3 minutes ago" honest while the page stays open.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(ref);
        if (freshIds.size === 0) {
          gsap.from(q("[data-anim=form]"), {
            scaleY: 0,
            transformOrigin: "bottom",
            duration: 0.5,
            stagger: 0.04,
            ease: "back.out(2)",
            delay: 0.2,
          });
          gsap.from(q("[data-anim=row]"), { autoAlpha: 0, y: 14, duration: 0.45, stagger: 0.05, ease: "power2.out", delay: 0.15 });
          return;
        }
        gsap.from(q("[data-fresh=true]"), { autoAlpha: 0, x: 40, duration: 0.7, stagger: 0.08, ease: "expo.out" });
        gsap.fromTo(
          q("[data-fresh=true] > button"),
          { boxShadow: "0 0 0 1px rgba(142,123,255,0.9), 0 0 32px rgba(142,123,255,0.45)" },
          { boxShadow: "0 0 0 1px rgba(142,123,255,0.25), 0 0 0px rgba(142,123,255,0)", duration: 2.2, ease: "power2.out", delay: 0.3 },
        );
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [freshIds] },
  );

  const formMatches = [...stats.matches].reverse();
  const recentWins = stats.matches.filter((m) => m.win).length;

  return (
    <Card ref={ref} tone="surface" noHover className="@container w-full gap-5 p-6">
      <div className="flex w-full flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[16px] font-black text-text">مچ‌های اخیر</h2>
          <p className="text-[12px] text-text-dim">
            {faNumber(stats.wins)} برد / {faNumber(stats.losses)} باخت در کل · {faNumber(stats.winRate)}٪ وین
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-dim" aria-live="polite">
            {syncing
              ? "در حال گرفتن مچ‌های جدید…"
              : stats.lastSyncedAt
                ? `به‌روزرسانی ${timeAgo(stats.lastSyncedAt, now)}`
                : null}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={syncing}
            title="به‌روزرسانی مچ‌ها"
            aria-label="به‌روزرسانی مچ‌ها"
            className="flex size-9 items-center justify-center rounded-[10px] border border-border bg-surface-alt text-text-dim transition-[color,border-color,transform] duration-200 hover:border-accent/40 hover:text-accent active:scale-90 disabled:cursor-wait"
          >
            <RefreshCw size={15} className={cn(syncing && "animate-spin text-accent")} />
          </button>
        </div>
      </div>

      {stats.matches.length === 0 ? (
        <div className="flex w-full flex-col items-center gap-2 rounded-[12px] border border-dashed border-border px-6 py-10 text-center">
          <p className="text-[14px] font-bold text-text">مچی برای نمایش پیدا نشد.</p>
          <p className="max-w-[420px] text-[12px] leading-[1.8] text-text-dim">
            اگه تازه بازی کردی چند دقیقه بعد دکمه‌ی به‌روزرسانی رو بزن. گزینه‌ی «Expose Public Match Data» توی تنظیمات دوتا هم باید روشن باشه.
          </p>
        </div>
      ) : (
        <>
          <div className="flex w-full items-end justify-between gap-4 rounded-[12px] bg-surface-alt/60 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-text-dim">فرم اخیر</span>
              <span className="text-[14px] font-black text-text">
                {faNumber(recentWins)} برد از {faNumber(stats.matches.length)}
              </span>
            </div>
            <div className="flex h-7 items-end gap-1" dir="ltr" aria-hidden>
              {formMatches.map((m) => (
                <span
                  key={m.matchId}
                  data-anim="form"
                  title={`${m.heroName} · ${m.win ? "برد" : "باخت"}`}
                  className={cn("w-2.5 rounded-[3px]", m.win ? "h-7 bg-success/80" : "h-4 bg-[#ff6b57]/70")}
                />
              ))}
            </div>
          </div>

          <ul className="flex w-full flex-col gap-2">
            {stats.matches.map((m) => (
              // GSAP moves the <li>; the button keeps its own CSS hover transition.
              <li key={m.matchId} data-anim="row" data-fresh={freshIds.has(m.matchId)}>
                <MatchRow match={m} fresh={freshIds.has(m.matchId)} now={now} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function MatchRow({ match: m, fresh, now, onSelect }: { match: DotaMatch; fresh: boolean; now: number; onSelect: (match: DotaMatch) => void }) {
  const kda = kdaRatio(m.kills, m.deaths, m.assists);

  return (
    <button
      type="button"
      onClick={() => onSelect(m)}
      className={cn(
        "group relative flex w-full items-center gap-3 overflow-hidden rounded-[10px] border border-transparent bg-surface-alt py-2.5 pe-3 ps-4 text-start outline-none transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/10 hover:bg-[#23252d] focus-visible:border-accent/50 @lg:gap-4",
        fresh && "border-accent/30",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-2 start-0 w-[3px] rounded-full", m.win ? "bg-success" : "bg-danger")} />

      <div className="relative h-10 w-[70px] shrink-0 overflow-hidden rounded-[6px] bg-surface">
        {m.heroImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.heroImg}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-bold text-text" dir="auto">
            {m.heroName}
          </span>
          {fresh && <span className="shrink-0 rounded-full bg-accent/20 px-2 py-px text-[10px] font-bold text-accent">جدید</span>}
        </div>
        <span className="truncate text-[11px] text-text-dim">
          {OPENDOTA_GAME_MODE_LABEL[m.gameMode] ?? "مود دیگه"} · {timeAgo(m.startAt, now)}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <span className="text-[13px] font-bold text-text" dir="ltr">
          {m.kills}
          <span className="text-text-dim"> / </span>
          <span className="text-[#ff6b57]">{m.deaths}</span>
          <span className="text-text-dim"> / </span>
          {m.assists}
        </span>
        <span className="text-[10px] text-text-dim" dir="ltr">
          KDA {kda.toFixed(1)}
        </span>
      </div>

      <div className="hidden w-[72px] shrink-0 flex-col items-center gap-0.5 text-[11px] text-text-dim @xl:flex" dir="ltr">
        {m.goldPerMin !== null && <span>{m.goldPerMin} GPM</span>}
        {m.xpPerMin !== null && <span>{m.xpPerMin} XPM</span>}
      </div>

      <span className="hidden w-[58px] shrink-0 items-center justify-center gap-1 text-[12px] text-text-dim @lg:flex">
        <Timer size={12} />
        {formatDuration(m.duration)}
      </span>

      <span
        className={cn(
          "w-[46px] shrink-0 rounded-[6px] py-1 text-center text-[11px] font-bold",
          m.win ? "bg-success/12 text-success" : "bg-danger/15 text-[#ff6b57]",
        )}
      >
        {m.win ? "برد" : "باخت"}
      </span>
    </button>
  );
}
