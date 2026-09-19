"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";
import { BadgePulse } from "@/components/general/badgePulse";

gsap.registerPlugin(useGSAP);

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.set(
        ["[data-hero-badge]", "[data-hero-title]", "[data-hero-desc]", "[data-hero-cta]"],
        { autoAlpha: 0, y: 16 }
      );
      gsap.set("[data-hero-title]", { y: 20 });

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .to("[data-hero-badge]", { autoAlpha: 1, y: 0, duration: 0.6 })
        .to(
          "[data-hero-title]",
          { autoAlpha: 1, y: 0, duration: 0.7 },
          "-=0.35"
        )
        .to(
          "[data-hero-desc]",
          { autoAlpha: 1, y: 0, duration: 0.6 },
          "-=0.4"
        )
        .to(
          "[data-hero-cta]",
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 },
          "-=0.35"
        );
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative flex min-h-[620px] w-full flex-col items-center justify-center gap-10 overflow-hidden px-6 py-24 md:px-[100px] md:py-[150px]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 720px 330px at 50% 48%, rgba(61,60,206,0.32) 0%, rgba(18,19,23,0) 75%), linear-gradient(90deg, #121317 0%, rgba(18,19,23,0.72) 46%, rgba(18,19,23,0.15) 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <Image
          src="/images/landing/dota-party-hero-v2.png"
          alt=""
          fill
          className="object-cover object-[68%_center]"
          sizes="100vw"
          preload
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/45 via-transparent to-bg" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg via-bg/30 to-transparent" />

      <div className="relative flex w-full max-w-[800px] flex-col items-center gap-5 rounded-3xl border border-white/[0.12] bg-bg/45 px-5 py-6 shadow-[0_18px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl md:px-10 md:py-8">
        <div data-hero-badge>
          <BadgePulse>پلتفرم تخصصی هماهنگی پارتی Dota 2</BadgePulse>
        </div>

        <h1
          data-hero-title
          className="text-balance text-center text-[36px] font-black leading-[1.2] text-text md:text-[56px]"
          dir="auto"
        >
          هم‌تیمی دوتادو پیدا کن، رنک بزن!
        </h1>

        <p
          data-hero-desc
          className="text-center text-base leading-[1.8] text-text-dim md:text-[18px]"
          dir="auto"
        >
          از دست هم‌تیمی‌های سمی، نوب و بی‌خیال خسته شدی؟ با دوتا و دوتا
          (دوتامیت) به صورت کاملاً رایگان بازیکنان باانگیزه و متناسب با رنک
          خودت رو پیدا کن، وارد پارتی شو و هماهنگ صعود کن.
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
            <Link href="/search-lobby">مشاهده لیست بازیکنان آنلاین</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
