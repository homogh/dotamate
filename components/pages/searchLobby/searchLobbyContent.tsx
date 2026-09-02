"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { cn } from "@/app/lib/utils";
import { PageBanner } from "@/components/general/pageBanner";
import { Card } from "@/components/general/card";
import { Button } from "@/components/ui/button";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { Pagination } from "@/components/general/pagination";
import { REGION_OPTIONS, ROLE_OPTIONS, RANK_OPTIONS, getPagedLobbies } from "@/app/lib/lobbies";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[] | { label: string; value: string }[];
}) {
  const normalized = options.map((o) => (typeof o === "string" ? { label: o, value: o } : o));
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[8px] border border-border bg-surface-alt py-2 pe-3 ps-4 text-[13px] text-text outline-none transition-colors hover:border-white/20 focus-visible:border-primary"
      dir="auto"
    >
      {normalized.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SearchLobbyContent() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState(REGION_OPTIONS[0]);
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const [rank, setRank] = useState(RANK_OPTIONS[0]);
  const [voiceOnly, setVoiceOnly] = useState(false);
  const [page, setPage] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const { lobbies, totalPages } = getPagedLobbies(page, { query, region, role, rank, voiceOnly });

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
        gsap.set("[data-lobby-card]", { autoAlpha: 0, y: 20 });
        ScrollTrigger.batch("[data-lobby-card]", {
          start: "top 88%",
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power2.out" }),
        });
      });
      return () => mm.revert();
    },
    { scope: containerRef }
  );

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!resultsRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.fromTo(
      resultsRef.current,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" }
    );
  }, [query, region, role, rank, voiceOnly, page]);

  function resetToPageOne<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
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
              <Select value={rank} onChange={resetToPageOne(setRank)} options={RANK_OPTIONS} />
              <Select value={role} onChange={resetToPageOne(setRole)} options={ROLE_OPTIONS} />
              <Select value={region} onChange={resetToPageOne(setRegion)} options={REGION_OPTIONS} />
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
                  voiceOnly ? "bg-primary" : "bg-white/10"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
                    voiceOnly ? "translate-x-[-18px]" : "translate-x-[-2px]"
                  )}
                  style={{ insetInlineEnd: 0 }}
                />
              </button>
            </label>
          </div>

          <div ref={resultsRef} className="flex w-full flex-col gap-6">
            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
              {lobbies.map((lobby) => (
                <Card key={lobby.id} data-lobby-card className="gap-5">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[rgba(255,255,255,0.5)]">{lobby.postedAt}</p>
                      <span className="size-2 rounded-full bg-success" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-0.5">
                        <p className="text-[15px] font-black text-text" dir="auto">
                          {lobby.author}
                        </p>
                        <p className="text-xs font-bold text-accent" dir="auto">
                          رنک: {lobby.rank}
                        </p>
                      </div>
                      <HeroAvatar name={lobby.author} size={48} round />
                    </div>
                  </div>

                  <div className="flex w-full flex-col items-end gap-2">
                    <p className="text-sm font-black text-accent" dir="ltr">
                      {lobby.role}
                    </p>
                    <p className="w-full text-right text-[13px] leading-[1.6] text-text-dim" dir="auto">
                      {lobby.description}
                    </p>
                  </div>

                  <div className="flex w-full flex-wrap justify-end gap-1.5">
                    {lobby.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-[11px] text-[rgba(255,255,255,0.5)]"
                        dir="auto"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex w-full items-center justify-between border-t border-border pt-4">
                    <Button size="sm">درخواست عضویت در لابی</Button>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-extrabold text-text" dir="ltr">
                        {lobby.filled} از {lobby.total} نفر پر شده
                      </p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: lobby.total }).map((_, i) => (
                          <span
                            key={i}
                            className={`size-2 rounded-[4px] ${
                              i < lobby.filled ? "bg-accent" : "bg-white/[0.08]"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {lobbies.length === 0 && (
              <p className="w-full py-12 text-center text-sm text-text-dim">
                با این فیلترها لابی‌ای پیدا نشد. یه فیلتر رو بردار و دوباره امتحان کن.
              </p>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>

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
            <Link href="/login">ورود به حساب کاربری</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
