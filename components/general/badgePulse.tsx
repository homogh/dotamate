"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { cn } from "@/app/lib/utils";

gsap.registerPlugin(useGSAP);

interface BadgePulseProps {
  children: ReactNode;
  className?: string;
  /** Dot color role — success (live/active) is the default, accent for a quieter tone. */
  tone?: "success" | "accent";
}

/**
 * The small pill label with a pulsing dot, used as the eyebrow on the Hero
 * and the live-preview card. Extracted so any page banner can reuse the
 * same "this is live" signal instead of a plain static label.
 */
export function BadgePulse({ children, className, tone = "success" }: BadgePulseProps) {
  const dotRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(dotRef.current, {
          scale: 1.6,
          autoAlpha: 0.35,
          duration: 1,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      return () => mm.revert();
    },
    { scope: dotRef }
  );

  const dotColor = tone === "success" ? "bg-success" : "bg-accent";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.06] px-4 py-1.5",
        className
      )}
    >
      <p className="text-xs font-bold text-accent" dir="auto">
        {children}
      </p>
      <span className="relative flex size-1.5">
        <span ref={dotRef} className={cn("absolute inline-flex size-full rounded-full", dotColor)} />
        <span className={cn("relative inline-flex size-1.5 rounded-full", dotColor)} />
      </span>
    </div>
  );
}
