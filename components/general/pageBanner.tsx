"use client";

import { useRef, type ReactNode } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { BadgePulse } from "@/components/general/badgePulse";

gsap.registerPlugin(useGSAP);

interface PageBannerProps {
  /** Omit for a plain title+subtitle hero (e.g. /contact has no eyebrow badge in its Figma). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Extra content under the subtitle, e.g. the patch-version tag on /meta. */
  children?: ReactNode;
  /** Optional page-specific key art, kept behind the shared banner content. */
  imageSrc?: string;
}

/**
 * Shared banner template for top-level content pages (FAQ, blog, meta —
 * anything that isn't the landing page itself). Same atmospheric glow
 * recipe as the Hero/FinalCTA sections, so every page in the site opens on
 * the same visual language instead of a plain static heading.
 */
export function PageBanner({ eyebrow, title, subtitle, children, imageSrc }: PageBannerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const targets = ["[data-banner-title]", "[data-banner-subtitle]", "[data-banner-extra]"].filter(
        (selector) => ref.current?.querySelector(selector)
      );
      if (eyebrow) targets.unshift("[data-banner-badge]");

      gsap.set(targets, { autoAlpha: 0, y: 14 });
      gsap.to(targets, {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
      });
    },
    { scope: ref, dependencies: [eyebrow, title, subtitle] }
  );

  return (
    <div
      ref={ref}
      className="relative flex w-full flex-col items-center gap-4 overflow-hidden px-6 py-16 text-center md:px-[100px] md:py-20"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 640px 240px at 50% 30%, rgba(61,60,206,0.18) 0%, rgba(18,19,23,0) 75%), linear-gradient(90deg, #121317 0%, #121317 100%)",
      }}
    >
      {imageSrc && (
        <>
          <Image src={imageSrc} alt="" fill sizes="100vw" preload className="pointer-events-none object-cover opacity-50" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/60 via-bg/35 to-bg" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/50 via-transparent to-bg/50" />
        </>
      )}
      {eyebrow && (
        <div data-banner-badge className="relative">
          <BadgePulse>{eyebrow}</BadgePulse>
        </div>
      )}

      <h1
        data-banner-title
        className="relative w-full text-balance text-[32px] font-black text-text md:text-[40px]"
        dir="auto"
      >
        {title}
      </h1>

      {subtitle && (
        <p
          data-banner-subtitle
          className="relative max-w-[600px] text-base leading-[1.7] text-text-dim"
          dir="auto"
        >
          {subtitle}
        </p>
      )}

      {children && <div data-banner-extra className="relative">{children}</div>}
    </div>
  );
}
