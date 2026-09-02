"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { toPersianDigits } from "@/app/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface CountUpStatProps {
  target: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

/** Counts a stat up from zero as it scrolls into view, once, then holds. */
export function CountUpStat({ target, decimals = 0, suffix = "", className }: CountUpStatProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const proxy = { val: 0 };

      const render = () => {
        const formatted =
          decimals > 0
            ? proxy.val.toFixed(decimals)
            : Math.round(proxy.val).toLocaleString("en-US");
        el.textContent = toPersianDigits(formatted) + suffix;
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(proxy, {
          val: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: render,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        proxy.val = target;
        render();
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [target, decimals, suffix] }
  );

  return (
    <p ref={ref} className={className}>
      ۰
    </p>
  );
}
