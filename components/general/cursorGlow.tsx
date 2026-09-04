"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

/**
 * A very soft, blurred glow that drifts toward the cursor with a gentle
 * lag — ambient, not a cursor replacement. Same restrained visual language
 * as AmbientCorners (low opacity, heavy blur, primary/accent color), and
 * likewise skipped on /dashboard and /admin to keep those screens plain.
 */
export function CursorGlow() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDashboard || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const el = ref.current;
    const moveX = gsap.quickTo(el, "left", { duration: 0.4, ease: "power2.out" });
    const moveY = gsap.quickTo(el, "top", { duration: 0.4, ease: "power2.out" });

    function handleMove(e: MouseEvent) {
      moveX(e.clientX);
      moveY(e.clientY);
    }

    gsap.set(el, { left: window.innerWidth / 2, top: window.innerHeight / 2 });
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [isDashboard]);

  if (isDashboard) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed z-40 size-[40px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[20px]"
      style={{ background: "var(--color-accent)", opacity: 0.28, mixBlendMode: "screen" }}
    />
  );
}
