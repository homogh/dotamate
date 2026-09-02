"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { cn } from "@/app/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  y?: number;
}

/**
 * Staggers the direct children of the wrapper into view as the group scrolls
 * in — use only when those children genuinely read as a list (a card grid,
 * a row of stats), not as a blanket entrance for every section.
 */
export function RevealGroup({ children, className, y = 16 }: RevealGroupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(gsap.utils.toArray(ref.current!.children), {
          autoAlpha: 0,
          y,
          duration: 0.45,
          stagger: 0.08,
          ease: "power2.out",
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
