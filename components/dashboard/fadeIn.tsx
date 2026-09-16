"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { cn } from "@/app/lib/utils";

interface DashboardFadeInProps {
  children: ReactNode;
  className?: string;
  /** Gate the reveal until async data has arrived (e.g. !loading). */
  ready?: boolean;
  y?: number;
}

/**
 * Mount-triggered stagger for direct children — used instead of RevealGroup's
 * ScrollTrigger version because dashboard content lives inside its own
 * overflow-y-auto pane, not the window, so a scroll-bound trigger wouldn't
 * fire for anything below the fold.
 */
export function DashboardFadeIn({ children, className, ready = true, y = 16 }: DashboardFadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ready || !ref.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const children = gsap.utils.toArray(ref.current.children);
      gsap.set(children, { autoAlpha: 0, y });
      gsap.to(children, {
        autoAlpha: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.07,
        ease: "power2.out",
      });
    },
    { scope: ref, dependencies: [ready] },
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
