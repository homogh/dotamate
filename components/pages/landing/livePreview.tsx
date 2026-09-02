"use client";

import { useRef, type MouseEvent } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/general/card";
import { SectionHeading } from "@/components/general/sectionHeading";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const TAGS = [
  { label: "دیسکورد فعال", accent: false },
  { label: "ریجن: اروپا شرقی", accent: false },
  { label: "پوزیشن ۳ و ۵", accent: true },
];
const FILLED_SLOTS = 3;
const TOTAL_SLOTS = 4;

const SHADOW_RADIUS = 22;
const SHADOW_BLUR = "60px";
const SHADOW_COLOR = "rgba(75,80,230,0.5)";
const GROUND_SHADOW = "0px 34px 80px rgba(0,0,0,0.8)";

export function LivePreview() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // The signature moment on this page: the proof card that shows a real
      // party post arrives with more weight than a plain scroll fade, since
      // it's the one thing here that has to earn trust on sight.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(wrapRef.current, {
          autoAlpha: 0,
          y: 28,
          scale: 0.97,
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: {
            trigger: wrapRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        });

        // Ambient pulse on the "live now" dot — communicates the post is
        // actually live, not a static screenshot.
        gsap.to(dotRef.current, {
          scale: 1.6,
          autoAlpha: 0.35,
          duration: 1,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });

        // The card's own glow shadow orbits slowly around it — no extra
        // colored layer, just the existing shadow drifting in a circle.
        const proxy = { angle: 0 };
        gsap.to(proxy, {
          angle: 360,
          duration: 8,
          repeat: -1,
          ease: "none",
          onUpdate: () => {
            const rad = (proxy.angle * Math.PI) / 180;
            const x = (Math.cos(rad) * SHADOW_RADIUS).toFixed(1);
            const y = (Math.sin(rad) * SHADOW_RADIUS).toFixed(1);
            if (cardRef.current) {
              cardRef.current.style.boxShadow = `${x}px ${y}px ${SHADOW_BLUR} ${SHADOW_COLOR}, ${GROUND_SHADOW}`;
            }
          },
        });
      });

      return () => mm.revert();
    },
    { scope: wrapRef }
  );

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    cardRef.current?.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    cardRef.current?.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <section className="flex w-full flex-col items-start gap-14 bg-bg px-6 py-20 md:px-[100px]">
      <SectionHeading
        eyebrow="پست‌های زنده"
        title="نمونه پارتی‌های در حال تشکیل"
        subtitle="همین حالا ببین کیا دنبال هم‌تیمی هستن"
      />

      <div className="flex w-full flex-col items-center">
        <div ref={wrapRef} className="relative w-full max-w-[600px]">
          <Card
            ref={cardRef}
            highlighted
            noHover
            onMouseMove={handleMouseMove}
            className="group relative w-full gap-6 overflow-hidden transition-transform duration-300 hover:-translate-y-1"
          >
            {/* Mouse-tracking spotlight, only visible on hover */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[12px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(142,123,255,0.18), transparent 70%)",
              }}
            />

            <div className="relative flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs text-text-dim" dir="auto">
                  ۱۲ دقیقه پیش
                </p>
                <span className="relative flex size-2">
                  <span
                    ref={dotRef}
                    className="absolute inline-flex size-full rounded-full bg-success"
                  />
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-start gap-1">
                  <p className="text-base font-black text-text" dir="auto">
                    سینا (Arise)
                  </p>
                  <p className="text-xs font-bold text-accent" dir="auto">
                    رنک: Legend ۴
                  </p>
                </div>
                <Image
                  src="/images/landing/avatar-sina.png"
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              </div>
            </div>

            <p
              className="relative w-full text-right text-base leading-[1.6] text-text-dim"
              dir="auto"
            >
              دنبال یک هاردساپورت باسابقه و تانکی آف‌لین برای لابی رنکد رول اروپا
              می‌گردیم. تیم وویس دیسکورده، لطفاً پلیرهای جدی درخواست بدن.
            </p>

            <div className="relative flex w-full flex-wrap items-start justify-end gap-2">
              {TAGS.map((tag) => (
                <span
                  key={tag.label}
                  className={
                    tag.accent
                      ? "rounded-full border border-accent bg-primary/15 px-3 py-1.5 text-xs font-bold text-accent"
                      : "rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-bold text-text"
                  }
                  dir="auto"
                >
                  {tag.label}
                </span>
              ))}
            </div>

            <div className="relative flex w-full items-center justify-between border-t border-border pt-4">
              <Button size="sm">درخواست عضویت در پارتی</Button>
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold text-text" dir="auto">
                  {FILLED_SLOTS} از {TOTAL_SLOTS} نفر پر شده
                </p>
                <div className="flex items-start gap-1">
                  {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                    <span
                      key={i}
                      className={`size-2 rounded-[4px] ${
                        i < FILLED_SLOTS ? "bg-accent" : "bg-white/[0.08]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
