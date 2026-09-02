"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Sticky signup pill + scroll-to-top, both hidden until the visitor has
 * scrolled past the hero — appears as a quiet, always-available action
 * instead of interrupting the first screen.
 */
export function FloatingCta() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(wrapRef.current, { autoAlpha: 0, y: 16 });

        ScrollTrigger.create({
          start: "top -560",
          onEnter: () =>
            gsap.to(wrapRef.current, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }),
          onLeaveBack: () =>
            gsap.to(wrapRef.current, { autoAlpha: 0, y: 16, duration: 0.25, ease: "power2.in" }),
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(wrapRef.current, { autoAlpha: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: wrapRef }
  );

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-6 end-6 z-40 flex flex-col items-center gap-3"
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="برو بالای صفحه"
        className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-text-dim shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-colors hover:text-text"
      >
        <ArrowUp size={18} />
      </button>

      <Button asChild size="sm" className="shadow-[0_0_24px_rgba(75,80,230,0.55)]">
        <Link href="/signup">ثبت‌نام رایگان</Link>
      </Button>
    </div>
  );
}
