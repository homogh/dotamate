"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Two very soft, blurred glows anchored to opposite corners of the
 * viewport — a quiet ambient signature behind every page, not a focal
 * effect. Fixed + pointer-events-none so it never competes with content.
 */
export function AmbientCorners() {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(topRef.current, {
        opacity: 0.32,
        scale: 1.08,
        duration: 7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      gsap.to(bottomRef.current, {
        opacity: 0.28,
        scale: 1.1,
        duration: 9,
        delay: 1.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    });

    return () => mm.revert();
  }, {});

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        ref={topRef}
        className="absolute -top-24 -end-24 size-[280px] rounded-full opacity-[0.14] blur-[100px]"
        style={{ background: "var(--color-primary)" }}
      />
      <div
        ref={bottomRef}
        className="absolute -bottom-28 -start-24 size-[280px] rounded-full opacity-[0.12] blur-[100px]"
        style={{ background: "var(--color-accent)" }}
      />
    </div>
  );
}
