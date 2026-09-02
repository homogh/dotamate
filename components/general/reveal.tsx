"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { cn } from "@/app/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface RevealProps {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  duration?: number;
  ease?: string;
}

/**
 * Fades + rises a single block into view as it scrolls in. Skips motion for
 * prefers-reduced-motion. Keep this the quiet, supporting-tier default
 * (short duration, gentle ease) — reserve a slower/richer ease for the one
 * or two focal moments on a page, authored inline instead of here.
 */
export function Reveal({
  children,
  className,
  y = 16,
  delay = 0,
  duration = 0.5,
  ease = "power2.out",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, {
          autoAlpha: 0,
          y,
          duration,
          delay,
          ease,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
