"use client";

import { useRef, type ReactNode } from "react";
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
}

/**
 * Shared banner template for top-level content pages (FAQ, blog, meta —
 * anything that isn't the landing page itself). Same atmospheric glow
 * recipe as the Hero/FinalCTA sections, so every page in the site opens on
 * the same visual language instead of a plain static heading.
 */
export function PageBanner({ eyebrow, title, subtitle, children }: PageBannerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        if (eyebrow) {
          tl.from("[data-banner-badge]", { autoAlpha: 0, y: 14, duration: 0.5 });
        }
        tl.from(
          "[data-banner-title]",
          { autoAlpha: 0, y: 18, duration: 0.6 },
          eyebrow ? "-=0.3" : undefined
        )
          .from("[data-banner-subtitle]", { autoAlpha: 0, y: 14, duration: 0.5 }, "-=0.35")
          .from("[data-banner-extra]", { autoAlpha: 0, y: 14, duration: 0.5 }, "-=0.3");
      });

      return () => mm.revert();
    },
    { scope: ref }
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
      {eyebrow && (
        <div data-banner-badge>
          <BadgePulse>{eyebrow}</BadgePulse>
        </div>
      )}

      <h1
        data-banner-title
        className="w-full text-balance text-[32px] font-black text-text md:text-[40px]"
        dir="auto"
      >
        {title}
      </h1>

      {subtitle && (
        <p
          data-banner-subtitle
          className="max-w-[600px] text-base leading-[1.7] text-text-dim"
          dir="auto"
        >
          {subtitle}
        </p>
      )}

      {children && <div data-banner-extra>{children}</div>}
    </div>
  );
}
