"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ExternalLink, X } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MiniStat } from "@/components/pages/profile/profileStatTiles";
import { OPENDOTA_GAME_MODE_LABEL, faNumber, formatDuration, kdaRatio } from "@/components/pages/profile/profileFormat";
import type { DotaMatch } from "@/components/pages/profile/profileTypes";

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

interface MatchDetailDialogProps {
  userId: number;
  match: DotaMatch | null;
  onClose: () => void;
}

export function MatchDetailDialog({ userId, match, onClose }: MatchDetailDialogProps) {
  // Finished matches never change, so items fetched once stay valid for the page's lifetime.
  const [itemsCache, setItemsCache] = useState<Record<number, MatchItemsData | "error">>({});
  const cached = match ? itemsCache[match.matchId] : undefined;

  useEffect(() => {
    if (!match || itemsCache[match.matchId]) return;
    let cancelled = false;
    const matchId = match.matchId;
    fetch(`/api/users/${userId}/matches/${matchId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setItemsCache((prev) => ({ ...prev, [matchId]: json.status === "success" ? json.data : "error" }));
      })
      .catch(() => {
        if (!cancelled) setItemsCache((prev) => ({ ...prev, [matchId]: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, [match, userId, itemsCache]);

  const items = cached && cached !== "error" ? cached : null;

  return (
    <Dialog open={match !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden border-border bg-surface p-0 sm:max-w-md" dir="rtl" showCloseButton={false}>
        {match && (
          <>
            <div className="relative h-[180px] w-full overflow-hidden bg-surface-alt">
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0",
                  match.win
                    ? "bg-[radial-gradient(80%_100%_at_30%_100%,rgba(34,197,94,0.35),transparent_70%)]"
                    : "bg-[radial-gradient(80%_100%_at_30%_100%,rgba(255,107,87,0.32),transparent_70%)]",
                )}
              />
              {match.heroCrop ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={match.matchId}
                  ref={heroEntrance}
                  src={match.heroCrop}
                  alt=""
                  className="absolute bottom-0 left-2 h-[96%] w-auto max-w-none [mask-image:linear-gradient(to_top,transparent,black_25%)]"
                />
              ) : (
                match.heroImg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={match.heroImg} alt="" className="absolute inset-0 size-full object-cover object-top opacity-60" />
                )
              )}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-l from-surface/90 via-surface/30 via-35% to-transparent to-65%" />

              <DialogClose className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-bg/50 text-white backdrop-blur-sm transition-colors hover:bg-bg/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <X size={16} />
                <span className="sr-only">بستن</span>
              </DialogClose>

              <div className="absolute inset-y-0 right-0 flex flex-col justify-end gap-2 p-5">
                <span
                  className={cn(
                    "w-fit rounded-[6px] px-2.5 py-0.5 text-[11px] font-bold",
                    match.win ? "bg-success/15 text-success" : "bg-[#ff6b57]/15 text-[#ff6b57]",
                  )}
                >
                  {match.win ? "برد" : "باخت"}
                </span>
                <DialogTitle className="text-[22px] font-black text-white" dir="auto">
                  {match.heroName}
                </DialogTitle>
                <p className="text-[13px] font-bold text-text" dir="ltr">
                  {match.kills} / <span className="text-[#ff6b57]">{match.deaths}</span> / {match.assists}
                  <span className="ms-2 text-[11px] font-normal text-text-dim">KDA {kdaRatio(match.kills, match.deaths, match.assists).toFixed(1)}</span>
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-5 px-6 pb-6 pt-4">
              <DialogDescription className="w-full text-center text-[12px] text-text-dim">
                {new Date(match.startAt).toLocaleDateString("fa-IR")} · {formatDuration(match.duration)} ·{" "}
                {OPENDOTA_GAME_MODE_LABEL[match.gameMode] ?? "نامشخص"}
                {match.partySize && match.partySize > 1 ? ` · پارتی ${faNumber(match.partySize)} نفره` : ""}
              </DialogDescription>

              <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
                {match.lastHits !== null && <MiniStat value={match.lastHits} label="لست‌هیت" />}
                {match.goldPerMin !== null && <MiniStat value={match.goldPerMin} label="GPM" />}
                {match.xpPerMin !== null && <MiniStat value={match.xpPerMin} label="XPM" />}
                {match.heroDamage !== null && <MiniStat value={match.heroDamage} label="دمیج به هیرو" />}
              </div>

              <div className="flex w-full flex-col gap-2.5">
                <p className="text-[13px] font-bold text-text">آیتم‌های نهایی</p>
                {cached === undefined ? (
                  <div className="flex items-center gap-2" dir="ltr">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-12 rounded-[6px]" />
                    ))}
                  </div>
                ) : items && (items.items.length > 0 || items.neutralItem) ? (
                  <div key={match.matchId} ref={itemsEntrance} className="flex flex-wrap items-center gap-2" dir="ltr">
                    {items.items.map((item) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={item.id}
                        src={item.img}
                        alt={item.name}
                        title={item.name}
                        className="h-9 w-12 rounded-[6px] border border-border object-cover"
                      />
                    ))}
                    {items.neutralItem && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={items.neutralItem.img}
                        alt={items.neutralItem.name}
                        title={`${items.neutralItem.name} (نیوترال)`}
                        className="ms-1 size-9 rounded-full border border-accent/60 object-cover ring-2 ring-accent/25"
                      />
                    )}
                  </div>
                ) : (
                  <p className="w-full text-center text-[12px] text-text-dim">اطلاعات آیتم برای این مچ در دسترس نیست.</p>
                )}
              </div>

              <a
                href={`https://www.opendota.com/matches/${match.matchId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-border py-2.5 text-[12px] font-bold text-accent transition-colors hover:border-accent/40 hover:bg-accent/10"
              >
                <ExternalLink size={13} />
                مشاهده کامل مچ در OpenDota
              </a>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// The dialog body mounts inside Radix's portal a commit after `match` is set,
// so these run as callback refs — exactly when the element appears. React 19
// dev re-attaches refs on mount; a second gsap.from would read the hidden
// start state as its end state, so each element only ever enters once.
function shouldEnter(el: HTMLElement | null): el is HTMLElement {
  if (!el || el.dataset.entered) return false;
  el.dataset.entered = "true";
  return window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}

function heroEntrance(el: HTMLImageElement | null) {
  if (!shouldEnter(el)) return;
  gsap.from(el, { autoAlpha: 0, x: -48, duration: 0.9, ease: "expo.out", delay: 0.05 });
}

function itemsEntrance(el: HTMLDivElement | null) {
  if (!shouldEnter(el)) return;
  gsap.from(el.children, { autoAlpha: 0, y: 8, scale: 0.85, duration: 0.35, stagger: 0.045, ease: "back.out(1.8)" });
}
