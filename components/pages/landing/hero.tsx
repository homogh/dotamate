"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";

gsap.registerPlugin(useGSAP);

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-hero-badge]", { autoAlpha: 0, y: 16, duration: 0.6 })
          .from(
            "[data-hero-title]",
            { autoAlpha: 0, y: 20, duration: 0.7 },
            "-=0.35"
          )
          .from(
            "[data-hero-desc]",
            { autoAlpha: 0, y: 16, duration: 0.6 },
            "-=0.4"
          )
          .from(
            "[data-hero-cta]",
            { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.1 },
            "-=0.35"
          );
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative flex w-full flex-col items-center gap-10 overflow-hidden px-6 py-20 md:px-[100px] md:py-[120px]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 720px 270px at 50% 50%, rgba(61,60,206,0.15) 0%, rgba(18,19,23,0) 80%), linear-gradient(90deg, #121317 0%, #121317 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <Image
          src="/images/landing/hero-atmosphere-bg.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="relative flex w-full max-w-[800px] flex-col items-center gap-5">
        <div
          data-hero-badge
          className="flex items-center gap-2 rounded-full border border-border bg-white/[0.06] px-4 py-1.5"
        >
          <p className="text-xs font-bold text-accent" dir="auto">
            پلتفرم تخصصی هماهنگی پارتی Dota 2
          </p>
          <span className="size-1.5 rounded-full bg-success" />
        </div>

        <h1
          data-hero-title
          className="text-center text-[36px] font-black leading-[1.2] text-text md:text-[56px]"
          dir="auto"
        >
          هم‌تیمی پیدا کن، رنک بزن!
        </h1>

        <p
          data-hero-desc
          className="text-center text-base leading-[1.8] text-text-dim md:text-[18px]"
          dir="auto"
        >
          از دست هم‌تیمی‌های سمی، نوب و بی‌خیال خسته شدی؟ با دوتامیت به صورت
          کاملاً رایگان بازیکنان باانگیزه و متناسب با رنک خودت رو پیدا کن، وارد
          پارتی شو و هماهنگ صعود کن.
        </p>
      </div>

      <div className="relative flex flex-wrap items-center justify-center gap-4">
        <div data-hero-cta>
          <Button asChild size="default">
            <Link href="/signup">ثبت‌نام رایگان و سریع</Link>
          </Button>
        </div>
        <div data-hero-cta>
          <Button asChild variant="outline" size="default">
            <Link href="/lobbies">مشاهده لیست بازیکنان آنلاین</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
